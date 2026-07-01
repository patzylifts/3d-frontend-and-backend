// src/pages/ProductDetails.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';

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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex flex-col items-center justify-center text-center p-6">
                <div className="text-5xl animate-spin mb-4">🎂</div>
                <h3 className="text-xl font-bold text-[#844414] animate-pulse">Preparing the details...</h3>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex flex-col items-center justify-center text-center p-6">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4 max-w-md shadow-sm">
                    Error: {error}
                </h3>
            </div>
        );
    }
    
    if (!product) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex flex-col items-center justify-center text-center p-6">
                <div className="text-5xl mb-4">🕵️‍♂️</div>
                <h3 className="text-xl font-bold text-stone-500">Cake not found.</h3>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fffdf9] text-stone-800 antialiased flex flex-col">
            <Navbar />
            
            <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col justify-center">
                {/* Back Button */}
                <div className="mb-6">
                    <button 
                        className="inline-flex items-center text-sm font-bold text-[#844414] hover:text-[#d67b27] transition-colors bg-white border border-[#f3e1c6] rounded-full px-4 py-1.5 shadow-sm" 
                        onClick={() => navigate(-1)}
                    >
                        ← Back
                    </button>
                </div>

                {/* Main Showcase Showcase Card */}
                <div className="bg-white border border-[#f3e1c6] rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 p-6 lg:p-10">
                    
                    {/* Image Box Section */}
                    <div className="flex items-center justify-center bg-[#fffdf9] rounded-2xl border border-stone-100 p-4 aspect-square max-h-[480px] w-full mx-auto overflow-hidden">
                        <img
                            src={`${product.image}`}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain rounded-xl hover:scale-102 transition-transform duration-300"
                        />
                    </div>

                    {/* Metadata Content Section */}
                    <div className="flex flex-col justify-between py-2">
                        <div className="space-y-4">
                            <span className="inline-block bg-[#fdf2e2] text-[#d67b27] text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full">
                                {product.category_name || "Premium Cake"}
                            </span>
                            
                            <h1 className="text-3xl sm:text-4xl font-black text-[#844414] tracking-tight">
                                {product.name}
                            </h1>
                            
                            <p className="text-stone-500 leading-relaxed text-base">
                                {product.description}
                            </p>
                        </div>

                        {/* Pricing & Button Area */}
                        <div className="mt-8 pt-6 border-t border-stone-100 space-y-6">
                            <div className="flex items-baseline space-x-1 text-[#844414]">
                                <span className="text-2xl font-bold">₱</span>
                                <span className="text-4xl font-black tracking-tight">
                                    {Number(product.price).toLocaleString()}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <button 
                                    onClick={handleAddToCart} 
                                    className="w-full bg-[#d67b27] hover:bg-[#b56219] text-white font-black py-3.5 px-6 rounded-full transition-colors duration-200 shadow-sm text-sm uppercase tracking-wider text-center"
                                >
                                    Add to Cart
                                </button>
                                <p className="text-xs text-stone-400 font-medium flex items-center justify-center gap-1.5">
                                    <span>✨</span> Freshly baked and ready for delivery
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default ProductDetails;