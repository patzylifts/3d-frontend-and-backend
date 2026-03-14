import { useEffect, useState } from "react";
import { authFetch } from "../../utils/auth";
import { Link } from "react-router-dom";

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
    }, []);

    if (!profile) {
        return <div className="min-h-screen flex items-center justify-center mt-20">Loading...</div>;
    }

    return (
        <div className="min-h-screen flex justify-center p-6 mt-20">
            <div className="max-w-2xl w-full bg-white rounded shadow p-6">
                <div className="flex items-center gap-6 mb-6">
                    {/* Profile picture */}
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                        {profile.profile_picture ? (
                            <img src={`${BASE}${profile.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-gray-600 text-xl font-bold">{profile.user.username[0].toUpperCase()}</span>
                        )}
                    </div>

                    {/* User name */}
                    <div>
                        <h2 className="text-2xl font-bold">{profile.user.first_name} {profile.middle_name ? profile.middle_name + " " : ""}{profile.user.last_name}</h2>
                        <p className="text-gray-600">{profile.user.email}</p>
                        <p className="text-gray-600">{profile.phone || "No phone number"}</p>
                    </div>
                </div>

                {/* Address */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Address</h3>
                    <p>{profile.street || "-"}</p>
                    <p>{profile.city || "-"}, {profile.province || "-"} {profile.postal_code || "-"}</p>
                </div>

                {/* Update button */}
                <Link
                    to="/profile/edit"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Update Profile
                </Link>

                {msg && <p className="mt-3 text-sm text-red-500">{msg}</p>}
            </div>
        </div>
    );
}

export default CustomerProfile;