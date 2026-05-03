import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { authFetch } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { regions, provinces, cities, barangays } from "phil-address";
import "./CheckoutPage.css"; // Ensure this import is here

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
        <div className="checkout-page-wrapper">
            <div className="container">
                <form onSubmit={handleSubmit} className="checkout-form-card">
                    <h1 className="checkout-title">Finalize Your Order</h1>

                    {/* Delivery Address Section */}
                    <div className="checkout-section">
                        <h2 className="section-heading">📍 Delivery Address</h2>

                        <div className="radio-group">
                            <label className={`radio-label ${useProfileAddress ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    checked={useProfileAddress}
                                    onChange={() => setUseProfileAddress(true)}
                                />
                                <span>Use Saved Profile Address</span>
                            </label>

                            <div className={`address-preview ${useProfileAddress ? "visible" : "hidden"}`}>
                                <strong>{profileAddress.full_name}</strong>
                                <p>{profileAddress.street}, {profileAddress.barangay}, {profileAddress.city}, {profileAddress.province}, {profileAddress.region}</p>
                                <p>{profileAddress.postal_code}</p>
                                <p className="phone-text">📞 {profileAddress.phone}</p>
                            </div>

                            <label className={`radio-label ${!useProfileAddress ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    checked={!useProfileAddress}
                                    onChange={() => setUseProfileAddress(false)}
                                />
                                <span>Deliver to a New Address</span>
                            </label>
                        </div>

                        {!useProfileAddress && (
                            <div className="custom-address-inputs">
                                <input
                                    type="text"
                                    placeholder="Street Address"
                                    value={customAddress.street}
                                    onChange={(e) => setCustomAddress({ ...customAddress, street: e.target.value })}
                                    required={!useProfileAddress}
                                />
                                <div className="input-grid four-col">
                                    <div className="field-group">
                                        <label>Region *</label>
                                        <select 
                                            value={customAddress.region} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, region: e.target.value })}
                                            disabled={regionList.length === 0}
                                            required={!useProfileAddress}
                                        >
                                            <option value="">Select Region</option>
                                            {regionList.map(reg => (
                                                <option key={reg.code} value={reg.code}>
                                                    {reg.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field-group">
                                        <label>Province *</label>
                                        <select 
                                            value={customAddress.province} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, province: e.target.value })}
                                            disabled={!customAddress.region || provinceList.length === 0}
                                            required={!useProfileAddress}
                                        >
                                            <option value="">Select Province</option>
                                            {provinceList.map(prov => (
                                                <option key={prov.code} value={prov.code}>
                                                    {prov.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field-group">
                                        <label>City/Municipality *</label>
                                        <select 
                                            value={customAddress.city} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, city: e.target.value })}
                                            disabled={!customAddress.province || cityList.length === 0}
                                            required={!useProfileAddress}
                                        >
                                            <option value="">Select City</option>
                                            {cityList.map(city => (
                                                <option key={city.code} value={city.code}>
                                                    {city.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field-group">
                                        <label>Barangay *</label>
                                        <select 
                                            value={customAddress.barangay} 
                                            onChange={(e) => setCustomAddress({ ...customAddress, barangay: e.target.value })}
                                            disabled={!customAddress.city || barangayList.length === 0}
                                            required={!useProfileAddress}
                                        >
                                            <option value="">Select Barangay</option>
                                            {barangayList.map(bgy => (
                                                <option key={bgy.code} value={bgy.code}>
                                                    {bgy.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Postal Code"
                                    value={customAddress.postal_code}
                                    onChange={(e) => setCustomAddress({ ...customAddress, postal_code: e.target.value })}
                                    required={!useProfileAddress}
                                />
                            </div>
                        )}
                    </div>

                    {/* Schedule Section */}
                    <div className="checkout-section">
                        <h2 className="section-heading">⏰ Schedule Delivery</h2>
                        <div className="input-grid">
                            <div className="field-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="field-group">
                                <label>Preferred Time</label>
                                <input
                                    type="time"
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="checkout-section">
                        <h2 className="section-heading">📝 Special Instructions</h2>
                        <textarea
                            placeholder="Add a message for the baker or delivery rider..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <button type="submit" disabled={loading} className="btn-main checkout-submit-btn">
                        {loading ? "Sending Order..." : "Confirm & Place Order"}
                    </button>

                    {message && (
                        <div className={`status-msg ${message.includes("Sweet") ? "success" : "error"}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default CheckoutPage;