// src/components/admin/AdminProductCard.jsx
import { getAccessToken } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

function AdminProductCard({ product, onDelete }) {
    const navigate = useNavigate();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const handleDelete = async () => {
        const confirmDelete = window.confirm("Delete this product?");
        if (!confirmDelete) return;

        try {
            const token = getAccessToken();

            const res = await fetch(
                `${BASEURL}/api/admin/products/${product.id}/delete/`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                throw new Error("Delete failed");
            }

            onDelete(product.id);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-4">
            <img
                src={`${BASEURL}${product.image}`}
                alt={product.name}
                className="w-full h-48 object-cover rounded mb-3"
            />

            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-gray-600 mb-3">₱{product.price}</p>
            <p className="text-sm text-gray-500 mb-3">
                {product.description.length > 60
                    ? product.description.slice(0, 60) + "..."
                    : product.description}
            </p>

            <div className="flex gap-2">
                <button
                    onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                    className="flex-1 bg-blue-500 text-white py-1 rounded hover:opacity-80"
                >
                    Edit
                </button>
                <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-500 text-white py-1 rounded hover:opacity-80"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

export default AdminProductCard;