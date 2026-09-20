# store/address_utils.py
ADDRESS_FIELDS = (
    "street",
    "region",
    "region_code",
    "province",
    "province_code",
    "city",
    "city_code",
    "barangay",
    "barangay_code",
    "postal_code",
)

def clean_address_value(value):
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()

    return value or None

def resolve_address(data=None, profile=None):
    data = data or {}
    address = {}

    for field in ADDRESS_FIELDS:
        value = clean_address_value(data.get(field))

        if value is None and profile is not None:
            value = clean_address_value(getattr(profile, field, None))

        address[field] = value

    return address