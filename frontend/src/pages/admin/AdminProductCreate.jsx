import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../utils/auth";

function AdminProductCreate() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "",
        image: null,
    });

    const [loading, setLoading] = useState(false);

    // 📌 Fetch categories
    useEffect(() => {
        fetch(`${BASEURL}/api/categories/`)
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error(err));
    }, []);

    // 📌 Handle input
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (name === "image") {
            setFormData(prev => ({
                ...prev,
                image: files[0],
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    // 📌 Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

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

            const res = await fetch(`${BASEURL}/api/admin/products/create/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: data,
            });

            if (!res.ok) {
                throw new Error("Failed to create product");
            }

            navigate("/admin/products");
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-6 rounded shadow-md w-full max-w-lg"
            >
                <h2 className="text-2xl font-bold mb-4">Add Product</h2>

                <input
                    type="text"
                    name="name"
                    placeholder="Product Name"
                    onChange={handleChange}
                    required
                    className="w-full mb-3 p-2 border rounded"
                />

                <textarea
                    name="description"
                    placeholder="Description"
                    onChange={handleChange}
                    required
                    className="w-full mb-3 p-2 border rounded"
                />

                <input
                    type="number"
                    name="price"
                    placeholder="Price"
                    onChange={handleChange}
                    required
                    className="w-full mb-3 p-2 border rounded"
                />

                {/* Category */}
                <select
                    name="category"
                    onChange={handleChange}
                    required
                    className="w-full mb-3 p-2 border rounded"
                >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Image */}
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
                        disabled={loading}
                        className="flex-1 bg-black text-white py-2 rounded"
                    >
                        {loading ? "Creating..." : "Create"}
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

export default AdminProductCreate;