import "./CustomCakeModal.css";
import CakePreview3D from "./CakePreview3D";

export function CustomCakeModal({ isOpen, onClose, customization }) {
    if (!isOpen || !customization) return null;

    return (
        <div className="custom-cake-overlay">
            <div className="custom-cake-modal">

                <button
                    className="close-btn"
                    onClick={onClose}
                >
                    ✕
                </button>

                <h2>Custom Cake Preview</h2>

                {customization?.uploaded_cake ? (
                    <div className="uploaded-cake-preview">

                        <img
                            src={`${import.meta.env.VITE_DJANGO_BASE_URL}${customization.image}`}
                            alt="Uploaded cake inspiration"
                        />

                        <div className="uploaded-cake-notes">
                            <strong>Customer Notes</strong>

                            <p>
                                {customization.notes?.trim()
                                    ? customization.notes
                                    : "No notes provided."}
                            </p>
                        </div>

                    </div>
                ) : (
                    <CakePreview3D
                        customization={customization}
                    />
                )}

            </div>
        </div>
    );
}