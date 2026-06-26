// src/pages/LandingPage.jsx | DO NOT REMOVE THIS
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
            
            {/* Hero Section */}
            <section className="hero-video-wrapper">
                <video autoPlay loop muted playsInline className="hero-video-bg">
                    <source src="https://res.cloudinary.com/dybbeqxrm/video/upload/q_auto/f_auto/v1776255867/hero-cake-video1_kkddin.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay"></div>
                <div className="container hero-text">
                    <div data-aos="fade-up">
                        <span className="mini-badge">🎂 Handmade in Cavite</span>
                        <h1>Sweetest <span className="brand-highlight">Smiles</span> In Every Box</h1>
                        <p className="hero-description">
                            Artisanal bento cakes handcrafted daily with love. Experience the fun of designing your dream bento in 3D!
                        </p>
                        <div className="cta-row">
                            <button className="btn-main" onClick={() => navigate('/build')}>Customize 3D</button>
                            <button className="btn-ghost" onClick={() => navigate('/products')}>View Menu</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Menu Section */}
            <section className="section-white">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">Menu</span>
                        <h2>Exclusive Cakes</h2>
                    </div>
                    <div className="grid-3">
                        {cakeItems.map((cake, i) => (
                            <div key={cake.id} className="item-card" data-aos="zoom-in" data-aos-delay={i * 100}>
                                <div className="card-img-wrapper">
                                    <img src={cake.img} alt={cake.name} className="cake-thumb" />
                                </div>
                                <div className="item-content">
                                    <div className="item-card-header">
                                        <h4>{cake.name}</h4>
                                        <span className="item-price">{cake.price}</span>
                                    </div>
                                    <button className="btn-buy">Add to Bag</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process / Steps Section */}
            <section className="section-warm">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">Process</span>
                        <h2>Experience the Magic</h2>
                    </div>
                    <div className="steps-flex">
                        <div className="step-card" data-aos="fade-up">
                            <div className="step-icon-wrapper"><span className="step-number">01</span></div>
                            <h4 className="step-title">Design in 3D</h4>
                            <p className="step-description">Pick your colors and flavors in our interactive builder.</p>
                        </div>
                        <div className="step-card" data-aos="fade-up" data-aos-delay="200">
                            <div className="step-icon-wrapper"><span className="step-number">02</span></div>
                            <h4 className="step-title">Handcrafted</h4>
                            <p className="step-description">Our bakers in Cavite bake your unique design fresh.</p>
                        </div>
                        <div className="step-card" data-aos="fade-up" data-aos-delay="400">
                            <div className="step-icon-wrapper"><span className="step-number">03</span></div>
                            <h4 className="step-title">Fresh Delivery</h4>
                            <p className="step-description">Delivered straight to your door, ready for smiles!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="section-white">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">Testimonials</span>
                        <h2>What our customers say</h2>
                    </div>

                    <div className="review-grid">
                        <div className="review-pill" data-aos="fade-up">
                            <div className="review-header">
                                <img
                                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150"
                                    alt="Maria"
                                    className="profile-img"
                                />
                                <div className="reviewer-info">
                                    <h4>Maria K.</h4>
                                    <span className="reviewer-tag">Verified Baker</span>
                                </div>
                            </div>
                            <p>"The 3D builder is so fun! I designed a cake for my daughter's birthday exactly how it looked on screen. The Ube flavor is to die for!"</p>
                        </div>

                        <div className="review-pill" data-aos="fade-up" data-aos-delay="200">
                            <div className="review-header">
                                <img
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150"
                                    alt="Jason"
                                    className="profile-img"
                                />
                                <div className="reviewer-info">
                                    <h4>Jason D.</h4>
                                    <span className="reviewer-tag">Sweet Tooth</span>
                                </div>
                            </div>
                            <p>"Best bento cakes in Cavite. I love that it's not overly sweet. The Mango Graham is my absolute favorite for weekend treats."</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="section-warm">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">FAQ</span>
                        <h2>Common Inquiries</h2>
                    </div>
                    <div className="faq-container">
                        <div className="faq-item" data-aos="fade-right">
                            <h4 className="brand-highlight">How long does delivery take?</h4>
                            <p className="faq-answer">We usually deliver within 24-48 hours within Cavite.</p>
                        </div>
                        <div className="faq-item" data-aos="fade-left">
                            <h4 className="brand-highlight">Can I customize colors?</h4>
                            <p className="faq-answer">Yes! Our 3D builder allows full color customization.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="footer-wrap">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-column">
                            <div className="footer-brand-title">
                                🍰 SMILEY PAGE <span className="brand-highlight">CORNER</span>
                            </div>
                            <p className="footer-description-text">
                                Your favorite artisan bento cake shop in Cavite. We specialize in making your celebrations extra sweet with 3D-customized designs and premium local flavors.
                            </p>
                            <div className="footer-socials">
                                <span className="social-link">FB</span>
                                <span className="social-link">IG</span>
                                <span className="social-link">TT</span>
                            </div>
                        </div>

                        <div className="footer-column">
                            <h4 className="footer-header">Shop Info</h4>
                            <ul className="footer-list">
                                <li onClick={() => navigate('/products')}>Our Menu</li>
                                <li onClick={() => navigate('/build')}>3D Cake Builder</li>
                                <li>Bulk Orders</li>
                                <li>Track Order</li>
                            </ul>
                        </div>

                        <div className="footer-column">
                            <h4 className="footer-header">Visit Us</h4>
                            <p className="footer-contact-item">📍 Bacoor, Cavite, Philippines</p>
                            <p className="footer-contact-item">📞 +63 912 345 6789</p>
                            <p className="footer-contact-item">✉️ hello@smileypage.com</p>
                        </div>

                        <div className="footer-column">
                            <h4 className="footer-header">Sweet Updates</h4>
                            <p className="newsletter-text">
                                Get notified about our monthly special flavors and promos!
                            </p>
                            <form className="newsletter-form">
                                <input
                                    type="email"
                                    placeholder="Your email..."
                                    className="newsletter-input"
                                />
                                <button type="submit" className="btn-subscribe">→</button>
                            </form>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>© 2026 Smiley Page Corner. All rights reserved.</p>
                        <div className="footer-legal-links">
                            <span>Privacy Policy</span>
                            <span>Terms of Service</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;