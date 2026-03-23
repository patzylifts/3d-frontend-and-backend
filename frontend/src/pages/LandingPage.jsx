import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./LandingPage.css";

const EXCLUSIVE_CAKES = [
    {
        id: 1,
        title: "Ube Macapuno Bento",
        price: "₱350",
        image: "https://images.unsplash.com/photo-1612201142855-7873bc1661b4?q=80&w=400&auto=format&fit=crop", 
        desc: "Authentic purple yam sponge layered with sweet coconut sport strings.",
    },
    {
        id: 2,
        title: "Pink Heart Retro Bento",
        price: "₱380",
        
        image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=400&auto=format&fit=crop",
        desc: "Classic vanilla bento with detailed retro pink piping and white ribbons.",
    },
    {
        id: 3,
        title: "Mango Graham Bento",
        price: "₱350",
        image: "https://images.unsplash.com/photo-1557925923-33b27f891f88?q=80&w=400&auto=format&fit=crop",
        desc: "Sweet local mangoes layered with crushed grahams and whipped cream.",
    },
];

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="page-wrapper">
            <Navbar />

        
            <section className="modern-hero">
                <div className="hero-content">
                    <h1 className="hero-title">Sweetest Smiles In Every Box</h1>
                    <p className="hero-text">
                        Artisanal bento cakes handcrafted daily with love in Cavite. Experience the fun of designing your dream bento in 3D!
                    </p>
                    <div className="hero-btn-group">
                        <button className="btn-primary" onClick={() => navigate("/products")}>
                            Shop Now
                        </button>
                        <button className="btn-secondary" onClick={() => navigate("/build")}>
                            Customize 3D
                        </button>
                    </div>
                </div>

                <div className="hero-image-container">
                    <div className="curved-mask">
                        {/* 🌟 🟢 IMAGE 1 (image_8.png placeholder) */}
                        <img 
                            src="https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=800&auto=format&fit=crop" 
                            alt="Detailed retro heart bento cake piping" 
                            className="hero-img"
                        />
                    </div>
                    
                    {/* 🌟 🟢 IMAGE 2 (image_9.png placeholder) */}
                    <div className="oval-mask-container">
                        <img 
                            src="https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=300&auto=format&fit=crop" 
                            alt="Full view of retro heart bento cake" 
                            className="floating-tart"
                        />
                    </div>
                </div>
            </section>

            {/* 🍰 2. EXCLUSIVE PRODUCTS CAROUSEL */}
            <section className="products-carousel-section">
                <span className="section-subtitle">Most Popular</span>
                <h2 className="section-title">Our Exclusive Cakes</h2>

                <div className="carousel-grid">
                    {EXCLUSIVE_CAKES.map((cake) => (
                        <div key={cake.id} className="modern-product-card">
                            <div className="modern-img-wrap">
                                <img src={cake.image} alt={cake.title} className="modern-product-img" />
                            </div>
                            <div className="modern-product-info">
                                <h3 className="modern-title">{cake.title}</h3>
                                <p className="modern-desc">{cake.desc}</p>
                                <span className="modern-price">{cake.price}</span>
                                <button className="modern-buy-btn" onClick={() => navigate("/products")}>
                                    Order Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 🚚 3. PERKS SHOP BAR */}
            <section className="perks-bar">
                <div className="perk-item">
                    <span className="perk-icon">🚚</span>
                    <div>
                        <h4>Fast Delivery</h4>
                        <p>Straight to Cavite/Metro Manila</p>
                    </div>
                </div>
                <div className="perk-item">
                    <span className="perk-icon">👩‍🍳</span>
                    <div>
                        <h4>Freshly Baked</h4>
                        <p>Made daily with love</p>
                    </div>
                </div>
                <div className="perk-item">
                    <span className="perk-icon">🔒</span>
                    <div>
                        <h4>Secure Payment</h4>
                        <p>GCash, Maya, & Bank Transfers</p>
                    </div>
                </div>
            </section>

            {/* 🦶 4. MULTI-COLUMN FOOTER */}
            <footer className="ecommerce-footer">
                <div className="footer-grid">
                    <div className="footer-brand-col">
                        <h3 className="footer-logo">🍰 Smiley Page Corner</h3>
                        <p>Bringing sweet smiles through personalized bento cakes and premium pastries.</p>
                        <div className="footer-socials">
                            <button className="social-btn">FB</button>
                            <button className="social-btn">IG</button>
                        </div>
                    </div>

                    <div className="footer-links-col">
                        <h4>Quick Links</h4>
                        <ul>
                            <li onClick={() => navigate("/")}>Home</li>
                            <li onClick={() => navigate("/products")}>Shop Cakes</li>
                            <li onClick={() => navigate("/build")}>3D Builder</li>
                        </ul>
                    </div>

                    <div className="footer-links-col">
                        <h4>Customer Care</h4>
                        <ul>
                            <li>FAQs</li>
                            <li>Shipping Policy</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 Smiley Page Corner. All rights reserved.</p>
                    <div className="payment-badges">
                        <span>💳 GCash</span>
                        <span>💳 Maya</span>
                        <span>💳 COD</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;