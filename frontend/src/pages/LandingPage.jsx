import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import heroVideo from '../assets/hero-cake-video1.mp4';
import Navbar from '../components/Navbar';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    <video autoPlay loop muted playsInline className="hero-video-bg">
    <source src={heroVideo} type="video/mp4" />
    Your browser does not support the video tag.
</video>

    useEffect(() => {
        AOS.init({ duration: 1000, once: true, offset: 100 });
    }, []);

    const cakeItems = [
        { id: 1, name: "Ube Macapuno", price: "₱350", img: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?q=80&w=400" },
        { id: 2, name: "Retro Heart", price: "₱380", img: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=400" },
        { id: 3, name: "Mango Graham", price: "₱350", img: "https://images.unsplash.com/photo-1535254973040-607b474cb8c2?q=80&w=400&auto=format&fit=crop"}
    ];

    return (
        <div className="page-wrapper">
            <Navbar />

            {/* --- HERO SECTION WITH VIDEO --- */}
<section className="hero-video-wrapper">
    {/* The Video Element */}
   <video autoPlay loop muted playsInline className="hero-video-bg">
        <source src={heroVideo} type="video/mp4" />
    </video>

    {/* The Overlay to make text readable */}
    <div className="video-overlay"></div>

    {/* Your existing Hero Content */}
    <div className="container hero-grid relative-z">
        <div className="hero-text" data-aos="fade-right">
            <span className="mini-badge" style={{color: 'white', borderColor: 'white'}}>🎂 Handmade in Cavite</span>
            <h1 style={{color: 'white'}}>Sweetest <span className="pink-text">Smiles</span> In Every Box</h1>
            <p style={{color: 'white'}}>Artisanal bento cakes handcrafted daily with love. Experience the fun of designing your dream bento in 3D!</p>
            <div className="cta-row">
                <button className="btn-main" onClick={() => navigate('/build')}>Customize 3D</button>
                <button className="btn-ghost" style={{borderColor: 'white', color: 'white'}}>View Menu</button>
            </div>
        </div>
        
        <div className="hero-viz" data-aos="fade-left">
            <div className="viz-frame">
                <img src="https://images.unsplash.com/photo-1535141192574-5d4897c12636?q=80&w=800" alt="Hero Cake" />
            </div>
        </div>
    </div>
</section>

            {/* --- TESTIMONIALS SECTION (Using your .review-grid) --- */}
           {/* --- TESTIMONIALS SECTION --- */}
<section className="section-lavender">
    <div className="container">
        <div className="text-center" data-aos="fade-up">
            <span className="label">Testimonials</span>
            <h2>What our customers say</h2>
        </div>
        <div className="review-grid">
            {/* Customer 1 */}
            <div className="review-pill" data-aos="fade-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden' }}>
                        <img 
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" 
                            alt="Maria K." 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <h4 className="pink-text">- Maria K.</h4>
                </div>
                <p>"The 3D builder is so fun! I designed a cake for my mom's birthday and it arrived exactly how it looked on screen."</p>
            </div>

            {/* Customer 2 */}
            <div className="review-pill" data-aos="fade-up" data-aos-delay="200">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden' }}>
                        <img 
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop" 
                            alt="Jason D." 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <h4 className="pink-text">- Jason D.</h4>
                </div>
                <p>"Best bento cakes in Cavite. The Ube Macapuno is not too sweet, just perfect. Highly recommended!"</p>
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
                                <div className="item-img">
                                    <img src={cake.img} alt={cake.name} />
                                </div>
                                <div className="item-content">
                                    <div className="item-head">
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


{/* --- HOW IT WORKS SECTION --- */}
<section className="section-lavender">
    <div className="container">
        <div className="text-center" data-aos="fade-up">
            <span className="label">Step-by-Step</span>
            <h2>Experience the Magic</h2>
        </div>
        
        <div className="steps-flex">
            {/* Step 1 */}
            <div className="step-card" data-aos="fade-up" data-aos-delay="0">
                <div className="step-icon-wrapper">
                    <span className="step-number">01</span>
                </div>
                <h4>Design in 3D</h4>
                <p>Use our interactive builder to pick your cake colors, flavors, and message. See your creation from every angle!</p>
            </div>

            {/* Step 2 */}
            <div className="step-card" data-aos="fade-up" data-aos-delay="200">
                <div className="step-icon-wrapper">
                    <span className="step-number">02</span>
                </div>
                <h4>Handcrafted Baking</h4>
                <p>Our bakers in Cavite receive your unique design and bake it fresh using premium ingredients.</p>
            </div>

            {/* Step 3 */}
            <div className="step-card" data-aos="fade-up" data-aos-delay="400">
                <div className="step-icon-wrapper">
                    <span className="step-number">03</span>
                </div>
                <h4>Fresh Delivery</h4>
                <p>We carefully package your bento cake and deliver it straight to your door, ready to bring a smile!</p>
            </div>
        </div>
    </div>
</section>



            {/* --- FAQ SECTION (Using your .faq-container) --- */}
            <section className="section-lavender">
                <div className="container">
                    <div className="text-center" data-aos="fade-up">
                        <span className="label">Questions</span>
                        <h2>Common Inquiries</h2>
                    </div>
                    <div className="faq-container">
                        <div className="faq-item" data-aos="fade-right">
                            <h4 className="pink-text">How long does delivery take?</h4>
                            <p style={{marginTop: '10px'}}>We usually deliver within 24-48 hours for standard orders within Cavite.</p>
                        </div>
                        <div className="faq-item" data-aos="fade-left">
                            <h4 className="pink-text">Can I customize the flavor?</h4>
                            <p style={{marginTop: '10px'}}>Yes! Our 3D builder allows you to choose the base, filling, and frosting colors.</p>
                        </div>
                        <div className="faq-item" data-aos="fade-left">
                            <h4 className="pink-text">What are your payment methods?</h4>
                            <p style={{marginTop: '10px'}}>We accept GCash, Maya, and Bank Transfers. Cash on Delivery (COD) is available for select Cavite areas.</p>
                        </div>
                        <div className="faq-item" data-aos="fade-left">
                            <h4 className="pink-text">Do you accept rush orders?</h4>
                            <p style={{marginTop: '10px'}}>We accept rush orders depending on our baking schedule. Please contact us via FB or IG for same-day availability.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="footer-wrap">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-column">
                            <div className="footer-logo">🍰 SMILEY PAGE <span className="pink-text">CORNER</span></div>
                            <p className="footer-desc">Bringing sweet smiles through personalized bento cakes and premium pastries in Cavite.</p>
                            <div className="social-links">
                                <a href="#" className="social-icon">FB</a>
                                <a href="#" className="social-icon">IG</a>
                                <a href="#" className="social-icon">TT</a>
                            </div>
                        </div>
                        <div className="footer-column">
                            <h4>Shop</h4>
                            <ul className="footer-links">
                                <li onClick={() => navigate('/products')}>All Cakes</li>
                                <li onClick={() => navigate('/build')}>3D Builder</li>
                                <li>Seasonal</li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h4>Support</h4>
                            <ul className="footer-links">
                                <li>FAQs</li>
                                <li>Shipping</li>
                                <li>Contact</li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h4>Newsletter</h4>
                            <p className="footer-desc">Get sweet updates and promos.</p>
                            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                                <input type="email" placeholder="Your email..." />
                                <button type="submit" className="btn-subscribe">→</button>
                            </form>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© 2026 Smiley Page Corner. All rights reserved.</p>
                        <div className="footer-legal">
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