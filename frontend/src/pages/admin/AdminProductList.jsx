// src/pages/admin/AdminProduct/List.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminProductCard from "../../components/admin/AdminProductCard";
import { getAccessToken } from "../../utils/auth";

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
                if (!res.ok) {
                    throw new Error("Failed to fetch admin products");
                }
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
    }, []);

    if (loading) return <div>Loading admin products...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold text-center py-6 bg-white shadow-md">
                Admin Product Management
            </h1>

            <div className="flex justify-end p-6">
                <button
                    onClick={() => navigate("/admin/products/create")}
                    className="bg-black text-white px-4 py-2 rounded hover:opacity-80"
                >
                    + Add Product
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6 pb-6">
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
                    <p className="col-span-full text-center text-gray-500">
                        No products found.
                    </p>
                )}
            </div>
        </div>
    );
}

export default AdminProductList;