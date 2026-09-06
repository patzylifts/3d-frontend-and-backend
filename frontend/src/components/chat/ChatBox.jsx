// src/components/chat/ChatBox.jsx
import { useEffect, useRef, useState } from "react";
import { authFetch, getAccessToken } from "../../utils/auth";
import QuotationCard from "./QuotationCard";
import { useUnread } from "../../context/UnreadContext";

export default function ChatBox({
    orderId,
    isAdmin,
    quotations = [],
    onQuotationAccepted,
    onRefreshOrder,
}) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const WSURL = BASEURL
        .replace("http://", "ws://")
        .replace("https://", "wss://");
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const socket = useRef(null);
    const bottomRef = useRef(null);
    const { fetchUnread } = useUnread();
    const currentQuotation = quotations.length
        ? quotations[quotations.length - 1]
        : null;

    const previousQuotation = quotations.length > 1
        ? quotations[quotations.length - 2]
        : null;

    useEffect(() => {
        loadConversation();

        const ws = connectSocket();

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.addEventListener(
                    "open",
                    () => ws.close(),
                    { once: true }
                );
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

    async function markConversationRead() {
        await authFetch(
            `${BASEURL}/api/chat/orders/${orderId}/read/`,
            {
                method: "POST",
            }
        );
        fetchUnread();
    }

    async function loadConversation() {
        const res = await authFetch(
            `${BASEURL}/api/chat/orders/${orderId}/`
        );

        const data = await res.json();

        setMessages(data.messages);
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

            if (isOpen) {
                markConversationRead();
            } else {
                fetchUnread();
            }
        };
        return socket.current;
    }

    function sendMessage() {
        if (!message.trim()) return;

        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
            return;
        }

        socket.current.send(
            JSON.stringify({
                message,
                sender: isAdmin ? "admin" : "customer"
            })
        );
        setMessage("");
    }

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={async () => {
                    const opening = !isOpen;
                    setIsOpen(opening);
                    if (opening) {
                        await markConversationRead();
                        await onRefreshOrder?.();
                        await loadConversation();
                    }
                }}
                className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg flex items-center justify-center hover:bg-orange-600 transition ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
                {isOpen ? "✕" : "💬"}
            </button>

            <div
                className={`fixed top-20 bottom-0 right-0 bg-white border-l shadow-2xl z-30 flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0 w-full md:w-[380px]" : "translate-x-full w-full md:w-[380px]"}`}
            >
                <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                        <h3 className="font-bold text-stone-700">Order Chat</h3>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-2xl leading-none text-stone-500 hover:text-orange-500 transition"
                        >
                            ×
                        </button>
                    </div>
                    {currentQuotation && (
                        <QuotationCard
                            quotation={currentQuotation}
                            previousQuotation={previousQuotation}
                            isAdmin={isAdmin}
                            onAccepted={async () => {
                                await onQuotationAccepted?.();
                                await loadConversation();
                            }}
                        />
                    )}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                        {messages
                            .filter(msg => msg.message_type !== "quotation")
                            .map(msg => (
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

                    <div className="flex gap-2 p-4 border-t bg-white">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    sendMessage();
                                }
                            }}
                            className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                        />

                        <button
                            onClick={sendMessage}
                            className="px-4 rounded-lg bg-orange-500 text-white"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}