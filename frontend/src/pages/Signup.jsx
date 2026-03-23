import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css"; 

function Signup() {
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
    const [form, setForm] = useState({
        username: "",
        email: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        password: "",
        password2: ""
    });
    const [msg, setMsg] = useState("");
    const nav = useNavigate();

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setMsg("");
        try {
            const res = await fetch(`${BASE}/api/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (res.ok) {
                setMsg("Account created. Redirecting to login...");
                setTimeout(() => nav("/login"), 1200);
            } else {
                // Show first error from the API
                const firstKey = Object.keys(data)[0];
                setMsg(data[firstKey] || JSON.stringify(data));
            }
        } catch (err) {
            console.error(err);
            setMsg("Signup failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white p-6 rounded shadow">
                <h2 className="text-2xl font-bold mb-4">Signup</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input name="username" onChange={handleChange} value={form.username} placeholder="Username" required className="w-full p-2 border rounded" />
                    <input name="email" type="email" onChange={handleChange} value={form.email} placeholder="Email" className="w-full p-2 border rounded" />
                    <input name="first_name" onChange={handleChange} value={form.first_name} placeholder="First Name" required className="w-full p-2 border rounded" />
                    <input name="middle_name" onChange={handleChange} value={form.middle_name} placeholder="Middle Name / M.I." className="w-full p-2 border rounded" />
                    <input name="last_name" onChange={handleChange} value={form.last_name} placeholder="Last Name" required className="w-full p-2 border rounded" />
                    <input name="password" type="password" onChange={handleChange} value={form.password} placeholder="Password" required className="w-full p-2 border rounded" />
                    <input name="password2" type="password" onChange={handleChange} value={form.password2} placeholder="Confirm Password" required className="w-full p-2 border rounded" />
                    <button className="w-full bg-blue-600 text-white py-2 rounded">Create Account</button>
                </form>
                {msg && <p className="mt-3 text-sm">{msg}</p>}
            </div>
        </div>
    );
}

export default Signup;