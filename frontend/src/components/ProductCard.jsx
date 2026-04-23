// src/components/ProductCard.jsx
import { useNavigate } from "react-router-dom";
import "./ProductCard.css";

function ProductCard({ product }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();

    const handleAddToCart = (e) => {
        // StopPropagation prevents the card's onClick (navigate) from firing
        e.stopPropagation();
        console.log("Added to cart:", product.name);
    };

    return (
        <div 
            className="product-card-item" 
            onClick={() => navigate(`/product/${product.id}`)}
        >
            <div className="card-image-area">
                <img
                    src={`${BASEURL}${product.image}`}
                    alt={product.name}
                    className="card-img" 
                />
                <div className="card-overlay">
                    <span className="overlay-btn-text">View Details</span>
                </div>
            </div>

            <div className="card-info">
                <h2 className="card-title">{product.name}</h2>
                <p className="card-price">₱{Number(product.price).toLocaleString()}</p>
                
                <div className="card-actions">
                    <button 
                        className="card-add-button"
                        onClick={handleAddToCart}
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductCard;