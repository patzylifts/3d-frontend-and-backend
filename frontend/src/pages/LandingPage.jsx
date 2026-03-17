import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./LandingPage.css";

// Seeded particle list so it's stable
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 4 + (i * 7) % 14,
    left: `${(i * 53 + 7) % 100}%`,
    duration: `${8 + (i * 3) % 10}s`,
    delay: `${(i * 1.3) % 8}s`,
    bottom: `${(i * 17) % 60}%`,
}));

function LandingPage() {
    const navigate = useNavigate();

    return (
        <>
            <Navbar />

            <div className="landing-root">

                <header className="landing-header">
                    <h1 className="landing-title">
                        What are you<br />
                        <span>craving today?</span>
                    </h1>

                    <p className="landing-sub">
                        Design your cake in 3D or browse ready made cakes.
                    </p>
                </header>

                <div className="landing-cards">

                    <div
                        className="choice-card"
                        onClick={() => navigate("/build")}
                    >
                        <div className="card-icon">🎂</div>

                        <h2 className="card-title">
                            Customize Cake
                        </h2>

                        <p className="card-desc">
                            Build your own cake using the 3D configurator.
                        </p>

                        <button className="card-btn">
                            Start
                        </button>
                    </div>

                    <div
                        className="choice-card"
                        onClick={() => navigate("/products")}
                    >
                        <div className="card-icon">🛍️</div>

                        <h2 className="card-title">
                            Shop Cakes
                        </h2>

                        <p className="card-desc">
                            Browse cakes and order instantly.
                        </p>

                        <button className="card-btn secondary">
                            Browse
                        </button>
                    </div>

                </div>

                <p className="landing-footer">
                    Smiley Page Corner
                </p>

            </div>
        </>
    );
}

export default LandingPage;
