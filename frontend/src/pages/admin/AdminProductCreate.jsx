// src/pages/admin/AdminProductCreate.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../utils/auth";
import Navbar from "../../components/Navbar";

export default function AdminProductCreate() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [preview, setPreview] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "",
        image: null,
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${BASEURL}/api/categories/`)
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error(err));
    }, [BASEURL]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (name === "image") {
            const file = files[0];
            setFormData(prev => ({ ...prev, image: file }));
            setPreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

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
            if (formData.image) data.append("image", formData.image);

            const res = await fetch(`${BASEURL}/api/admin/products/create/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: data,
            });

            if (!res.ok) throw new Error("Failed to create product");
            navigate("/admin/products");
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCF8EE] pb-10">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 mt-8">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-[#E6CCA2] shadow-sm">
                    <header className="mb-8">
                        <h2 className="text-2xl font-black text-[#6E473B]">New Product</h2>
                        <p className="text-[#A07060]">Fill in the details to add a new cake to the menu.</p>
                    </header>

                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="flex justify-center">
                            <label className="w-full h-48 border-2 border-dashed border-[#E6CCA2] rounded-xl flex flex-col items-center justify-center cursor-pointer bg-[#FCF8EE] hover:bg-[#F5EEDD] transition-colors overflow-hidden">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <span className="text-3xl">📸</span>
                                        <p className="text-sm font-bold text-[#6E473B] mt-2">Click to upload image</p>
                                    </div>
                                )}
                                <input type="file" name="image" accept="image/*" onChange={handleChange} hidden />
                            </label>
                        </div>

                        {/* Input Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-[#6E473B] mb-1">Cake Name</label>
                                <input type="text" name="name" placeholder="e.g., Triple Chocolate Mousse" 
                                    className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]"
                                    onChange={handleChange} required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-[#6E473B] mb-1">Price (₱)</label>
                                    <input type="number" name="price" placeholder="0.00" 
                                        className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]"
                                        onChange={handleChange} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-[#6E473B] mb-1">Category</label>
                                    <select name="category" onChange={handleChange} required
                                        className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]">
                                        <option value="">Select...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-[#6E473B] mb-1">Description</label>
                                <textarea name="description" placeholder="What makes this cake special?" rows="4"
                                    className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]"
                                    onChange={handleChange} required />
                            </div>
                        </div>
                    </div>

                    <footer className="mt-8 flex gap-4">
                        <button type="button" onClick={() => navigate("/admin/products")}
                            className="flex-1 py-3 text-[#6E473B] font-bold border border-[#E6CCA2] rounded-lg hover:bg-[#F5EEDD]">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-3 bg-[#6E473B] text-white font-bold rounded-lg hover:bg-[#5a3a30] transition-colors disabled:opacity-50">
                            {loading ? "Creating..." : "Save Product"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}