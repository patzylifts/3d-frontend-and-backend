import { useState, useEffect } from "react";
import { authFetch } from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import "./CustomerProfileUpdate.css"; // Create this file

function CustomerProfileUpdate() {
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();

    const [form, setForm] = useState({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        phone: "",
        street: "",
        city: "",
        province: "",
        postal_code: "",
        profile_picture: null
    });

    const [preview, setPreview] = useState(null);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await authFetch(`${BASE}/api/profile/`);
            const data = await res.json();

            setForm({
                first_name: data.user.first_name || "",
                middle_name: data.middle_name || "",
                last_name: data.user.last_name || "",
                email: data.user.email || "",
                phone: data.phone || "",
                street: data.street || "",
                city: data.city || "",
                province: data.province || "",
                postal_code: data.postal_code || "",
                profile_picture: null
            });

            if (data.profile_picture) {
                setPreview(`${BASE}${data.profile_picture}`);
            }
        };
        fetchProfile();
    }, [BASE]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setForm({ ...form, [name]: files[0] });
            setPreview(URL.createObjectURL(files[0]));
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        const formData = new FormData();
        for (const key in form) {
            if (form[key] !== null) {
                formData.append(key, form[key]);
            }
        }

        const res = await authFetch(`${BASE}/api/profile/`, {
            method: "PUT",
            body: formData
        });

        if (res.ok) {
            navigate("/profile");
        } else {
            const data = await res.json();
            setMsg(data.detail || "Update failed. Please check your info.");
        }
    };

    return (
        <div className="update-profile-wrapper">
            <div className="container">
                <div className="update-card">
                    <h2 className="update-title">Edit Your Profile</h2>
                    
                    <form onSubmit={handleSubmit} className="update-form">
                        {/* Profile Photo Section */}
                        <div className="photo-upload-container">
                            <div className="photo-preview-circle">
                                {preview ? (
                                    <img src={preview} alt="Preview" />
                                ) : (
                                    <span className="photo-placeholder">👤</span>
                                )}
                            </div>
                            <div className="upload-btn-wrapper">
                                <label htmlFor="profile_picture" className="btn-secondary-small">
                                    Change Photo
                                </label>
                                <input
                                    id="profile_picture"
                                    type="file"
                                    name="profile_picture"
                                    onChange={handleChange}
                                    className="hidden-file-input"
                                />
                                <p className="upload-hint">JPG or PNG, max 2MB</p>
                            </div>
                        </div>

                        {/* Personal Info Section */}
                        <div className="form-section">
                            <h3 className="section-label">Personal Information</h3>
                            <div className="input-row three-col">
                                <div className="field">
                                    <label>First Name</label>
                                    <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First Name" required />
                                </div>
                                <div className="field">
                                    <label>Middle Name</label>
                                    <input name="middle_name" value={form.middle_name} onChange={handleChange} placeholder="Optional" />
                                </div>
                                <div className="field">
                                    <label>Last Name</label>
                                    <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last Name" required />
                                </div>
                            </div>
                            <div className="input-row two-col">
                                <div className="field">
                                    <label>Email Address</label>
                                    <input name="email" value={form.email} onChange={handleChange} placeholder="Email" required />
                                </div>
                                <div className="field">
                                    <label>Phone Number</label>
                                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="09XX XXX XXXX" required />
                                </div>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="form-section">
                            <h3 className="section-label">Default Shipping Address</h3>
                            <div className="field">
                                <label>Street Address</label>
                                <input name="street" value={form.street} onChange={handleChange} placeholder="Building, Street, Brgy" />
                            </div>
                            <div className="input-row three-col mt-10">
                                <div className="field">
                                    <label>City</label>
                                    <input name="city" value={form.city} onChange={handleChange} placeholder="City" />
                                </div>
                                <div className="field">
                                    <label>Province</label>
                                    <input name="province" value={form.province} onChange={handleChange} placeholder="Province" />
                                </div>
                                <div className="field">
                                    <label>Postal Code</label>
                                    <input name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="XXXX" />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="form-actions">
                            <button type="button" onClick={() => navigate("/profile")} className="btn-text">
                                Cancel
                            </button>
                            <button type="submit" className="btn-main save-btn">
                                Save Changes
                            </button>
                        </div>
                        {msg && <p className="error-banner">{msg}</p>}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CustomerProfileUpdate;