// src/pages/admin/AdminProductList.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminProductCard from "../../components/admin/AdminProductCard";
import { getAccessToken } from "../../utils/auth";
import Navbar from "../../components/Navbar";

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
            if (!baseRes.ok || !addonRes.ok) throw new Error("Failed to fetch custom cake pricing");
            const [baseData, addonData] = await Promise.all([baseRes.json(), addonRes.json()]);
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
        fetch(`${BASEURL}/api/admin/products/`, { headers: authHeaders() })
            .then((res) => { if (!res.ok) throw new Error("Failed to fetch admin products"); return res.json(); })
            .then((data) => { setProducts(data); setLoading(false); })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, [BASEURL, authHeaders]);

    useEffect(() => { fetchPricing(); }, [fetchPricing]);
    useEffect(() => () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); }, []);

    const getBaseDraftValue = (item) => draftBasePrices[item.id] ?? item.price;
    const getAddonDraftValue = (item) => draftAddonPrices[item.id] ?? item.price;

    const savePrice = async ({ url, value, savingId, onSuccess }) => {
        setSavingKey(savingId);
        try {
            const res = await fetch(url, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ price: value }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save price");
            onSuccess(data);
            setSuccessMessage("Price updated successfully.");
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => setSuccessMessage(""), 2500);
        } catch (err) { alert(err.message); } finally { setSavingKey(""); }
    };

    const saveBasePrice = async (item) => await savePrice({
        url: `${BASEURL}/api/admin/custom-pricing/${item.id}/update/`,
        value: getBaseDraftValue(item),
        savingId: `base-${item.id}`,
        onSuccess: (updated) => {
            setBasePrices((prev) => prev.map((p) => p.id === item.id ? updated : p));
            setDraftBasePrices((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
        },
    });

    const saveAddonPrice = async (item) => await savePrice({
        url: `${BASEURL}/api/admin/addon-pricing/${item.id}/update/`,
        value: getAddonDraftValue(item),
        savingId: `addon-${item.id}`,
        onSuccess: (updated) => {
            setAddonPrices((prev) => prev.map((p) => p.id === item.id ? updated : p));
            setDraftAddonPrices((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
        },
    });

    const renderPriceActions = ({ isChanged, onSave, onCancel, savingId }) => (
        <div className="flex gap-2">
            <button type="button" onClick={onSave} disabled={!isChanged || savingKey === savingId}
                className="px-3 py-1 bg-[#6E473B] text-white text-xs font-bold rounded-lg disabled:opacity-50">
                {savingKey === savingId ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={onCancel} disabled={!isChanged || savingKey === savingId}
                className="px-3 py-1 bg-gray-200 text-[#6E473B] text-xs font-bold rounded-lg disabled:opacity-50">
                Cancel
            </button>
        </div>
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FCF8EE] text-[#6E473B] font-black">Preparing your product gallery...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Error: {error}</div>;

    return (
        <div className="min-h-screen bg-[#FCF8EE] pb-10">
            <Navbar />
            {successMessage && <div className="fixed top-20 right-5 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold">{successMessage}</div>}
            
            <div className="max-w-7xl mx-auto px-4 mt-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[#6E473B]">Product Management</h1>
                        <p className="text-[#A07060]">Edit shop products and custom cake pricing.</p>
                    </div>
                    {activeTab === "products" && (
                        <button onClick={() => navigate("/admin/products/create")} className="px-4 py-2 bg-[#6E473B] text-white font-bold rounded-xl hover:bg-[#5a3a30]">
                            + Add New Product
                        </button>
                    )}
                </header>

                <div className="flex gap-4 border-b border-[#E6CCA2] mb-8">
                    {["products", "pricing"].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} 
                            className={`pb-2 px-4 capitalize font-black ${activeTab === tab ? "text-[#6E473B] border-b-2 border-[#6E473B]" : "text-[#A07060]"}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === "products" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.length > 0 ? products.map((product) => <AdminProductCard key={product.id} product={product} onDelete={(id) => setProducts(prev => prev.filter(p => p.id !== id))} />) 
                        : <p className="text-[#A07060]">Your shop is currently empty.</p>}
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2]">
                        {pricingLoading ? <p>Loading...</p> : (
                            <div className="space-y-10">
                                {[{ title: "Base Cake Prices", data: basePrices, setter: setDraftBasePrices, getter: getBaseDraftValue, onSave: saveBasePrice, onCancel: (id) => setDraftBasePrices(prev => { const n = {...prev}; delete n[id]; return n; }), headers: ["Tier", "Size", "Flavor", "Price", "Actions"] },
                                  { title: "Topping Prices", data: addonPrices, setter: setDraftAddonPrices, getter: getAddonDraftValue, onSave: saveAddonPrice, onCancel: (id) => setDraftAddonPrices(prev => { const n = {...prev}; delete n[id]; return n; }), headers: ["Topping", "Price", "Actions"] }].map((sec, idx) => (
                                    <section key={idx}>
                                        <h2 className="text-lg font-black text-[#6E473B] mb-4">{sec.title}</h2>
                                        <table className="w-full text-left">
                                            <thead><tr className="text-[#A07060] text-xs uppercase">{sec.headers.map(h => <th key={h} className="pb-2">{h}</th>)}</tr></thead>
                                            <tbody className="divide-y divide-[#E6CCA2]/20">
                                                {sec.data.map(item => {
                                                    const draft = sec.getter(item);
                                                    return (
                                                        <tr key={item.id} className="py-4">
                                                            {item.tier && <td className="py-3">{item.tier}</td>}
                                                            {item.size && <td className="py-3">{item.size}</td>}
                                                            {item.flavor && <td className="py-3">{item.flavor}</td>}
                                                            {item.name && <td className="py-3">{item.name}</td>}
                                                            <td className="py-3"><input type="number" step="0.01" value={draft} onChange={(e) => sec.setter(prev => ({...prev, [item.id]: e.target.value}))} className="w-24 p-2 bg-[#FCF8EE] rounded border border-[#E6CCA2]" /></td>
                                                            <td className="py-3">{renderPriceActions({ isChanged: draft != item.price, onSave: () => sec.onSave(item), onCancel: () => sec.onCancel(item.id), savingId: `sec-${item.id}` })}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminProductList;