import { useState, useEffect } from "react";
import { authFetch } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

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
    }, []);

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
            setMsg(JSON.stringify(data));
        }
    };

    return (
        <div className="min-h-screen flex justify-center p-6 mt-20">
            <div className="max-w-2xl w-full bg-white rounded shadow p-6">

                <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Profile Photo */}
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
                            {preview ? (
                                <img src={preview} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-600 text-xl">Photo</span>
                            )}
                        </div>

                        <input
                            type="file"
                            name="profile_picture"
                            onChange={handleChange}
                            className="text-sm"
                        />
                    </div>

                    {/* Personal Info */}
                    <div>
                        <h3 className="font-semibold mb-3">Personal Information</h3>

                        <div className="grid grid-cols-3 gap-3">
                            <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First Name" className="border p-2 rounded" />
                            <input name="middle_name" value={form.middle_name} onChange={handleChange} placeholder="Middle Name" className="border p-2 rounded" />
                            <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last Name" className="border p-2 rounded" />
                        </div>

                        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border p-2 rounded w-full mt-3" />
                        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="border p-2 rounded w-full mt-3" />
                    </div>

                    {/* Address */}
                    <div>
                        <h3 className="font-semibold mb-3">Address</h3>

                        <input name="street" value={form.street} onChange={handleChange} placeholder="Street Address" className="border p-2 rounded w-full mb-3" />

                        <div className="grid grid-cols-3 gap-3">
                            <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="border p-2 rounded" />
                            <input name="province" value={form.province} onChange={handleChange} placeholder="Province" className="border p-2 rounded" />
                            <input name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="Postal Code" className="border p-2 rounded" />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate("/profile")}
                            className="px-4 py-2 border rounded"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Save Changes
                        </button>
                    </div>

                    {msg && <p className="text-red-500 text-sm">{msg}</p>}
                </form>
            </div>
        </div>
    );
}

export default CustomerProfileUpdate;