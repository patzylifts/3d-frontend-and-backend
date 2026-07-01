// src/pages/CheckoutPage.jsx
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { authFetch } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { regions, provinces, cities, barangays } from "phil-address";

function CheckoutPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [useProfileAddress, setUseProfileAddress] = useState(true);
    const [profileAddress, setProfileAddress] = useState({
        street: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        postal_code: "",
        full_name: "",
        phone: "",
    });

    const [customAddress, setCustomAddress] = useState({
        street: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        postal_code: "",
    });

    // Phil-address API states
    const [regionList, setRegionList] = useState([]);
    const [provinceList, setProvinceList] = useState([]);
    const [cityList, setCityList] = useState([]);
    const [barangayList, setBarangayList] = useState([]);

    // Allowed regions
    const ALLOWED_REGIONS = ["Region 4A", "NCR"];

    const [deliveryDate, setDeliveryDate] = useState("");
    const [deliveryTime, setDeliveryTime] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Load regions on mount
    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const regionData = await regions();
                const filteredRegions = regionData.filter(reg => 
                    ALLOWED_REGIONS.includes(reg.name)
                );
                setRegionList(filteredRegions);
            } catch (error) {
                console.error("Error fetching regions:", error);
            }
        };
        fetchRegions();
    }, []);

    useEffect(() => {
        async function fetchProfile() {
            const res = await authFetch(`${BASEURL}/api/profile/`);
            const data = await res.json();
            setProfileAddress({
                street: data.street || "",
                region: data.region || "",
                province: data.province || "",
                city: data.city || "",
                barangay: data.barangay || "",
                postal_code: data.postal_code || "",
                full_name: data.user.first_name + " " + data.user.last_name,
                phone: data.phone,
            });
        }
        fetchProfile();
    }, [BASEURL]);

    // Fetch provinces when custom region changes
    useEffect(() => {
        const fetchProvinces = async () => {
            if (!customAddress.region) {
                setProvinceList([]);
                setCityList([]);
                setBarangayList([]);
                return;
            }

            try {
                const provincesData = await provinces(customAddress.region);
                setProvinceList(provincesData);
                setCustomAddress(prev => ({ ...prev, province: "", city: "", barangay: "" }));
                setCityList([]);
                setBarangayList([]);
            } catch (error) {
                console.error("Error fetching provinces:", error);
            }
        };
        fetchProvinces();
    }, [customAddress.region]);

    // Fetch cities when custom province changes
    useEffect(() => {
        const fetchCities = async () => {
            if (!customAddress.province) {
                setCityList([]);
                setBarangayList([]);
                return;
            }

            try {
                const citiesData = await cities(customAddress.province);
                setCityList(citiesData);
                setCustomAddress(prev => ({ ...prev, city: "", barangay: "" }));
                setBarangayList([]);
            } catch (error) {
                console.error("Error fetching cities:", error);
            }
        };
        fetchCities();
    }, [customAddress.province]);

    // Fetch barangays when custom city changes
    useEffect(() => {
        const fetchBarangays = async () => {
            if (!customAddress.city) {
                setBarangayList([]);
                return;
            }

            try {
                const barangaysData = await barangays(customAddress.city);
                setBarangayList(barangaysData);
                setCustomAddress(prev => ({ ...prev, barangay: "" }));
            } catch (error) {
                console.error("Error fetching barangays:", error);
            }
        };
        fetchBarangays();
    }, [customAddress.city]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const payload = {
            ...(useProfileAddress ? profileAddress : customAddress),
            delivery_date: deliveryDate,
            delivery_time: deliveryTime,
            notes,
        };

        try {
            const res = await authFetch(`${BASEURL}/api/orders/create/`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setMessage("Sweet! Order submitted for review! 🎂");
                clearCart();
                const orderId = data.order_id;
                setTimeout(() => {
                    navigate(`/orders/${orderId}`);
                }, 2000);
            } else {
                setMessage(data.error || "Failed to place order.");
            }
        } catch (err) {
            setMessage("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fffdf9] text-stone-800 antialiased py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
            <div className="max-w-3xl w-full mx-auto">
                <form onSubmit={handleSubmit} className="bg-white border border-[#f3e1c6] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
                    
                    <header className="text-center pb-4 border-b border-stone-100">
                        <h1 className="text-3xl font-black text-[#844414] tracking-tight">Finalize Your Order</h1>
                        <div className="w-12 h-1 bg-[#d67b27] mx-auto rounded-full mt-3" />
                    </header>

                    {/* Delivery Address Section */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#844414] flex items-center gap-2">
                            <span>📍</span> Delivery Address
                        </h2>

                        <div className="space-y-3">
                            {/* Saved Address Selection */}
                            <label className={`flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${
                                useProfileAddress 
                                    ? "border-[#d67b27] bg-[#fdf2e2]/40" 
                                    : "border-stone-200 hover:border-stone-300"
                            }`}>
                                <input
                                    type="radio"
                                    checked={useProfileAddress}
                                    onChange={() => setUseProfileAddress(true)}
                                    className="mt-1 accent-[#d67b27]"
                                />
                                <div className="flex-1 text-sm">
                                    <span className="font-bold text-stone-800 block mb-2">Use Saved Profile Address</span>
                                    
                                    {useProfileAddress && (
                                        <div className="bg-white border border-[#fdf2e2] rounded-xl p-3 mt-1 space-y-1 shadow-inner text-stone-600">
                                            <strong className="text-[#844414]">{profileAddress.full_name}</strong>
                                            <p>{profileAddress.street}, {profileAddress.barangay}, {profileAddress.city}, {profileAddress.province}, {profileAddress.region}</p>
                                            <p className="font-medium">{profileAddress.postal_code}</p>
                                            <p className="text-xs font-bold text-[#d67b27] mt-1">📞 {profileAddress.phone}</p>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* Custom Address Selection */}
                            <label className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${
                                !useProfileAddress 
                                    ? "border-[#d67b27] bg-[#fdf2e2]/40" 
                                    : "border-stone-200 hover:border-stone-300"
                            }`}>
                                <input
                                    type="radio"
                                    checked={!useProfileAddress}
                                    onChange={() => setUseProfileAddress(false)}
                                    className="accent-[#d67b27]"
                                />
                                <span className="text-sm font-bold text-stone-800">Deliver to a New Address</span>
                            </label>
                        </div>

                        {/* Custom Address Input Dropdowns */}
                        {!useProfileAddress && (
                            <div className="p-5 bg-[#fffdf9] border border-[#f3e1c6] rounded-2xl space-y-4 animate-fadeIn">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Street Address *</label>
                                    <input
                                        type="text"
                                        placeholder="House No., Street Name, Phase/Block"
                                        value={customAddress.street}
                                        onChange={(e) => setCustomAddress({ ...customAddress, street: e.target.value })}
                                        required={!useProfileAddress}
                                        className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Region *</label>
                                        <select 
                                            value={customAddress.region} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, region: e.target.value })}
                                            disabled={regionList.length === 0}
                                            required={!useProfileAddress}
                                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-3 py-2.5 text-sm outline-none transition-all disabled:bg-stone-50"
                                        >
                                            <option value="">Select Region</option>
                                            {regionList.map(reg => (
                                                <option key={reg.code} value={reg.code}>{reg.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Province *</label>
                                        <select 
                                            value={customAddress.province} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, province: e.target.value })}
                                            disabled={!customAddress.region || provinceList.length === 0}
                                            required={!useProfileAddress}
                                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-3 py-2.5 text-sm outline-none transition-all disabled:bg-stone-100 disabled:text-stone-400"
                                        >
                                            <option value="">Select Province</option>
                                            {provinceList.map(prov => (
                                                <option key={prov.code} value={prov.code}>{prov.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">City/Municipality *</label>
                                        <select 
                                            value={customAddress.city} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, city: e.target.value })}
                                            disabled={!customAddress.province || cityList.length === 0}
                                            required={!useProfileAddress}
                                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-3 py-2.5 text-sm outline-none transition-all disabled:bg-stone-100 disabled:text-stone-400"
                                        >
                                            <option value="">Select City</option>
                                            {cityList.map(city => (
                                                <option key={city.code} value={city.code}>{city.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Barangay *</label>
                                        <select 
                                            value={customAddress.barangay} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, barangay: e.target.value })}
                                            disabled={!customAddress.city || barangayList.length === 0}
                                            required={!useProfileAddress}
                                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-3 py-2.5 text-sm outline-none transition-all disabled:bg-stone-100 disabled:text-stone-400"
                                        >
                                            <option value="">Select Barangay</option>
                                            {barangayList.map(bgy => (
                                                <option key={bgy.code} value={bgy.code}>{bgy.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Postal Code *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 4102"
                                        value={customAddress.postal_code}
                                        onChange={(e) => setCustomAddress({ ...customAddress, postal_code: e.target.value })}
                                        required={!useProfileAddress}
                                        className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Schedule Section */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#844414] flex items-center gap-2">
                            <span>⏰</span> Schedule Delivery
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Date *</label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    required
                                    className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Preferred Time *</label>
                                <input
                                    type="time"
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                    required
                                    className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Notes Section */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-[#844414] flex items-center gap-2">
                            <span>📝</span> Special Instructions
                        </h2>
                        <textarea
                            placeholder="Add a message for the baker or delivery rider..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm outline-none transition-all resize-none"
                        />
                    </section>

                    {/* Form Submit Button */}
                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-[#d67b27] hover:bg-[#b56219] disabled:bg-stone-300 text-white font-black py-4 px-6 rounded-full transition-colors duration-200 text-sm uppercase tracking-wider shadow-sm text-center cursor-pointer disabled:cursor-not-allowed"
                        >
                            {loading ? "Sending Order..." : "Confirm & Place Order"}
                        </button>
                    </div>

                    {/* Status Feedback Message Handling */}
                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-bold text-center border transition-all ${
                            message.includes("Sweet") 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                : "bg-rose-50 border-rose-200 text-rose-700"
                        }`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default CheckoutPage;