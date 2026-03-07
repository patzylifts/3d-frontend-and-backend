import { createContext, useContext, useState } from "react";
import { authFetch } from "../utils/auth";

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [orders, setOrders] = useState([]);
    const [orderDetail, setOrderDetail] = useState(null);

    // Place Order
    const placeOrder = async (data) => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/place/`, {
                method: "POST",
                body: JSON.stringify(data),
            });
            const result = await res.json();
            return result;
        } catch (err) {
            console.error("Error placing order:", err);
            return { error: err.message };
        }
    };

    // Fetch Order History
    const fetchOrders = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/history/`);
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            console.error("Error fetching orders:", err);
        }
    };

    // Fetch Order Detail
    const fetchOrderDetail = async (orderId) => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/${orderId}/`);
            const data = await res.json();
            setOrderDetail(data);
        } catch (err) {
            console.error("Error fetching order detail:", err);
        }
    };

    return (
        <OrderContext.Provider value={{
            orders,
            orderDetail,
            placeOrder,
            fetchOrders,
            fetchOrderDetail
        }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => useContext(OrderContext);