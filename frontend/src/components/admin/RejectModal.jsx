import { useState } from "react";

const reasonsList = [
    "Location not serviceable",
    "Cannot meet selected delivery date",
    "Incomplete delivery details",
    "Out of stock",
];

export default function RejectModal({ isOpen, onClose, onSubmit }) {
    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");

    if (!isOpen) return null;

    const handleSubmit = () => {
        const finalReason = customReason || selectedReason;

        if (!finalReason) {
            alert("Please select or enter a reason");
            return;
        }

        onSubmit(finalReason);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
                <h2 className="text-xl font-bold mb-4">Reject Order</h2>

                {/* PRESET REASONS */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {reasonsList.map((reason) => (
                        <button
                            key={reason}
                            onClick={() => {
                                setSelectedReason(reason);
                                setCustomReason("");
                            }}
                            className={`px-3 py-2 rounded border ${selectedReason === reason
                                    ? "bg-red-500 text-white"
                                    : "bg-gray-100"
                                }`}
                        >
                            {reason}
                        </button>
                    ))}
                </div>

                {/* CUSTOM INPUT */}
                <textarea
                    placeholder="Or write custom reason..."
                    value={customReason}
                    onChange={(e) => {
                        setCustomReason(e.target.value);
                        setSelectedReason("");
                    }}
                    className="w-full border p-2 rounded mb-4"
                />

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="bg-gray-400 text-white px-4 py-2 rounded"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Confirm Reject
                    </button>
                </div>
            </div>
        </div>
    );
}