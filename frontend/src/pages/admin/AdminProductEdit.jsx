// src/pages/admin/AdminProductEdit.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAccessToken } from "../../utils/auth";

function AdminProductEdit() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();
    const { id } = useParams();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "",
        image: null,
    });

    const [preview, setPreview] = useState(null);

    // 📌 Fetch product + categories
    useEffect(() => {
        const token = getAccessToken();

        // fetch product
        fetch(`${BASEURL}/api/products/${id}/`)
            .then(res => res.json())
            .then(data => {
                setFormData({
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    category: data.category,
                    image: null,
                });

                setPreview(`${BASEURL}${data.image}`);
                setLoading(false);
            });

        // fetch categories
        fetch(`${BASEURL}/api/categories/`)
            .then(res => res.json())
            .then(data => setCategories(data));
    }, [id]);

    // 📌 Handle input
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (name === "image") {
            const file = files[0];

            setFormData(prev => ({
                ...prev,
                image: file,
            }));

            if (file) {
                setPreview(URL.createObjectURL(file));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    // 📌 Submit update
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = getAccessToken();

            const data = new FormData();
            data.append("name", formData.name);
            data.append("description", formData.description);
            data.append("price", formData.price);
            data.append("category", formData.category);

            if (formData.image) {
                data.append("image", formData.image);
            }

            const res = await fetch(
                `${BASEURL}/api/admin/products/${id}/update/`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: data,
                }
            );

            if (!res.ok) {
                throw new Error("Update failed");
            }

            navigate("/admin/products");
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-6 rounded shadow-md w-full max-w-lg"
            >
                <h2 className="text-2xl font-bold mb-4">Edit Product</h2>

                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full mb-3 p-2 border rounded"
                    required
                />

                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full mb-3 p-2 border rounded"
                    required
                />

                <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full mb-3 p-2 border rounded"
                    required
                />

                <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full mb-3 p-2 border rounded"
                    required
                >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Preview */}
                {preview && (
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover mb-3 rounded"
                    />
                )}

                <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full mb-3"
                />

                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="flex-1 bg-blue-500 text-white py-2 rounded"
                    >
                        Save Changes
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/admin/products")}
                        className="flex-1 bg-gray-300 py-2 rounded"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AdminProductEdit;