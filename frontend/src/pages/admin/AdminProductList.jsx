import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminProductCard from "../../components/admin/AdminProductCard";
import { getAccessToken } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminProductList.css";

function AdminProductList() {
    const [activeTab, setActiveTab] = useState("products");
    const [products, setProducts] = useState([]);
    const [basePrices, setBasePrices] = useState([]);
    const [addonPrices, setAddonPrices] = useState([]);
    const [draftBasePrices, setDraftBasePrices] = useState({});
    const [draftAddonPrices, setDraftAddonPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [pricingLoading, setPricingLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pricingError, setPricingError] = useState(null);
    const [savingKey, setSavingKey] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const successTimerRef = useRef(null);
    const navigate = useNavigate();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const authHeaders = useCallback(() => ({
        Authorization: `Bearer ${getAccessToken()}`,
    }), []);

    const fetchPricing = useCallback(async () => {
        setPricingLoading(true);
        setPricingError(null);

        try {
            const [baseRes, addonRes] = await Promise.all([
                fetch(`${BASEURL}/api/admin/custom-pricing/`, { headers: authHeaders() }),
                fetch(`${BASEURL}/api/admin/addon-pricing/`, { headers: authHeaders() }),
            ]);

            if (!baseRes.ok || !addonRes.ok) {
                throw new Error("Failed to fetch custom cake pricing");
            }

            const [baseData, addonData] = await Promise.all([
                baseRes.json(),
                addonRes.json(),
            ]);

            setBasePrices(baseData);
            setAddonPrices(addonData);
            setDraftBasePrices({});
            setDraftAddonPrices({});
        } catch (err) {
            setPricingError(err.message);
        } finally {
            setPricingLoading(false);
        }
    }, [BASEURL, authHeaders]);

    useEffect(() => {
        fetch(`${BASEURL}/api/admin/products/`, {
            headers: authHeaders(),
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
    }, [BASEURL, authHeaders]);

    useEffect(() => {
        fetchPricing();
    }, [fetchPricing]);

    useEffect(() => {
        return () => {
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
            }
        };
    }, []);

    const getBaseDraftValue = (item) => draftBasePrices[item.id] ?? item.price;
    const getAddonDraftValue = (item) => draftAddonPrices[item.id] ?? item.price;

    const saveBasePrice = async (item) => {
        await savePrice({
            url: `${BASEURL}/api/admin/custom-pricing/${item.id}/update/`,
            value: getBaseDraftValue(item),
            savingId: `base-${item.id}`,
            onSuccess: (updated) => {
                setBasePrices((prev) => prev.map((price) => price.id === item.id ? updated : price));
                setDraftBasePrices((prev) => {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                });
            },
        });
    };

    const saveAddonPrice = async (item) => {
        await savePrice({
            url: `${BASEURL}/api/admin/addon-pricing/${item.id}/update/`,
            value: getAddonDraftValue(item),
            savingId: `addon-${item.id}`,
            onSuccess: (updated) => {
                setAddonPrices((prev) => prev.map((price) => price.id === item.id ? updated : price));
                setDraftAddonPrices((prev) => {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                });
            },
        });
    };

    const savePrice = async ({ url, value, savingId, onSuccess }) => {
        setSavingKey(savingId);

        try {
            const res = await fetch(url, {
                method: "PATCH",
                headers: {
                    ...authHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ price: value }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save price");
            onSuccess(data);
            showSuccessMessage("Price updated successfully.");
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingKey("");
        }
    };

    const showSuccessMessage = (message) => {
        setSuccessMessage(message);

        if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
        }

        successTimerRef.current = setTimeout(() => {
            setSuccessMessage("");
        }, 2500);
    };

    const cancelBaseEdit = (id) => {
        setDraftBasePrices((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const cancelAddonEdit = (id) => {
        setDraftAddonPrices((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const renderPriceActions = ({ isChanged, onSave, onCancel, savingId }) => (
        <div className="pricing-actions">
            <button
                type="button"
                className="btn-price-save"
                onClick={onSave}
                disabled={!isChanged || savingKey === savingId}
            >
                {savingKey === savingId ? "Saving..." : "Save"}
            </button>
            <button
                type="button"
                className="btn-price-cancel"
                onClick={onCancel}
                disabled={!isChanged || savingKey === savingId}
            >
                Cancel
            </button>
        </div>
    );

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

            {successMessage && (
                <div className="admin-price-toast" role="status">
                    {successMessage}
                </div>
            )}

            <div className="admin-products-container">
                <header className="admin-products-header">
                    <div>
                        <h1>Product Management</h1>
                        <p style={{ color: '#888', marginTop: '5px' }}>
                            Edit shop products and custom cake pricing.
                        </p>
                    </div>

                    {activeTab === "products" && (
                        <button
                            onClick={() => navigate("/admin/products/create")}
                            className="btn-add-product"
                        >
                            <span>+</span> Add New Product
                        </button>
                    )}
                </header>

                <div className="admin-product-tabs" role="tablist" aria-label="Product management sections">
                    <button
                        type="button"
                        className={`admin-product-tab ${activeTab === "products" ? "active" : ""}`}
                        onClick={() => setActiveTab("products")}
                    >
                        Products
                    </button>
                    <button
                        type="button"
                        className={`admin-product-tab ${activeTab === "pricing" ? "active" : ""}`}
                        onClick={() => setActiveTab("pricing")}
                    >
                        Custom Cake Pricing
                    </button>
                </div>

                {activeTab === "products" ? (
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
                ) : (
                    <div className="pricing-panel">
                        {pricingLoading ? (
                            <div className="pricing-status">Loading custom cake prices...</div>
                        ) : pricingError ? (
                            <div className="pricing-status pricing-status-error">{pricingError}</div>
                        ) : (
                            <>
                                <section className="pricing-section">
                                    <div className="pricing-section-header">
                                        <h2>Base Cake Prices</h2>
                                        <p>Prices are matched by tier, size, and flavor.</p>
                                    </div>

                                    <div className="pricing-table-wrap">
                                        <table className="pricing-table">
                                            <thead>
                                                <tr>
                                                    <th>Tier</th>
                                                    <th>Size</th>
                                                    <th>Flavor</th>
                                                    <th>Price</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {basePrices.map((item) => {
                                                    const draftValue = getBaseDraftValue(item);
                                                    const isChanged = draftValue !== item.price;

                                                    return (
                                                        <tr key={item.id}>
                                                            <td>{item.tier}</td>
                                                            <td>{item.size}</td>
                                                            <td>{item.flavor}</td>
                                                            <td>
                                                                <input
                                                                    className="pricing-input"
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={draftValue}
                                                                    onChange={(e) => setDraftBasePrices((prev) => ({
                                                                        ...prev,
                                                                        [item.id]: e.target.value,
                                                                    }))}
                                                                />
                                                            </td>
                                                            <td>
                                                                {renderPriceActions({
                                                                    isChanged,
                                                                    onSave: () => saveBasePrice(item),
                                                                    onCancel: () => cancelBaseEdit(item.id),
                                                                    savingId: `base-${item.id}`,
                                                                })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="pricing-section">
                                    <div className="pricing-section-header">
                                        <h2>Topping Prices</h2>
                                        <p>Selected toppings are added to the custom cake total.</p>
                                    </div>

                                    <div className="pricing-table-wrap pricing-table-wrap-small">
                                        <table className="pricing-table">
                                            <thead>
                                                <tr>
                                                    <th>Topping</th>
                                                    <th>Price</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {addonPrices.map((item) => {
                                                    const draftValue = getAddonDraftValue(item);
                                                    const isChanged = draftValue !== item.price;

                                                    return (
                                                        <tr key={item.id}>
                                                            <td>{item.name}</td>
                                                            <td>
                                                                <input
                                                                    className="pricing-input"
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={draftValue}
                                                                    onChange={(e) => setDraftAddonPrices((prev) => ({
                                                                        ...prev,
                                                                        [item.id]: e.target.value,
                                                                    }))}
                                                                />
                                                            </td>
                                                            <td>
                                                                {renderPriceActions({
                                                                    isChanged,
                                                                    onSave: () => saveAddonPrice(item),
                                                                    onCancel: () => cancelAddonEdit(item.id),
                                                                    savingId: `addon-${item.id}`,
                                                                })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminProductList;
