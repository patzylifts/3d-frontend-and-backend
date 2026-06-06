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

                <CakePreview3D
                    customization={customization}
                />

            </div>
        </div>
    );
}