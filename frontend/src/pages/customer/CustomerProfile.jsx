import { useEffect, useState } from "react";
import { authFetch } from "../../utils/auth";
import { Link } from "react-router-dom";
import "./CustomerProfile.css"; // Create this file

function CustomerProfile() {
    const [profile, setProfile] = useState(null);
    const [msg, setMsg] = useState("");
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await authFetch(`${BASE}/api/profile/`, { method: "GET" });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                } else {
                    setMsg("Failed to load profile");
                }
            } catch (err) {
                console.error(err);
                setMsg("Error fetching profile");
            }
        };
        fetchProfile();
    }, [BASE]);

    if (!profile) {
        return (
            <div className="profile-loading">
                <div className="spinner"></div>
                <p>Opening your profile...</p>
            </div>
        );
    }

    return (
        <div className="profile-page-wrapper">
            <div className="container">
                <div className="profile-header-card">
                    <div className="profile-avatar-section">
                        <div className="avatar-wrapper">
                            {profile.profile_picture ? (
                                <img src={`${BASE}${profile.profile_picture}`} alt="Profile" className="avatar-img" />
                            ) : (
                                <span className="avatar-initial">{profile.user.username[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="profile-name-info">
                            <h2>{profile.user.first_name} {profile.middle_name ? profile.middle_name + " " : ""}{profile.user.last_name}</h2>
                            <p className="email-tag">{profile.user.email}</p>
                            <span className="customer-badge">Loyal Customer</span>
                        </div>
                    </div>

                    <div className="profile-content-grid">
                        {/* Contact Info */}
                        <div className="info-box">
                            <h3 className="info-label">📞 Contact Details</h3>
                            <p>{profile.phone || "No phone number added"}</p>
                        </div>

                        {/* Address Info */}
                        <div className="info-box">
                            <h3 className="info-label">🏠 Default Delivery Address</h3>
                            <p className="address-text">
                                {profile.street ? (
                                    <>
                                        {profile.street}<br />
                                        {profile.city}, {profile.province} {profile.postal_code}
                                    </>
                                ) : (
                                    "No address set"
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="profile-footer">
                        <Link to="/profile/edit" className="btn-main edit-profile-btn">
                            Edit Profile Settings
                        </Link>
                        {msg && <p className="error-msg">{msg}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CustomerProfile;