// src/pages/ProductList.jsx
import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import "./ProductList.css";

function ProductList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    useEffect(() => {
        fetch(`${BASEURL}/api/products/`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch products!");
                }
                return response.json();
            })
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch((error) => {
                setError(error.message);
                setLoading(false);
            });
    }, [BASEURL]);

    if (loading) return <div className="list-loading">Unlocking the bakery vault...</div>;
    if (error) return <div className="list-error">Error: {error}</div>;

    return (
        <div className="product-list-page">
            <Navbar />
            <div className="list-container">
                <header className="list-header">
                    <h1>Our <span className="text-berry">Collection</span></h1>
                    <p>Handcrafted sweets, baked fresh daily.</p>
                </header>

                <div className="product-grid">
                    {products.length > 0 ? (
                        products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))
                    ) : (
                        <div className="empty-products">
                            <span className="empty-icon">🍰</span>
                            <p>Our ovens are busy! Check back soon for new treats.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductList;