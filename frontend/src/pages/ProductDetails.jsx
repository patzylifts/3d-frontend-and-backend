import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import './ProductDetails.css';

function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { addToCart } = useCart();

    useEffect(() => {
        fetch(`${BASEURL}/api/products/${id}/`)
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch product details");
                return response.json();
            })
            .then((data) => {
                setProduct(data);
                setLoading(false);
            })
            .catch((error) => {
                setError(error.message);
                setLoading(false);
            });
    }, [id, BASEURL]);

    const handleAddToCart = () => {
        if (!localStorage.getItem('access_token')) {
            navigate("/login");
            return;
        }
        addToCart(product.id);
    };

    if (loading) return <div className="product-page-status"><h3>Preparing the details...</h3></div>;
    if (error) return <div className="product-page-status"><h3 className="text-berry">Error: {error}</h3></div>;
    if (!product) return <div className="product-page-status"><h3>Cake not found.</h3></div>;

    return (
        <div className="product-details-page">
            <Navbar />
            <div className="product-details-container">
                <button className="back-btn-minimal" onClick={() => navigate(-1)}>
                    ← Back
                </button>

                <div className="product-showcase-card">
                    <div className="product-image-section">
                        <img
                            src={`${product.image}`}
                            alt={product.name}
                            className="main-product-img"
                        />
                    </div>

                    <div className="product-info-section">
                        <div className="info-content">
                            <span className="category-tag">{product.category_name || "Premium Cake"}</span>
                            <h1 className="product-title">{product.name}</h1>
                            <p className="product-description">{product.description}</p>
                            
                            <div className="price-tag">
                                <span className="currency">₱</span>
                                <span className="amount">{Number(product.price).toLocaleString()}</span>
                            </div>

                            <div className="action-area">
                                <button onClick={handleAddToCart} className="btn-add-to-cart">
                                    Add to Cart
                                </button>
                                <p className="secure-text">✨ Freshly baked and ready for delivery</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductDetails;