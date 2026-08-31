// src/components/admin/CustomCakeModal.jsx | DO NOT REMOVE THIS!
import { useEffect, useRef, useState } from "react";
import { authFetch } from "../../utils/auth";
import "./CustomCakeModal.css";
import CakePreview3D from "./CakePreview3D";

export function CustomCakeModal({ isOpen, onClose, customization, orderId, canAddImages = false, onImagesAdded }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const fileInputRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [modalImages, setModalImages] = useState([]);
    const [addingImages, setAddingImages] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setError("");

            const initialImages = Array.isArray(customization?.images)
                ? customization.images
                : customization?.image
                    ? [{
                        image: customization.image,
                        upload_id: customization.upload_id,
                    }]
                    : [];

            setModalImages(initialImages);
        }
    }, [isOpen, customization]);

    if (!isOpen || !customization) return null;

    const images = modalImages;

    const getImageUrl = (url) => {
        if (!url) return "";
        return url.startsWith("http://") || url.startsWith("https://") ? url : `${BASEURL}${url}`;
    };

    const nextImage = () => {
        if (images.length <= 1) return;
        setCurrentIndex((current) => (current + 1) % images.length);
    };

    const previousImage = () => {
        if (images.length <= 1) return;
        setCurrentIndex((current) => (current - 1 + images.length) % images.length);
    };

    const closeModal = () => {
        setCurrentIndex(0);
        setError("");
        onClose();
    };

    const handleAddImages = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";

        if (!files.length) return;

        if (images.length + files.length > 10) {
            setError(`You can have a maximum of 10 reference images. You currently have ${images.length}.`);
            return;
        }

        if (files.some((file) => !file.type.startsWith("image/"))) {
            setError("Please select image files only.");
            return;
        }

        if (!orderId) {
            setError("Order ID is missing.");
            return;
        }

        setAddingImages(true);
        setError("");

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append("images", file));

            const res = await authFetch(`${BASEURL}/api/orders/${orderId}/uploaded-cake/samples/`, {
                method: "POST",
                body: formData,
                isFormData: true,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to add images.");
                return;
            }

            const newImages = Array.isArray(data.new_images)
                ? data.new_images
                : [];

            const firstNewIndex = images.length;

            setModalImages((currentImages) => [
                ...currentImages,
                ...newImages,
            ]);

            onImagesAdded?.(data);

            if (newImages.length > 0) {
                setCurrentIndex(firstNewIndex);
            }
        } catch (err) {
            console.error(err);
            setError("Unable to add images.");
        } finally {
            setAddingImages(false);
        }
    };

    return (
        <div className="custom-cake-overlay" onClick={closeModal}>
            <div className="custom-cake-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={closeModal}>✕</button>

                <h2>Custom Cake Preview</h2>

                {customization.uploaded_cake ? (
                    <div className="uploaded-cake-preview">
                        {images.length > 0 ? (
                            <>
                                <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                                    <div className="relative w-full h-full min-h-[280px] flex items-center justify-center bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden">
                                        <img src={getImageUrl(images[currentIndex]?.image)} alt={`Uploaded cake inspiration ${currentIndex + 1}`} className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl" />

                                        {images.length > 1 && (
                                            <>
                                                <button type="button" onClick={previousImage} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer shadow-lg" aria-label="Previous image">
                                                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M15 18l-6-6 6-6" />
                                                    </svg>
                                                </button>

                                                <button type="button" onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer shadow-lg" aria-label="Next image">
                                                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M9 18l6-6-6-6" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}

                                        {images.length > 1 && (
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                                {currentIndex + 1} / {images.length}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 shrink-0">
                                    {images.map((image, index) => (
                                        <button key={image.upload_id || index} type="button" onClick={() => setCurrentIndex(index)} className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${index === currentIndex ? "border-[#d67b27]" : "border-stone-200"}`}>
                                            <img src={getImageUrl(image.image)} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}

                                    {canAddImages && images.length < 10 && (
                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={addingImages} className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-stone-300 hover:border-[#d67b27] hover:bg-[#fffaf3] text-stone-400 hover:text-[#d67b27] flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" title={`Add images (${10 - images.length} remaining)`} >
                                            <span className="flex items-center justify-center w-full h-full text-2xl font-bold leading-none">
                                                {addingImages ? "…" : "+"}
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {canAddImages && (
                                    <input ref={fileInputRef} hidden type="file" accept="image/*" multiple onChange={handleAddImages} />
                                )}

                                {canAddImages && (
                                    <p className="text-xs text-stone-400 font-semibold text-center mt-2">
                                        {images.length}/10 reference images
                                    </p>
                                )}

                                {error && (
                                    <p className="text-sm text-rose-600 font-semibold mt-2 text-center">
                                        {error}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 text-stone-500">
                                <p className="font-semibold">No reference images.</p>

                                {canAddImages && (
                                    <>
                                        <input ref={fileInputRef} hidden type="file" accept="image/*" multiple onChange={handleAddImages} />

                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={addingImages} className="px-5 py-2.5 rounded-xl bg-[#d67b27] hover:bg-[#b56219] text-white font-bold cursor-pointer disabled:opacity-50">
                                            {addingImages ? "Adding Images..." : "＋ Add Reference Images"}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <CakePreview3D customization={customization} />
                )}
            </div>
        </div>
    );
}