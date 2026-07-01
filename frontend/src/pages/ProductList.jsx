// src/pages/ProductList.jsx
import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";

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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex flex-col items-center justify-center text-center p-6">
                <div className="text-5xl animate-spin mb-4">🎂</div>
                <div className="text-xl font-bold text-[#844414] animate-pulse">
                    Unlocking the bakery vault...
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex flex-col items-center justify-center text-center p-6">
                <div className="text-5xl mb-4">⚠️</div>
                <div className="text-lg font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4 max-w-md shadow-sm">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fffdf9] text-stone-800 antialiased">
            <Navbar />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header Section */}
                <header className="text-center max-w-xl mx-auto mb-14 space-y-3">
                    <h1 className="text-4xl font-black text-[#844414] tracking-tight sm:text-5xl drop-shadow-sm">
                        Our <span className="text-[#d67b27]">Collection</span>
                    </h1>
                    <p className="text-stone-500 font-medium text-base sm:text-lg">
                        Handcrafted sweets, baked fresh daily.
                    </p>
                    <div className="w-16 h-1 bg-[#d67b27] mx-auto rounded-full mt-4" />
                </header>

                {/* Product Section Grid */}
                <div className="w-full">
                    {products.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-8">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white border border-[#f3e1c6] rounded-3xl shadow-sm max-w-md mx-auto px-8 py-12">
                            <span className="text-6xl block mb-4 animate-bounce">🍰</span>
                            <p className="text-[#844414] font-bold text-xl">Our ovens are busy!</p>
                            <p className="text-stone-400 text-sm mt-2">Check back soon for new treats.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductList;