// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";

function Signup() {
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState("");
    const [form, setForm] = useState({
        username: "",
        phone: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        password: "",
        password2: ""
    });
    const [msg, setMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const nav = useNavigate();

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const sendOtp = async () => {
        setMsg("");
        setIsLoading(true);

        try {
            const res = await fetch(`${BASE}/api/send-code/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: form.phone })
            });

            const data = await res.json();

            if (res.ok) {
                setMsg("OTP sent to your phone");
                setStep(2);
            } else {
                setMsg(data.error || "Failed to send OTP");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        setIsLoading(true);

        try {
            const res = await fetch(`${BASE}/api/verify-code/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: form.phone,
                    code: otp
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMsg("Phone verified!");
                setStep(3);
            } else {
                setMsg(data.error || "Invalid OTP");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();

        if (step !== 3) return;

        setIsLoading(true);

        try {
            const res = await fetch(`${BASE}/api/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                setMsg("Account created! Redirecting...");
                setTimeout(() => nav("/login"), 1500);
            } else {
                setMsg(data.error || "Registration failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="signup-page-wrapper">
            <div className="signup-box">
                <div className="signup-header">
                    <span className="brand-emoji">✨</span>
                    <h2>Join the Bakery</h2>
                    <p>Create an account to start designing your own cakes.</p>
                </div>

                <form onSubmit={handleSubmit} className="signup-form">
                    <div className="input-group">
                        <label>Username</label>
                        <input name="username" onChange={handleChange} value={form.username} placeholder="Username" required />
                    </div>

                    <div className="input-group">
                        <label>Phone Number</label>
                        <input
                            name="phone"
                            type="tel"
                            onChange={handleChange}
                            value={form.phone}
                            placeholder="09XXXXXXXXX"
                            required
                        />
                    </div>

                    {/* Name Grid */}
                    <div className="name-grid">
                        <div className="input-group">
                            <label>First Name</label>
                            <input name="first_name" onChange={handleChange} value={form.first_name} placeholder="First" required />
                        </div>
                        <div className="input-group">
                            <label>M.I.</label>
                            <input name="middle_name" onChange={handleChange} value={form.middle_name} placeholder="N/A" />
                        </div>
                        <div className="input-group">
                            <label>Last Name</label>
                            <input name="last_name" onChange={handleChange} value={form.last_name} placeholder="Last" required />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input name="password" type="password" onChange={handleChange} value={form.password} placeholder="••••••••" required />
                    </div>

                    <div className="input-group">
                        <label>Confirm Password</label>
                        <input name="password2" type="password" onChange={handleChange} value={form.password2} placeholder="••••••••" required />
                    </div>

                    {step === 1 && (
                        <button type="button" onClick={sendOtp} className="btn-signup">
                            Send OTP
                        </button>
                    )}

                    {step === 2 && (
                        <>
                            <div className="input-group">
                                <label>OTP Code</label>
                                <input
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    placeholder="Enter OTP"
                                />
                            </div>

                            <button type="button" onClick={verifyOtp} className="btn-signup">
                                Verify OTP
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <button type="submit" className="btn-signup">
                            Create Account
                        </button>
                    )}
                </form>

                {msg && (
                    <div className={`form-alert ${msg.includes('✅') ? 'success' : 'error'}`}>
                        {msg}
                    </div>
                )}

                <div className="signup-footer">
                    Already have an account? <Link to="/login" className="login-link">Log in</Link>
                </div>
            </div>
        </div>
    );
}

export default Signup;