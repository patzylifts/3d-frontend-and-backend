import { useRef, Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { CustomizationProvider, useCustomization } from "../contexts/Customization";
import { useCart } from "../context/CartContext";
import "./BuildBentoPage.css";


/* ─────────────────────────────── 3D MODEL ─────────────────────────────── */

function CakeModel() {
    const { nodes, materials } = useGLTF("https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/sus.gltf");
    const { form, cakeColor, flavor, flavorTextureMap, candle, chocolate, balls, nuts } = useCustomization();
    const groupRef = useRef();

    // Load all flavor textures
    const coffeeTexture = useTexture({
        map: "/textures/coffee/Coffee_Grains_001_BaseColor.jpg",
        normalMap: "/textures/coffee/Coffee_Grains_001_Normal.jpg",
        roughnessMap: "/textures/coffee/Coffee_Grains_001_Roughness.jpg",
        aoMap: "/textures/coffee/Coffee_Grains_001_AmbientOcclusion.jpg",
    });
    const milkshakeTexture = useTexture({
        map: "/textures/milkshake/Strawberry_milkshake_foam_001_COLOR.jpg",
        normalMap: "/textures/milkshake/Strawberry_milkshake_foam_001_NORM.jpg",
        roughnessMap: "/textures/milkshake/Strawberry_milkshake_foam_001_ROUGH.jpg",
        aoMap: "/textures/milkshake/Strawberry_milkshake_foam_001_OCC.jpg",
    });
    const abstractTexture = useTexture({
        map: "/textures/abstract/Abstract_Organic_007_basecolor.jpg",
        normalMap: "/textures/abstract/Abstract_Organic_006_normal.jpg",
        roughnessMap: "/textures/abstract/Abstract_Organic_006_roughness.jpg",
        aoMap: "/textures/abstract/Abstract_Organic_006_ambientOcclusion.jpg",
    });

    const texturesByKey = {
        coffee: coffeeTexture,
        milkshake: milkshakeTexture,
        abstract: abstractTexture,
    };

    const activeTextureKey = flavorTextureMap[flavor] || "coffee";
    const activeTexture = texturesByKey[activeTextureKey];

    // Slow auto-rotation
    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
    });

    const standColor = new THREE.Color("#2a2424");

    return (
        <group ref={groupRef} dispose={null} position={[0, -0.8, 0]}>
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
                    <meshStandardMaterial {...activeTexture} color={cakeColor.color} />
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
                    <meshStandardMaterial {...activeTexture} color={cakeColor.color} />
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
        </group>
    );
}


/* ─────────────────────────────── CONFIGURATOR PANEL ─────────────────────────────── */

function Configurator() {
    const {
        cakeColors, cakeColor, setCakeColor,
        form, setForm,
        flavors, flavor, setFlavor,
        candle, setCandle,
        chocolate, setChocolate,
        balls, setBalls,
        nuts, setNuts,
        generateRandomCake,
    } = useCustomization();

    const { addCustomCakeToCart } = useCart();
    const navigate = useNavigate();
    const [orderStatus, setOrderStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddToCart = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {
            shape: form === 1 ? "round" : "rectangle",
            cake_color: cakeColor.color,
            flavor,
            has_candle: candle,
            has_chocolate: chocolate,
            has_balls: balls,
            has_nuts: nuts,
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
                            onClick={() => setFlavor(f)}
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

    return (
        <div className="build-page">
            <header className="build-nav">
                <button className="build-back-btn" onClick={() => navigate("/")}>
                    ← Back
                </button>
                <span className="build-brand">🍰 Smiley Page Corner · Cake Builder</span>
            </header>

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
                            <CakeModel />
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

                <Configurator />
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