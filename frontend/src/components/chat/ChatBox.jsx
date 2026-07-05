// src/components/chat/ChatBox.jsx
import { useEffect, useRef, useState } from "react";
import { authFetch, getAccessToken } from "../../utils/auth";

export default function ChatBox({ orderId, isAdmin }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const WSURL = BASEURL
        .replace("http://", "ws://")
        .replace("https://", "wss://");
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const socket = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        loadConversation();
        connectSocket();

        return () => {

            if (socket.current) {
                socket.current.close();
            }

        };

    }, [orderId]);

    const firstLoad = useRef(true);

    useEffect(() => {
        if (firstLoad.current) {
            firstLoad.current = false;
            return;
        }

        bottomRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages]);

    async function loadConversation() {
        const res = await authFetch(
            `${BASEURL}/api/chat/orders/${orderId}/`
        );
        const data = await res.json();

        setMessages(data.messages);

        await authFetch(
            `${BASEURL}/api/chat/orders/${orderId}/read/`,
            {
                method: "POST"
            }
        );
    }

    function connectSocket() {
        const token = getAccessToken();

        socket.current = new WebSocket(
            `${WSURL}/ws/chat/orders/${orderId}/?token=${token}`
        );

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            setMessages(prev => [
                ...prev,
                {
                    id: data.id,
                    sender_type: data.sender_type,
                    content: data.message,
                    created_at: data.created_at
                }
            ]);
        };
    }

    function sendMessage() {
        if (!message.trim()) return;

        socket.current.send(
            JSON.stringify({
                message,
                sender: isAdmin ? "admin" : "customer"
            })
        );
        setMessage("");
    }

    return (
        <div className="border rounded-xl p-4 bg-white">
            <div className="h-80 overflow-y-auto space-y-2">
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={
                            msg.sender_type === (isAdmin ? "admin" : "customer")
                                ? "text-right"
                                : "text-left"
                        }
                    >
                        <div
                            className={`inline-block px-3 py-2 rounded-lg max-w-[80%] break-words ${msg.sender_type === (isAdmin ? "admin" : "customer")
                                    ? "bg-orange-500 text-white"
                                    : "bg-stone-100 text-stone-800"
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>

                ))}
                <div ref={bottomRef}></div>
            </div>

            <div className="flex gap-2 mt-4">
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            sendMessage();
                        }
                    }}
                    className="flex-1 border rounded-lg px-3 py-2"
                />

                <button
                    onClick={sendMessage}
                    className="px-4 rounded-lg bg-orange-500 text-white"
                >
                    Send
                </button>
            </div>
        </div>
    );
}