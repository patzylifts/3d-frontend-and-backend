// src/components/UploadSampleCakeModal.jsx
import { useState } from "react";
import { authFetch } from "../utils/auth";

export default function UploadSampleCakeModal({
    isOpen,
    onClose,
    onSuccess,
}) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please upload an image.");
            return;
        }

        setError("");
        setImage(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!image) {
            setError("Please select an image.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("image", image);

            const res = await authFetch(
                `${BASEURL}/api/upload-sample-cake/`,
                {
                    method: "POST",
                    body: formData,
                    isFormData: true,
                }
            );

            const data = await res.json();

            if (!res.ok) {
                console.log(data);
                setError(JSON.stringify(data));
                return;
            }

            onSuccess(data.order_id);

        } catch {
            setError("Unable to upload image.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">

            <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">

                <div className="px-6 py-5 border-b">
                    <h2 className="text-2xl font-black text-[#6E473B]">
                        Upload Cake Inspiration
                    </h2>

                    <p className="text-sm text-stone-500 mt-2">
                        Upload a reference image of the cake you'd like us to recreate.
                    </p>
                </div>

                <div className="p-6 space-y-5">

                    <label
                        htmlFor="cake-upload"
                        className="border-2 border-dashed rounded-2xl h-72 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#d67b27] transition"
                    >

                        {!preview ? (
                            <div className="text-center">
                                <div className="text-6xl mb-3">
                                    🖼️
                                </div>

                                <p className="font-bold">
                                    Click to choose an image
                                </p>

                                <p className="text-xs text-stone-500 mt-1">
                                    JPG, PNG, WEBP
                                </p>
                            </div>
                        ) : (
                            <img
                                src={preview}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        )}

                    </label>

                    <input
                        id="cake-upload"
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                    />

                    {error && (
                        <div className="text-red-600 text-sm font-semibold">
                            {error}
                        </div>
                    )}

                </div>

                <div className="border-t p-5 flex justify-end gap-3">

                    <button
                        onClick={onClose}
                        className="px-5 py-3 rounded-xl border font-bold"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-[#d67b27] text-white font-bold disabled:opacity-60"
                    >
                        {loading
                            ? "Uploading..."
                            : "Proceed to Checkout"}
                    </button>

                </div>

            </div>

        </div>
    );
}