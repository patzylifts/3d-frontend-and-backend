import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminProductCard from "../../components/admin/AdminProductCard";
import { getAccessToken } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminProductList.css";

function AdminProductList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    useEffect(() => {
        const token = getAccessToken();

        fetch(`${BASEURL}/api/admin/products/`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch admin products");
                return res.json();
            })
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [BASEURL]);

    if (loading) return (
        <div className="admin-status-screen">
            <p>Preparing your product gallery...</p>
        </div>
    );

    if (error) return (
        <div className="admin-status-screen">
            <p style={{ color: '#d85c7b' }}>Error: {error}</p>
        </div>
    );

    return (
        <div className="admin-products-page">
            <Navbar />
            
            <div className="admin-products-container">
                <header className="admin-products-header">
                    <div>
                        <h1>Product Management</h1>
                        <p style={{ color: '#888', marginTop: '5px' }}>
                            Edit, delete, or add new items to your shop.
                        </p>
                    </div>
                    
                    <button
                        onClick={() => navigate("/admin/products/create")}
                        className="btn-add-product"
                    >
                        <span>+</span> Add New Product
                    </button>
                </header>

                <div className="products-bento-grid">
                    {products.length > 0 ? (
                        products.map((product) => (
                            <AdminProductCard
                                key={product.id}
                                product={product}
                                onDelete={(id) =>
                                    setProducts(prev => prev.filter(p => p.id !== id))
                                }
                            />
                        ))
                    ) : (
                        <div className="no-products-msg">
                            <p>Your shop is currently empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminProductList;