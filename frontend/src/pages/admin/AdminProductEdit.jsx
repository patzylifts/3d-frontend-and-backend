import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAccessToken } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminProductEdit.css";

function AdminProductEdit() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();
    const { id } = useParams();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [preview, setPreview] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "",
        image: null,
    });

    useEffect(() => {
        const token = getAccessToken();

        // Fetching both in parallel for speed
        Promise.all([
            fetch(`${BASEURL}/api/products/${id}/`).then(res => res.json()),
            fetch(`${BASEURL}/api/categories/`).then(res => res.json())
        ])
        .then(([productData, catData]) => {
            setFormData({
                name: productData.name,
                description: productData.description,
                price: productData.price,
                category: productData.category,
                image: null,
            });
            setCategories(catData);
            setPreview(`${BASEURL}${productData.image}`);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [id, BASEURL]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "image") {
            const file = files[0];
            setFormData(prev => ({ ...prev, image: file }));
            if (file) setPreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getAccessToken();
            const data = new FormData();
            data.append("name", formData.name);
            data.append("description", formData.description);
            data.append("price", formData.price);
            data.append("category", formData.category);
            if (formData.image) data.append("image", formData.image);

            const res = await fetch(`${BASEURL}/api/admin/products/${id}/update/`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
                body: data,
            });

            if (!res.ok) throw new Error("Update failed");
            navigate("/admin/products");
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="edit-status-loading">Loading cake profile...</div>;

    return (
        <div className="edit-product-page">
            <Navbar />
            <div className="edit-card">
                <form onSubmit={handleSubmit}>
                    <div className="edit-grid">
                        
                        {/* Left Side: Visuals */}
                        <div className="edit-visual-pane">
                            <div className="edit-image-container">
                                <img src={preview} alt="Product" className="edit-preview" />
                                <label className="change-img-overlay">
                                    <span>Replace Image</span>
                                    <input type="file" name="image" onChange={handleChange} hidden />
                                </label>
                            </div>
                            <div className="edit-badge">Editing Mode</div>
                        </div>

                        {/* Right Side: Inputs */}
                        <div className="edit-info-pane">
                            <header className="edit-header">
                                <h1>Update Product</h1>
                                <p>Modifying ID: <strong>#{id}</strong></p>
                            </header>

                            <div className="edit-form-group">
                                <label>Product Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                            </div>

                            <div className="edit-row">
                                <div className="edit-form-group">
                                    <label>Price (₱)</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleChange} required />
                                </div>
                                <div className="edit-form-group">
                                    <label>Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} required>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="edit-form-group">
                                <label>Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} required />
                            </div>

                            <div className="edit-actions">
                                <button type="button" className="btn-edit-cancel" onClick={() => navigate("/admin/products")}>
                                    Discard
                                </button>
                                <button type="submit" className="btn-edit-save">
                                    Update Details
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminProductEdit;