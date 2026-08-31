// src/components/UploadSampleCakeModal.jsx | DO NOT REMOVE THIS!
import { useEffect, useState } from "react";
import { authFetch } from "../utils/auth";

export default function UploadSampleCakeModal({ isOpen, onClose, onSuccess }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            previews.forEach((url) => URL.revokeObjectURL(url));
            setImages([]);
            setPreviews([]);
            setError("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);

        if (!files.length) return;

        if (files.length > 10) {
            setError("You can upload a maximum of 10 images.");
            return;
        }

        if (files.some((file) => !file.type.startsWith("image/"))) {
            setError("Please upload image files only.");
            return;
        }

        previews.forEach((url) => URL.revokeObjectURL(url));
        setImages(files);
        setPreviews(files.map((file) => URL.createObjectURL(file)));
        setError("");
        e.target.value = "";
    };

    const removeImage = (index) => {
        URL.revokeObjectURL(previews[index]);
        setImages((current) => current.filter((_, i) => i !== index));
        setPreviews((current) => current.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!images.length) {
            setError("Please select at least one image.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            images.forEach((image) => formData.append("images", image));

            const res = await authFetch(`${BASEURL}/api/upload-sample-cake/`, {
                method: "POST",
                body: formData,
                isFormData: true,
            });

            const data = await res.json();

            if (!res.ok) {
                console.error(data);
                setError(data.error || JSON.stringify(data));
                return;
            }

            onSuccess(data.order_id);
        } catch (err) {
            console.error(err);
            setError("Unable to upload images.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b shrink-0">
                    <h2 className="text-2xl font-black text-[#6E473B]">Upload Cake Inspiration</h2>
                    <p className="text-sm text-stone-500 mt-2">Upload up to 10 reference images of the cake you'd like us to recreate.</p>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                    <label htmlFor="cake-upload" className="border-2 border-dashed rounded-2xl min-h-48 flex items-center justify-center cursor-pointer hover:border-[#d67b27] transition p-4">
                        {!previews.length ? (
                            <div className="text-center">
                                <div className="text-5xl mb-3">🖼️</div>
                                <p className="font-bold">Click to choose images</p>
                                <p className="text-xs text-stone-500 mt-1">JPG, PNG, WEBP · Up to 10 images</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
                                {previews.map((preview, index) => (
                                    <div key={preview} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />

                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(index); }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 hover:bg-black text-white text-sm font-bold flex items-center justify-center cursor-pointer">
                                            ×
                                        </button>

                                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                            {index + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </label>

                    <input id="cake-upload" hidden type="file" accept="image/*" multiple onChange={handleImageChange} />

                    {previews.length > 0 && (
                        <p className="text-xs text-stone-500 font-semibold">
                            {images.length} {images.length === 1 ? "image" : "images"} selected
                        </p>
                    )}

                    {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
                </div>

                <div className="border-t p-5 flex justify-end gap-3 shrink-0 bg-white">
                    <button onClick={onClose} disabled={loading} className="px-5 py-3 rounded-xl border font-bold cursor-pointer disabled:opacity-50">Cancel</button>
                    <button onClick={handleUpload} disabled={loading || !images.length} className="px-6 py-3 rounded-xl bg-[#d67b27] text-white font-bold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed">
                        {loading ? "Uploading..." : `Proceed to Checkout${images.length > 1 ? ` (${images.length} images)` : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}