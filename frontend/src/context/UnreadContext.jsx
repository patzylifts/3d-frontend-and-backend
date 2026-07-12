import { createContext, useContext, useEffect, useState } from "react";
import { authFetch, getAccessToken } from "../utils/auth";

const UnreadContext = createContext();

export function UnreadProvider({ children }) {
    const [unreadMessages, setUnreadMessages] = useState(0);

    const fetchUnread = async () => {
        if (!getAccessToken()) {
            setUnreadMessages(0);
            return;
        }

        try {
            const res = await authFetch(
                `${import.meta.env.VITE_DJANGO_BASE_URL}/api/chat/unread/`
            );

            if (!res.ok) return;

            const data = await res.json();
            setUnreadMessages(data.total_unread);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUnread();

        const interval = setInterval(fetchUnread, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <UnreadContext.Provider
            value={{
                unreadMessages,
                setUnreadMessages,
                fetchUnread,
            }}
        >
            {children}
        </UnreadContext.Provider>
    );
}

export function useUnread() {
    return useContext(UnreadContext);
}