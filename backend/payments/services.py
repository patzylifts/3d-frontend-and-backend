# payments/services.py
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class PaymentGatewayError(Exception):
    pass

class PaymentAlreadyCompletedError(PaymentGatewayError):
    pass

def _mark_payment_expired(payment):
    payment.status = "expired"
    payment.checkout_url = None

    payment.save(
        update_fields=[
            "status",
            "checkout_url",
            "updated_at",
        ]
    )

def expire_checkout_session(payment):
    """
    Safely expire an unpaid PayMongo Checkout Session.

    This is used when an order is cancelled or rejected so an
    old Checkout Session cannot still be paid afterwards.
    """

    if payment.status != "pending":
        return

    # A local Payment may exist even if PayMongo session creation
    # failed before a Checkout Session ID was saved.
    if not payment.transaction_id:
        _mark_payment_expired(payment)
        return

    checkout_id = payment.transaction_id

    checkout_url = (
        "https://api.paymongo.com/v1/"
        f"checkout_sessions/{checkout_id}"
    )

    try:
        response = requests.get(
            checkout_url,
            auth=(
                settings.PAYMONGO_SECRET_KEY,
                "",
            ),
            timeout=10,
        )

    except requests.RequestException as exc:
        logger.exception(
            "Unable to retrieve PayMongo Checkout Session %s",
            checkout_id,
        )

        raise PaymentGatewayError(
            "Unable to verify the current payment checkout."
        ) from exc

    # If PayMongo no longer knows about the Checkout Session,
    # there is nothing remote left for the customer to pay.
    if response.status_code == 404:
        _mark_payment_expired(payment)
        return

    if not response.ok:
        logger.error(
            "Unable to retrieve PayMongo Checkout Session %s: %s",
            checkout_id,
            response.text,
        )

        raise PaymentGatewayError(
            "Unable to verify the current payment checkout."
        )

    try:
        data = response.json()
        attributes = data["data"]["attributes"]

    except (ValueError, KeyError, TypeError) as exc:
        logger.exception(
            "Unexpected PayMongo Checkout Session response."
        )

        raise PaymentGatewayError(
            "Unexpected response from the payment provider."
        ) from exc

    remote_payments = attributes.get("payments") or []

    already_paid = any(
        item.get("attributes", {}).get("status") == "paid"
        for item in remote_payments
    )

    if already_paid:
        raise PaymentAlreadyCompletedError(
            "This checkout has already been paid."
        )

    remote_status = attributes.get("status")

    if remote_status == "expired":
        _mark_payment_expired(payment)
        return

    if remote_status != "active":
        logger.error(
            "Unexpected Checkout Session status %s for %s",
            remote_status,
            checkout_id,
        )

        raise PaymentGatewayError(
            "The payment checkout is in an unexpected state."
        )

    try:
        expire_response = requests.post(
        (
            "https://api.paymongo.com/v1/"
            f"checkout_sessions/{checkout_id}/expire"
        ),
        auth=(
            settings.PAYMONGO_SECRET_KEY,
            "",
        ),
        timeout=10,
        )

    except requests.RequestException as exc:
        logger.exception(
            "Unable to expire PayMongo Checkout Session %s",
            checkout_id,
        )

        raise PaymentGatewayError(
            "Unable to safely close the payment checkout."
        ) from exc

    if not expire_response.ok:
        logger.error(
            "PayMongo failed to expire Checkout Session %s: %s",
            checkout_id,
            expire_response.text,
        )

        raise PaymentGatewayError(
            "Unable to safely close the payment checkout."
        )

    _mark_payment_expired(payment)

def expire_pending_checkout_sessions(order):
    """
    Expire every pending checkout belonging to the order.

    Usually there should only be one because checkout creation
    already prevents duplicate pending sessions.
    """

    pending_payments = order.payments.filter(
        status="pending"
    ).order_by("created_at")

    for payment in pending_payments:
        expire_checkout_session(payment)