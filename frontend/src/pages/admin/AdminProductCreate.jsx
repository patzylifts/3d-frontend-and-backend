import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminProductCreate.css";

function AdminProductCreate() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [preview, setPreview] = useState(null); // For image preview
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
            setPreview(URL.createObjectURL(file)); // Set preview URL
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
        <div className="create-product-page">
            <Navbar />
            <div className="create-product-container">
                <form onSubmit={handleSubmit} className="create-product-card">
                    <header className="form-header">
                        <h2>New Product</h2>
                        <p>Fill in the details to add a new cake to the menu.</p>
                    </header>

                    <div className="form-body">
                        {/* Image Upload Area */}
                        <div className="image-upload-section">
                            <label className="image-dropzone">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="preview-img" />
                                ) : (
                                    <div className="upload-placeholder">
                                        <span>📸</span>
                                        <p>Click to upload image</p>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    name="image" 
                                    accept="image/*" 
                                    onChange={handleChange} 
                                    hidden 
                                />
                            </label>
                        </div>

                        <div className="input-fields">
                            <div className="field-group">
                                <label>Cake Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g., Triple Chocolate Mousse"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="field-row">
                                <div className="field-group">
                                    <label>Price (₱)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        placeholder="0.00"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Category</label>
                                    <select name="category" onChange={handleChange} required>
                                        <option value="">Select...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="field-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    placeholder="What makes this cake special?"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <footer className="form-actions">
                        <button 
                            type="button" 
                            className="btn-cancel" 
                            onClick={() => navigate("/admin/products")}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? "Creating..." : "Save Product"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}

export default AdminProductCreate;