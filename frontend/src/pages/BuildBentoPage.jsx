import { useRef, Suspense, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { CustomizationProvider, useCustomization } from "../contexts/Customization";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import "./BuildBentoPage.css";


/* ─────────────────────────────── 3D MODEL ─────────────────────────────── */

/* ── Tier model URLs ── */
const TIER_MODEL_URLS = {
    tier1: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/sus.gltf",
    tier2: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/tier2/tier2.gltf",
    tier3: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/tier3/tier3.gltf",
    tier4: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/tier4/tier4.gltf",
};

/* ── Texture URLs ── */
const TEXTURE_URLS = {
    choco: {
        map: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/choco_chiffon/Abstract_Organic_007_basecolor.jpg",
        normalMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/choco_chiffon/Abstract_Organic_006_normal.jpg",
        roughnessMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/choco_chiffon/Abstract_Organic_006_roughness.jpg",
        aoMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/choco_chiffon/Abstract_Organic_006_ambientOcclusion.jpg",
    },
    vanilla: {
        map: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/vanilla/vanilla/vanilla_chiffon_diffuse.jpg",
        normalMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/vanilla/vanilla/vanilla_chiffon_normal.jpg",
        aoMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/vanilla/vanilla/vanilla_chiffon_ao.jpg",
    },
    ube: {
        map: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/ube/ube_chiffon_diffuseOriginal.jpg",
        normalMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/ube/ube_chiffon_normal.jpg",
        aoMap: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/textures/ube/ube_chiffon_ao.jpg",
    },
};

/**
 * Traverse a loaded GLTF scene and apply cake materials, shape visibility,
 * and decoration toggles. Used for tier2, tier3, and tier4 primitive scenes.
 */
function applyMaterialsToScene(scene, { cakeColor, activeTexture, form, candle, chocolate, balls, nuts }) {
    if (!scene) return;

    const cakeMatProps = { color: cakeColor.color, roughness: 0.8, ...activeTexture };

    scene.traverse((child) => {
        if (!child.isMesh) return;

        const lname = (child.name || "").toLowerCase();

        // ── Decorations: toggle visibility ──
        if (lname.includes("chandel") || lname.includes("candle")) {
            child.visible = !!candle;
            return;
        }
        if (lname.includes("nut")) {
            child.visible = !!nuts;
            return;
        }
        if (lname.includes("bar")) {
            child.visible = !!chocolate;
            return;
        }
        if (lname.includes("ball")) {
            child.visible = !!balls;
            return;
        }

        // ── Shape: round vs rectangle ──
        const isRect = child.name === "Cake_Rectangle"
            || lname.includes("cake_rectangle")
            || lname.includes("cake_rect")
            || (lname.includes("rect") && lname.includes("cake"));

        const isRound = !isRect && (
            child.name === "Cake"
            || lname === "cake"
            || lname === "cake_01"
            || lname.includes("cake")
        );

        if (isRound) {
            child.visible = form === 1;
            if (form === 1) child.material = new THREE.MeshStandardMaterial(cakeMatProps);
            return;
        }
        if (isRect) {
            child.visible = form === 2;
            if (form === 2) child.material = new THREE.MeshStandardMaterial(cakeMatProps);
            return;
        }

        // ── Default: enable shadows ──
        child.castShadow = true;
        child.receiveShadow = true;
    });
}


function CakeModel({ selectedTierIndex }) {
    /* ── Load all tier models (drei caches them automatically) ── */
    const tier1 = useGLTF(TIER_MODEL_URLS.tier1);
    const tier2 = useGLTF(TIER_MODEL_URLS.tier2);
    const tier3 = useGLTF(TIER_MODEL_URLS.tier3);
    const tier4 = useGLTF(TIER_MODEL_URLS.tier4);

    const { nodes, materials } = tier1;          // tier1 uses inline JSX
    const { form, cakeColor, flavor, flavorTextureMap, candle, chocolate, balls, nuts } = useCustomization();
    const groupRef = useRef();

    /* ── Load flavor textures ── */
    const chocoTexture     = useTexture(TEXTURE_URLS.choco);
    const milkshakeTexture = useTexture(TEXTURE_URLS.vanilla);
    const abstractTexture  = useTexture(TEXTURE_URLS.ube);

    const texturesByKey = {
        choco:   chocoTexture,
        vanilla: milkshakeTexture,
        ube:     abstractTexture,
    };

    const activeTextureKey = flavorTextureMap[flavor] || "choco";
    const activeTexture    = texturesByKey[activeTextureKey];

    /* ── Shared material/props bag for the scene traversal helper ── */
    const matProps = { cakeColor, activeTexture, form, candle, chocolate, balls, nuts };

    /* ── Apply materials to multi-tier scenes whenever settings change ── */
    useEffect(() => { applyMaterialsToScene(tier2?.scene, matProps); }, [tier2, ...Object.values(matProps)]);
    useEffect(() => { applyMaterialsToScene(tier3?.scene, matProps); }, [tier3, ...Object.values(matProps)]);
    useEffect(() => { applyMaterialsToScene(tier4?.scene, matProps); }, [tier4, ...Object.values(matProps)]);

    /* ── Slow auto-rotation ── */
    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
    });

    const standColor = new THREE.Color("#2a2424");

    /* ── Render the appropriate model based on selected tier ── */
    return (
        <group ref={groupRef} dispose={null} position={[0, -0.8, 0]}>

            {/* ── Tier 2 (Mini 2 Tier) ── */}
            {selectedTierIndex === 1 && (
                <primitive object={tier2.scene} position={[0, -0.95, 0]} scale={0.9} rotation={[0, Math.PI, 0]} />
            )}

            {/* ── Tier 3 ── */}
            {selectedTierIndex === 2 && (
                <primitive object={tier3.scene} position={[0, -0.95, 0]} scale={0.9} rotation={[0, Math.PI, 0]} />
            )}

            {/* ── Tier 4 ── */}
            {selectedTierIndex === 3 && (
                <primitive object={tier4.scene} position={[0, -0.95, 0]} scale={0.9} rotation={[0, Math.PI, 0]} />
            )}

            {/* ── Tier 1 (default — inline JSX meshes) ── */}
            {selectedTierIndex === 0 && (
                <>
                    {/* Stand */}
                    <group rotation={[Math.PI / 2, 0, 0]} scale={0.07}>
                        <group position={[0, 0, -27.2]} scale={1.01}>
                            {["Mesh004", "Mesh004_1", "Mesh004_2", "Mesh004_3"].map(
                                (name) =>
                                    nodes[name]?.geometry && (
                                        <mesh key={name} geometry={nodes[name].geometry} castShadow>
                                            <meshStandardMaterial color={standColor} roughness={0.55} />
                                        </mesh>
                                    )
                            )}
                        </group>
                    </group>

                    {/* Round Cake — form === 1 */}
                    {nodes.Cake?.geometry && (
                        <mesh
                            geometry={nodes.Cake.geometry}
                            position={[0, 1.89, 0]}
                            scale={[0.95, 0.92, 0.95]}
                            visible={form === 1}
                            castShadow
                        >
                            <meshStandardMaterial {...activeTexture} color={cakeColor.color} roughness={0.8} />
                        </mesh>
                    )}

                    {/* Rectangle Cake — form === 2 */}
                    {nodes.Cake_Rectangle?.geometry && (
                        <mesh
                            geometry={nodes.Cake_Rectangle.geometry}
                            position={[0, 0.21, 0]}
                            scale={[0.95, 0.92, 0.95]}
                            visible={form === 2}
                            castShadow
                        >
                            <meshStandardMaterial {...activeTexture} color={cakeColor.color} roughness={0.8} displacementScale={0.01} />
                        </mesh>
                    )}

                    {/* Candle */}
                    {nodes.chandel?.geometry && (
                        <mesh
                            geometry={nodes.chandel.geometry}
                            material={materials.chandel}
                            position={[0, 2.33, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            scale={-0.03}
                            visible={candle}
                        />
                    )}

                    {/* Nuts */}
                    {nodes.nuts?.geometry && (
                        <mesh
                            geometry={nodes.nuts.geometry}
                            material={materials.Default}
                            position={[0.08, 2.31, 0.42]}
                            rotation={[Math.PI / 2, 0, -2.81]}
                            scale={0.18}
                            visible={nuts}
                        />
                    )}

                    {/* Chocolate Bar */}
                    {nodes.bar?.geometry && (
                        <mesh
                            geometry={nodes.bar.geometry}
                            material={materials.choco}
                            position={[0, 2.5, 0]}
                            rotation={[2.87, -0.55, -2.38]}
                            scale={0.1}
                            visible={chocolate}
                        />
                    )}

                    {/* Balls */}
                    {nodes.balls?.geometry && (
                        <mesh
                            geometry={nodes.balls.geometry}
                            material={materials.balls}
                            position={[0.27, 2.44, -0.05]}
                            rotation={[-2.24, 0.35, -0.42]}
                            scale={-0.06}
                            visible={balls}
                        />
                    )}
                </>
            )}
        </group>
    );
}


/* ─────────────────────────────── CONFIGURATOR PANEL ─────────────────────────────── */

/* ── Cake size / tier catalogue ── */
const CAKE_SIZES = [
    {
        tier: "1 Tier Cake",
        sizes: [
            "Bento Cake",
            "Tall Bento Cake",
            "Standard",
            "Tall Cake",
        ],
    },
    {
        tier: "Mini 2 Tier",
        sizes: [
            "6×4 & 4×4",
            "6×6 Cake",
            "6×8 Cake",
            "8×5 Cake",
        ],
    },
    {
        tier: "3 Tier Cake",
        sizes: [
            "4×5, 6×6 & 8×5",
        ],
    },
    {
        tier: "4 Tier Cake",
        sizes: [
            "4×4 & 6×6, 8×5 & 10×4",
        ],
    },
];

function Configurator({ selectedTierIndex, setSelectedTierIndex, selectedSize, setSelectedSize }) {
    const {
        cakeColors, cakeColor, setCakeColor,
        form, setForm,
        flavors, flavor, setFlavor,
        candle, setCandle,
        chocolate, setChocolate,
        balls, setBalls,
        nuts, setNuts,
        generateRandomCake,
        calculatePrice,
    } = useCustomization();

    const { addCustomCakeToCart } = useCart();
    const navigate = useNavigate();
    const [orderStatus, setOrderStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Size & Tier state is lifted to BuildBentoContent and passed via props
    const handleTierChange = (e) => {
        const idx = parseInt(e.target.value, 10);
        setSelectedTierIndex(idx);
        setSelectedSize(CAKE_SIZES[idx].sizes[0]); // reset size to first of new tier
    };

    const handleSizeChange = (e) => setSelectedSize(e.target.value);

    const handleAddToCart = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {
            shape: form === 1 ? "round" : "rectangle",
            cake_color: cakeColor.color,
            flavor,
            tier: CAKE_SIZES[selectedTierIndex].tier,
            size: selectedSize,
            has_candle: candle,
            has_chocolate: chocolate,
            has_balls: balls,
            has_nuts: nuts,
            price: calculatePrice(),
        };

        const result = await addCustomCakeToCart(payload);

        if (result.success) {
            setOrderStatus("success");
            setTimeout(() => {
                setOrderStatus(null);
                navigate("/cart");
            }, 1500);
        } else {
            setOrderStatus("error");
            setTimeout(() => setOrderStatus(null), 3000);
        }

        setIsSubmitting(false);
    };

    const flavorEmoji = { "Choco Moist": "🍫", "Vanilla Chiffon": "🍦", "Ube Chiffon": "🟣" };

    return (
        <aside className="cfg-panel">
            <h2 className="cfg-title">Design Your Cake</h2>

            {/* Size & Tier */}
            <section className="cfg-section">
                <h3 className="cfg-label">Tier</h3>

                {/* Tier — chip buttons like Shape */}
                <div className="cfg-chips">
                    {CAKE_SIZES.map((item, idx) => (
                        <button
                            key={item.tier}
                            className={`chip ${selectedTierIndex === idx ? "chip--active" : ""}`}
                            onClick={() => {
                                setSelectedTierIndex(idx);
                                setSelectedSize(CAKE_SIZES[idx].sizes[0]);
                            }}
                        >
                            {item.tier}
                        </button>
                    ))}
                </div>

                {/* Size — dropdown */}
                <h3 className="cfg-label" style={{ marginTop: "8px" }}>Size</h3>
                <div className="cfg-select-wrapper">
                    <select id="size-select" className="cfg-select" value={selectedSize} onChange={handleSizeChange}>
                        {CAKE_SIZES[selectedTierIndex].sizes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="cfg-select-arrow">▾</span>
                </div>
            </section>


            {/* Shape */}
            <section className="cfg-section">
                <h3 className="cfg-label">Shape</h3>
                <div className="cfg-chips">
                    <button
                        className={`chip ${form === 1 ? "chip--active" : ""}`}
                        onClick={() => setForm(1)}
                    >
                        Round
                    </button>
                    <button
                        className={`chip ${form === 2 ? "chip--active" : ""}`}
                        onClick={() => setForm(2)}
                    >
                        Rectangle
                    </button>
                </div>
            </section>

            {/* Cake Color */}
            <section className="cfg-section">
                <h3 className="cfg-label">Cake Color</h3>
                <div className="cfg-swatches">
                    {cakeColors.map((c) => (
                        <button
                            key={c.name}
                            className={`swatch ${cakeColor.name === c.name ? "swatch--active" : ""}`}
                            style={{ background: c.color }}
                            title={c.name}
                            onClick={() => setCakeColor(c)}
                            aria-label={`Cake color ${c.name}`}
                        />
                    ))}
                </div>
            </section>

            {/* Flavor */}
            <section className="cfg-section">
                <h3 className="cfg-label">Flavor</h3>
                <div className="cfg-chips">
                    {flavors.map((f) => (
                        <button
                            key={f}
                            className={`chip ${flavor === f ? "chip--active" : ""}`}
                            onClick={() => {
                                setFlavor(f);
                                if (f === "Choco Moist") setCakeColor(cakeColors.find(c => c.name === "brown") || cakeColors[0]);
                                else if (f === "Vanilla Chiffon") setCakeColor(cakeColors.find(c => c.name === "vanilla") || cakeColors[0]);
                                else if (f === "Ube Chiffon") setCakeColor(cakeColors.find(c => c.name === "lavender") || cakeColors[0]);
                            }}
                        >
                            {flavorEmoji[f] || "🍰"} {f}
                        </button>
                    ))}
                </div>
            </section>

            {/* Decorations */}
            <section className="cfg-section">
                <h3 className="cfg-label">Decorations</h3>
                <div className="cfg-toggles">
                    {[
                        { label: "🕯️ Candle", value: candle, set: setCandle },
                        { label: "🍫 Chocolate", value: chocolate, set: setChocolate },
                        { label: "🔮 Balls", value: balls, set: setBalls },
                        { label: "🥜 Nuts", value: nuts, set: setNuts },
                    ].map(({ label, value, set }) => (
                        <button
                            key={label}
                            className={`toggle-btn ${value ? "toggle-btn--on" : ""}`}
                            onClick={() => set(!value)}
                        >
                            {label}
                            <span className="toggle-indicator">{value ? "ON" : "OFF"}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Randomize */}
            <button className="cfg-random-btn" onClick={generateRandomCake}>
                🎲 Randomize My Cake!
            </button>

            {/* Price Display */}
            <div className="cfg-price-display">
                <span className="cfg-price-label">Total Price:</span>
                <span className="cfg-price-amount">₱{calculatePrice().toFixed(2)}</span>
            </div>

            {/* Add to Cart */}
            <button
                className="cfg-order-btn"
                onClick={handleAddToCart}
                disabled={isSubmitting}
            >
                {isSubmitting ? "Adding..." : "🛒 Add to Cart"}
            </button>

            {orderStatus === "success" && (
                <div className="cfg-toast cfg-toast--success">✅ Added to cart! Redirecting...</div>
            )}
            {orderStatus === "error" && (
                <div className="cfg-toast cfg-toast--error">❌ Please log in to add to cart.</div>
            )}
        </aside>
    );
}


/* ─────────────────────────────── PAGE ─────────────────────────────── */

function BuildBentoContent() {
    const navigate = useNavigate();
    const [selectedTierIndex, setSelectedTierIndex] = useState(0);
    const [selectedSize, setSelectedSize] = useState(CAKE_SIZES[0].sizes[0]);

    return (
        <div className="build-page">
            <Navbar />

            <div className="build-layout">
                <div className="build-canvas-wrap">
                    <Canvas
                        dpr={[1, 2]}
                        camera={{ fov: 40, position: [0, 4, 5] }}
                        shadows
                    >
                        <color attach="background" args={["#120020"]} />
                        <fog attach="fog" args={["#120020", 12, 22]} />

                        <ambientLight intensity={0.6} />
                        <directionalLight
                            position={[5, 8, 5]}
                            intensity={1.4}
                            castShadow
                            shadow-mapSize={[1024, 1024]}
                        />
                        <pointLight position={[-4, 4, -4]} intensity={0.6} color="#c77dff" />
                        <pointLight position={[4, 2, 4]} intensity={0.4} color="#ff5ec4" />

                        <Suspense fallback={null}>
                            <CakeModel selectedTierIndex={selectedTierIndex} />
                            <ContactShadows
                                position={[0, -2.3, 0]}
                                opacity={0.5}
                                scale={6}
                                blur={2}
                            />
                            <Environment preset="city" />
                        </Suspense>

                        <OrbitControls
                            enablePan={false}
                            minDistance={3}
                            maxDistance={12}
                            minPolarAngle={Math.PI / 6}
                            maxPolarAngle={Math.PI / 2}
                            target={[0, 1.2, 0]}
                        />
                    </Canvas>

                    <div className="canvas-hint">🖱️ Drag to rotate · Scroll to zoom</div>
                </div>

                <Configurator
                    selectedTierIndex={selectedTierIndex}
                    setSelectedTierIndex={setSelectedTierIndex}
                    selectedSize={selectedSize}
                    setSelectedSize={setSelectedSize}
                />
            </div>
        </div>
    );
}

export default function BuildBentoPage() {
    return (
        <CustomizationProvider>
            <BuildBentoContent />
        </CustomizationProvider>
    );
}