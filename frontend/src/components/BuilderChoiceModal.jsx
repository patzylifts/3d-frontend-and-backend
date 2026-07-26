// src/compenents/BuilderChoiceModal.jsx
import { useNavigate } from "react-router-dom";

export default function BuilderChoiceModal({
    isOpen,
    onClose,
    onUploadClick,
}) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleBuilder = () => {
        onClose();
        navigate("/build");
    };

    const handleUpload = () => {
        onClose();
        onUploadClick();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">

            <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden">

                <div className="px-6 py-5 border-b">
                    <h2 className="text-2xl font-black text-[#6E473B]">
                        Customize Your Cake
                    </h2>

                    <p className="text-sm text-stone-500 mt-2">
                        Choose how you'd like to customize your cake.
                    </p>
                </div>

                <div className="p-6 space-y-4">

                    <button
                        onClick={handleBuilder}
                        className="w-full rounded-2xl border p-5 text-left hover:border-[#d67b27] hover:bg-orange-50 transition cursor-pointer"
                    >
                        <div className="text-3xl mb-2">🎂</div>

                        <h3 className="font-bold text-lg">
                            3D Cake Builder
                        </h3>

                        <p className="text-sm text-stone-500 mt-1">
                            Build your own cake using our interactive 3D designer.
                        </p>
                    </button>

                    <button
                        onClick={handleUpload}
                        className="w-full rounded-2xl border p-5 text-left hover:border-[#d67b27] hover:bg-orange-50 transition cursor-pointer"
                    >
                        <div className="text-3xl mb-2">🖼️</div>

                        <h3 className="font-bold text-lg">
                            Upload Sample Cake
                        </h3>

                        <p className="text-sm text-stone-500 mt-1">
                            Upload an inspiration image for our team to recreate.
                        </p>
                    </button>

                </div>

                <div className="border-t p-5 flex justify-end">

                    <button
                        onClick={onClose}
                        className="px-5 py-3 rounded-xl border font-bold"
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>
    );
}