import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

import Navbar from '../components/Navbar';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        AOS.init({ duration: 1000, once: true, offset: 100 });
    }, []);

    const cakeItems = [
        { id: 1, name: "Ube Macapuno", price: "₱350", img: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?q=80&w=400" },
        { id: 2, name: "Retro Heart", price: "₱380", img: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=400" },
        { id: 3, name: "Mango Graham", price: "₱350", img: "https://images.unsplash.com/photo-1535254973040-607b474cb8c2?q=80&w=400" }
    ];

    return (
        <div className="page-wrapper">
            <Navbar />

            {/* --- HERO SECTION --- */}
            <section className="hero-video-wrapper">
                <video autoPlay loop muted playsInline className="hero-video-bg">
                    <source src="https://res.cloudinary.com/dybbeqxrm/video/upload/q_auto/f_auto/v1776255867/hero-cake-video1_kkddin.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay"></div>
                <div className="container hero-text">
                    <div data-aos="fade-up">
                        <span className="mini-badge">🎂 Handmade in Cavite</span>
                        <h1>Sweetest <span className="pink-text">Smiles</span> In Every Box</h1>
                        <p style={{color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem'}}>
                            Artisanal bento cakes handcrafted daily with love. Experience the fun of designing your dream bento in 3D!
                        </p>
                        <div className="cta-row">
                            <button className="btn-main" onClick={() => navigate('/build')}>Customize 3D</button>
                            <button className="btn-ghost" onClick={() => navigate('/products')}>View Menu</button>
                        </div>
                    </div>
                </div>
            </section>

           {/* --- TESTIMONIALS --- */}
<section className="section-lavender">
    <div className="container">
        <div className="text-center" data-aos="fade-up">
            <span className="label">Testimonials</span>
            <h2>What our customers say</h2>
        </div>
        
        <div className="review-grid">
            {/* Review 1 */}
            <div className="review-pill" data-aos="fade-up">
                <div className="review-header">
                    <img 
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150" 
                        alt="Maria" 
                        className="profile-img" 
                    />
                    <div className="reviewer-info">
                        <h4>Maria K.</h4>
                        <span>Verified Baker</span>
                    </div>
                </div>
                <p>"The 3D builder is so fun! I designed a cake for my daughter's birthday exactly how it looked on screen. The Ube flavor is to die for!"</p>
            </div>

            {/* Review 2 */}
            <div className="review-pill" data-aos="fade-up" data-aos-delay="200">
                <div className="review-header">
                    <img 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150" 
                        alt="Jason" 
                        className="profile-img" 
                    />
                    <div className="reviewer-info">
                        <h4>Jason D.</h4>
                        <span>Sweet Tooth</span>
                    </div>
                </div>
                <p>"Best bento cakes in Cavite. I love that it's not overly sweet. The Mango Graham is my absolute favorite for weekend treats."</p>
            </div>
        </div>
    </div>
</section>

            {/* --- PRODUCTS SECTION --- */}
            <section className="section-white">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">Menu</span>
                        <h2>Exclusive Cakes</h2>
                    </div>
                    <div className="grid-3">
                        {cakeItems.map((cake, i) => (
                            <div key={cake.id} className="item-card" data-aos="zoom-in" data-aos-delay={i * 100}>
                                <img src={cake.img} alt={cake.name} style={{height: '250px', width: '100%', objectFit: 'cover', borderRadius: '12px'}} />
                                <div className="item-content" style={{padding: '20px 0 0 0'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                        <h4>{cake.name}</h4>
                                        <span className="pink-text" style={{fontWeight: '700'}}>{cake.price}</span>
                                    </div>
                                    <button className="btn-buy">Add to Bag</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS (STEP BY STEP) --- */}
            <section className="section-lavender">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">Process</span>
                        <h2>Experience the Magic</h2>
                    </div>
                    <div className="steps-flex">
                        <div className="step-card" data-aos="fade-up">
                            <div className="step-icon-wrapper"><span className="step-number">01</span></div>
                            <h4 style={{marginTop: '20px', textAlign: 'center'}}>Design in 3D</h4>
                            <p style={{textAlign: 'center'}}>Pick your colors and flavors in our interactive builder.</p>
                        </div>
                        <div className="step-card" data-aos="fade-up" data-aos-delay="200">
                            <div className="step-icon-wrapper"><span className="step-number">02</span></div>
                            <h4 style={{marginTop: '20px', textAlign: 'center'}}>Handcrafted</h4>
                            <p style={{textAlign: 'center'}}>Our bakers in Cavite bake your unique design fresh.</p>
                        </div>
                        <div className="step-card" data-aos="fade-up" data-aos-delay="400">
                            <div className="step-icon-wrapper"><span className="step-number">03</span></div>
                            <h4 style={{marginTop: '20px', textAlign: 'center'}}>Fresh Delivery</h4>
                            <p style={{textAlign: 'center'}}>Delivered straight to your door, ready for smiles!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQ SECTION --- */}
            <section className="section-white">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">FAQ</span>
                        <h2>Common Inquiries</h2>
                    </div>
                    <div className="faq-container">
                        <div className="faq-item" data-aos="fade-right">
                            <h4 className="pink-text">How long does delivery take?</h4>
                            <p style={{marginTop: '10px'}}>We usually deliver within 24-48 hours within Cavite.</p>
                        </div>
                        <div className="faq-item" data-aos="fade-left">
                            <h4 className="pink-text">Can I customize colors?</h4>
                            <p style={{marginTop: '10px'}}>Yes! Our 3D builder allows full color customization.</p>
                        </div>
                    </div>
                </div>
            </section>

           {/* --- FOOTER --- */}
<footer className="footer-wrap">
    <div className="container">
        <div className="footer-grid" style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '40px'
        }}>
            {/* Column 1: Brand & About */}
            <div className="footer-column">
                <div style={{fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px'}}>
                    🍰 SMILEY PAGE <span className="pink-text">CORNER</span>
                </div>
                <p style={{color: '#999', lineHeight: '1.6', fontSize: '0.95rem'}}>
                    Your favorite artisan bento cake shop in Cavite. We specialize in making your celebrations extra sweet with 3D-customized designs and premium local flavors.
                </p>
                <div style={{display: 'flex', gap: '15px', marginTop: '20px'}}>
                    {/* Simple Social Placeholders */}
                    <span className="pink-text" style={{cursor: 'pointer', fontWeight: '700'}}>FB</span>
                    <span className="pink-text" style={{cursor: 'pointer', fontWeight: '700'}}>IG</span>
                    <span className="pink-text" style={{cursor: 'pointer', fontWeight: '700'}}>TT</span>
                </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="footer-column">
                <h4 style={{marginBottom: '20px', fontSize: '1.1rem'}}>Shop Info</h4>
                <ul style={{listStyle: 'none', padding: 0, color: '#999', lineHeight: '2'}}>
                    <li style={{cursor: 'pointer'}} onClick={() => navigate('/products')}>Our Menu</li>
                    <li style={{cursor: 'pointer'}} onClick={() => navigate('/build')}>3D Cake Builder</li>
                    <li style={{cursor: 'pointer'}}>Bulk Orders</li>
                    <li style={{cursor: 'pointer'}}>Track Order</li>
                </ul>
            </div>

            {/* Column 3: Contact Details */}
            <div className="footer-column">
                <h4 style={{marginBottom: '20px', fontSize: '1.1rem'}}>Visit Us</h4>
                <p style={{color: '#999', fontSize: '0.95rem', marginBottom: '10px'}}>
                    📍 Bacoor, Cavite, Philippines
                </p>
                <p style={{color: '#999', fontSize: '0.95rem', marginBottom: '10px'}}>
                    📞 +63 912 345 6789
                </p>
                <p style={{color: '#999', fontSize: '0.95rem'}}>
                    ✉️ hello@smileypage.com
                </p>
            </div>

            {/* Column 4: Newsletter */}
            <div className="footer-column">
                <h4 style={{marginBottom: '20px', fontSize: '1.1rem'}}>Sweet Updates</h4>
                <p style={{color: '#999', fontSize: '0.9rem', marginBottom: '15px'}}>
                    Get notified about our monthly special flavors and promos!
                </p>
                <form style={{display: 'flex'}}>
                    <input 
                        type="email" 
                        placeholder="Your email..." 
                        style={{
                            padding: '12px', 
                            borderRadius: '8px 0 0 8px', 
                            border: 'none', 
                            flex: 1,
                            background: '#2a2a2a',
                            color: 'white'
                        }} 
                    />
                    <button type="submit" className="btn-subscribe">→</button>
                </form>
            </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
            borderTop: '1px solid #333', 
            marginTop: '60px', 
            paddingTop: '30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap',
            gap: '15px',
            color: '#666', 
            fontSize: '0.85rem'
        }}>
            <p>© 2026 Smiley Page Corner. All rights reserved.</p>
            <div style={{display: 'flex', gap: '20px'}}>
                <span style={{cursor: 'pointer'}}>Privacy Policy</span>
                <span style={{cursor: 'pointer'}}>Terms of Service</span>
            </div>
        </div>
    </div>
</footer>
        </div>
    );
};

export default LandingPage;