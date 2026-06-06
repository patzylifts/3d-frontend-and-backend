// src/pages/BuildBentoPage.jsx
import { useRef, Suspense, useState, useEffect, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, OrbitControls, ContactShadows, SpotLight } from "@react-three/drei";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import {
    CAKE_SIZES,
    CustomizationProvider,
    FLAVOR_VISUALS,
    TEXT_FONT_OPTIONS,
    TOPPING_OPTIONS,
    TOPPING_SIZES,
    useCustomization,
} from "../contexts/Customization";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import CakeInscription from "../components/CakeInscription";
import "./BuildBentoPage.css";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TIER_MODEL_URLS = {
    tier1: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/sus.gltf",
    tier2: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/revise/tier2/tier2.gltf",
    tier3: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/revise/tier3/tier3.gltf",
    tier4: "https://cdn.jsdelivr.net/gh/patzylifts/cake-assets@main/revise/tier4/tier4.gltf",
};

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

const TOPPING_3D_CONFIG = {
    candle: {
        yOffset: 0.03,
        rotation: [-Math.PI / 2, 0, 0],
        scale: -0.03,
        radius: 0.95,
    },
    chocolate: {
        yOffset: 0.06,
        rotation: [2.87, -0.55, -2.38],
        scale: 0.1,
        radius: 0.9,
    },
    balls: {
        yOffset: 0.05,
        rotation: [-2.24, 0.35, -0.42],
        scale: -0.06,
        radius: 0.95,
    },
    nuts: {
        yOffset: 0.02,
        rotation: [Math.PI / 2, 0, -2.81],
        scale: 0.18,
        radius: 0.92,
    },
};

const TIER_TOP_Y = [
    2.30, // tier1
    1.70, // tier2
    2.25, // tier3
    2.70, // tier4
];
const TIER_TOP_RADIUS = [1, 0.72, 0.58, 0.48];
const TIER_FLAVOR_LABELS = {
    1: ["Cake"],
    2: ["Bottom Tier", "Top Tier"],
    3: ["Bottom Tier", "Middle Tier", "Top Tier"],
    4: ["Bottom Tier", "Second Tier", "Third Tier", "Top Tier"],
};

const FLAVOR_LABELS = {
    "Choco Moist": "Chocolate",
    "Vanilla Chiffon": "Vanilla",
    "Ube Chiffon": "Ube",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getTierTopY = (selectedTierIndex) => {
    switch (selectedTierIndex) {
        case 0: return 2.33;
        case 1: return 2.38;
        case 2: return 3.15;
        case 3: return 3.95;
        default: return 2.33;
    }
};

const getToppingPosition = (layout, config, selectedTierIndex) => {
    const tierRadius = TIER_TOP_RADIUS[selectedTierIndex] ?? TIER_TOP_RADIUS[0];
    const radius = config.radius * tierRadius;
    const x = ((layout.x - 50) / 50) * radius;
    const z = ((layout.y - 50) / 50) * radius;
    const topSurfaceY = TIER_TOP_Y[selectedTierIndex] ?? TIER_TOP_Y[0];
    return [x, topSurfaceY + config.yOffset, z];
};

const getFlavorMaterialProps = (flavorName, textureByFlavor, fallbackColor) => ({
    color: FLAVOR_VISUALS[flavorName]?.color || fallbackColor,
    // ✅ Reduced roughness for a realistic slight sheen on frosting
    roughness: 0.65,
    metalness: 0.0,
    ...(textureByFlavor[flavorName] || {}),
});

const getCakeShape = (name) => {
    const lname = (name || "").toLowerCase();
    if (lname.includes("rectangle") || lname.includes("rect") || lname.includes("cube")) return "rectangle";
    if (lname.includes("round") || lname === "cake" || /^cake([._]\d+)?$/.test(lname)) return "round";
    return null;
};

function applyMaterialsToScene(scene, { cakeColor, activeTexture, form, selectedLayerFlavors = [], textureByFlavor = {} }) {
    if (!scene) return;

    // ✅ Lowered roughness for realistic frosting sheen
    const cakeMatProps = { color: cakeColor.color, roughness: 0.65, metalness: 0.0, ...activeTexture };
    const cakeMeshes = [];

    scene.traverse((child) => {
        if (!child.isMesh) return;

        const lname = (child.name || "").toLowerCase();

        if (lname.includes("chandel") || lname.includes("candle")) { child.visible = false; return; }
        if (lname.includes("nut")) { child.visible = false; return; }
        if (lname.includes("bar")) { child.visible = false; return; }
        if (lname.includes("ball")) { child.visible = false; return; }

        const shape = getCakeShape(child.name);
        if (shape) {
            child.visible = (shape === "round" && form === 1) || (shape === "rectangle" && form === 2);
            cakeMeshes.push(child);
            return;
        }

        const isRect =
            child.name === "Cake_Rectangle" ||
            lname.includes("cake_rectangle") ||
            lname.includes("cake_rect") ||
            (lname.includes("rect") && lname.includes("cake"));

        const isRound =
            !isRect && (
                child.name === "Cake" ||
                lname === "cake" ||
                lname === "cake_01" ||
                lname.includes("cake")
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

        child.castShadow = true;
        child.receiveShadow = true;
    });

    cakeMeshes
        .filter((mesh) => mesh.visible)
        .map((mesh) => {
            const box = new THREE.Box3().setFromObject(mesh);
            return { mesh, y: box.getCenter(new THREE.Vector3()).y };
        })
        .sort((a, b) => a.y - b.y)
        .forEach(({ mesh }, idx) => {
            const flavorName = selectedLayerFlavors[idx] ?? selectedLayerFlavors[0];
            mesh.material = new THREE.MeshStandardMaterial(
                getFlavorMaterialProps(flavorName, textureByFlavor, cakeColor.color)
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        });
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary — catches WebGL / drei loader crashes gracefully
// ─────────────────────────────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error("3D Canvas error caught by boundary:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#fff",
                        gap: "12px",
                        background: "#120020",
                        borderRadius: "12px",
                    }}
                >
                    <span style={{ fontSize: "3rem" }}>🎂</span>
                    <p style={{ opacity: 0.8, margin: 0 }}>3D preview couldn't load.</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            padding: "8px 20px",
                            background: "#c77dff",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RealisticLighting — product-photography 3-point rig + overhead key
// ─────────────────────────────────────────────────────────────────────────────
function RealisticLighting() {
    return (
        <>
            {/*
             * ── AMBIENT ──────────────────────────────────────────────────────
             * Soft, neutral base so shadows are never pitch-black.
             * Intentionally kept moderate — we let the key lights do the work.
             */}
            <ambientLight intensity={0.9} color="#fff8f2" />

            {/*
             * ── HEMISPHERE (sky/ground bounce) ───────────────────────────────
             * Warm ivory sky + subtle warm ground bounce imitates a daylight
             * studio with a warm reflector on the floor.
             */}
            <hemisphereLight
                intensity={0.7}
                skyColor="#fffbf0"
                groundColor="#c8956c"
            />

            {/*
             * ── KEY LIGHT (main studio softbox, upper-front-right) ───────────
             * This is the dominant light. Warm white, cast from 45° above and
             * slightly to the right — classic product-photography angle.
             * Shadow map at 2048 keeps edges crisp without banding.
             */}
            <directionalLight
                position={[4, 9, 6]}
                intensity={3.5}
                color="#fff5e8"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-bias={-0.0008}
                shadow-camera-near={0.5}
                shadow-camera-far={30}
                shadow-camera-left={-6}
                shadow-camera-right={6}
                shadow-camera-top={6}
                shadow-camera-bottom={-6}
            />

            {/*
             * ── FILL LIGHT (opposite side softbox) ───────────────────────────
             * Softer than the key, from upper-left-back. Lifts shadow areas
             * without flattening the form — about 40% of key intensity.
             */}
            <directionalLight
                position={[-5, 6, -3]}
                intensity={1.6}
                color="#ffeedd"
            />

            {/*
             * ── RIM / BACK LIGHT ─────────────────────────────────────────────
             * Separates the cake from the dark background with a cool-neutral
             * halo. Essential for product shots on dark BG.
             */}
            <directionalLight
                position={[0, 4, -7]}
                intensity={1.2}
                color="#e8f0ff"
            />

            {/*
             * ── OVERHEAD SPOT (hero downlight) ───────────────────────────────
             * Tight spot aimed straight down at the cake top — this is what
             * makes the frosting & toppings "pop" and look delicious.
             * penumbra softens the edge so it doesn't look artificial.
             */}
            <spotLight
                position={[0.5, 9, 1.5]}
                intensity={5.0}
                angle={Math.PI / 7}
                penumbra={0.55}
                color="#fff9f0"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.001}
                target-position={[0, 1, 0]}
            />

            {/*
             * ── FRONT ACCENT (camera-side bounce card) ───────────────────────
             * Small warm point close to the camera side to ensure the front
             * face of the cake stays bright and appetising.
             */}
            <pointLight
                position={[1, 3, 5]}
                intensity={1.4}
                color="#fff8f0"
                distance={12}
                decay={2}
            />

            {/*
             * ── LEFT ACCENT ──────────────────────────────────────────────────
             * Subtle left-side fill, very warm, keeps any remaining dark zones
             * from going fully black.
             */}
            <pointLight
                position={[-3, 4, 3]}
                intensity={0.9}
                color="#ffe8cc"
                distance={10}
                decay={2}
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CakeModel
// ─────────────────────────────────────────────────────────────────────────────
export function CakeModel({ selectedTierIndex }) {
    const tier1 = useGLTF(TIER_MODEL_URLS.tier1);
    const tier2 = useGLTF(TIER_MODEL_URLS.tier2);
    const tier3 = useGLTF(TIER_MODEL_URLS.tier3);
    const tier4 = useGLTF(TIER_MODEL_URLS.tier4);

    const { nodes, materials } = tier1;
    const {
        form,
        cakeColor,
        flavor,
        flavorTextureMap,
        selectedTierFlavors,
        candle,
        chocolate,
        balls,
        nuts,
        toppingLayout,
        inscriptionText,
        textFont,
    } = useCustomization();
    const groupRef = useRef();

    const chocoTexture = useTexture(TEXTURE_URLS.choco);
    const milkshakeTexture = useTexture(TEXTURE_URLS.vanilla);
    const abstractTexture = useTexture(TEXTURE_URLS.ube);

    const texturesByKey = {
        choco: chocoTexture,
        vanilla: milkshakeTexture,
        ube: abstractTexture,
    };

    const baseFlavor = selectedTierFlavors?.[0] || flavor;
    const activeTextureKey = flavorTextureMap[baseFlavor] || "choco";
    const activeTexture = texturesByKey[activeTextureKey];
    const textureByFlavor = Object.fromEntries(
        Object.entries(flavorTextureMap).map(([flavorName, textureKey]) => [
            flavorName,
            texturesByKey[textureKey],
        ])
    );

    const matProps = {
        cakeColor,
        activeTexture,
        form,
        selectedLayerFlavors: selectedTierFlavors,
        textureByFlavor,
    };

    useEffect(() => { applyMaterialsToScene(tier2?.scene, matProps); }, [tier2, cakeColor, form, selectedTierFlavors, textureByFlavor]);
    useEffect(() => { applyMaterialsToScene(tier3?.scene, matProps); }, [tier3, cakeColor, form, selectedTierFlavors, textureByFlavor]);
    useEffect(() => { applyMaterialsToScene(tier4?.scene, matProps); }, [tier4, cakeColor, form, selectedTierFlavors, textureByFlavor]);

    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
    });

    const standColor = new THREE.Color("#2a2424");
    const selectedToppings = { candle, chocolate, balls, nuts };

    const renderCustomToppings = () => (
        <>
            {selectedToppings.candle && nodes.chandel?.geometry && (
                <mesh
                    geometry={nodes.chandel.geometry}
                    material={materials.chandel}
                    position={getToppingPosition(toppingLayout.candle, TOPPING_3D_CONFIG.candle, selectedTierIndex)}
                    rotation={TOPPING_3D_CONFIG.candle.rotation}
                    scale={TOPPING_3D_CONFIG.candle.scale * TOPPING_SIZES[toppingLayout.candle.size]}
                />
            )}

            {selectedToppings.nuts && nodes.nuts?.geometry && (
                <mesh
                    geometry={nodes.nuts.geometry}
                    material={materials.Default}
                    position={getToppingPosition(toppingLayout.nuts, TOPPING_3D_CONFIG.nuts, selectedTierIndex)}
                    rotation={TOPPING_3D_CONFIG.nuts.rotation}
                    scale={TOPPING_3D_CONFIG.nuts.scale * TOPPING_SIZES[toppingLayout.nuts.size]}
                />
            )}

            {selectedToppings.nuts && !nodes.nuts?.geometry && nodes.Mesh021?.geometry && nodes.Mesh021_1?.geometry && (
                <group
                    position={getToppingPosition(toppingLayout.nuts, TOPPING_3D_CONFIG.nuts, selectedTierIndex)}
                    rotation={TOPPING_3D_CONFIG.nuts.rotation}
                    scale={TOPPING_3D_CONFIG.nuts.scale * TOPPING_SIZES[toppingLayout.nuts.size]}
                >
                    <mesh geometry={nodes.Mesh021.geometry} material={materials.Default} />
                    <mesh geometry={nodes.Mesh021_1.geometry} material={materials.Default} />
                </group>
            )}

            {selectedToppings.chocolate && nodes.bar?.geometry && (
                <mesh
                    geometry={nodes.bar.geometry}
                    material={materials.choco}
                    position={getToppingPosition(toppingLayout.chocolate, TOPPING_3D_CONFIG.chocolate, selectedTierIndex)}
                    rotation={TOPPING_3D_CONFIG.chocolate.rotation}
                    scale={TOPPING_3D_CONFIG.chocolate.scale * TOPPING_SIZES[toppingLayout.chocolate.size]}
                />
            )}

            {selectedToppings.balls && nodes.balls?.geometry && (
                <mesh
                    geometry={nodes.balls.geometry}
                    material={materials.balls}
                    position={getToppingPosition(toppingLayout.balls, TOPPING_3D_CONFIG.balls, selectedTierIndex)}
                    rotation={TOPPING_3D_CONFIG.balls.rotation}
                    scale={TOPPING_3D_CONFIG.balls.scale * TOPPING_SIZES[toppingLayout.balls.size]}
                />
            )}
        </>
    );

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
                                            <meshStandardMaterial color={standColor} roughness={0.55} metalness={0.1} />
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
                            receiveShadow
                        >
                            {/* ✅ roughness 0.65 gives a subtle frosting sheen */}
                            <meshStandardMaterial
                                {...activeTexture}
                                color={cakeColor.color}
                                roughness={0.65}
                                metalness={0.0}
                            />
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
                            receiveShadow
                        >
                            <meshStandardMaterial
                                {...activeTexture}
                                color={cakeColor.color}
                                roughness={0.65}
                                metalness={0.0}
                                displacementScale={0.01}
                            />
                        </mesh>
                    )}
                </>
            )}

            {renderCustomToppings()}
            <CakeInscription selectedTierIndex={selectedTierIndex} text={inscriptionText} font={textFont} />
        </group>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DraggableTopping
// ─────────────────────────────────────────────────────────────────────────────
function DraggableTopping({ topping, layout }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: topping.key,
    });
    const dragTransform = transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0) translate(-50%, -50%)`
        : "translate(-50%, -50%)";

    return (
        <button
            ref={setNodeRef}
            type="button"
            className={`topping-marker topping-marker--${layout.size.toLowerCase()} ${isDragging ? "topping-marker--dragging" : ""}`}
            style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                backgroundColor: topping.color,
                transform: dragTransform,
            }}
            aria-label={`Move ${topping.label}`}
            {...listeners}
            {...attributes}
        >
            {topping.shortLabel}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToppingPlacementBoard
// ─────────────────────────────────────────────────────────────────────────────
function ToppingPlacementBoard({ form, activeToppings, toppingLayout, onMove }) {
    const boardRef = useRef(null);
    const { setNodeRef } = useDroppable({ id: "cake-placement" });
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        })
    );

    const setBoardNode = (node) => {
        boardRef.current = node;
        setNodeRef(node);
    };

    const handleDragEnd = ({ active, delta }) => {
        const key = active?.id;
        const currentLayout = toppingLayout[key];

        if (!key || !currentLayout || !boardRef.current) return;

        const rect = boardRef.current.getBoundingClientRect();

        let nextX = currentLayout.x + (delta.x / rect.width) * 100;
        let nextY = currentLayout.y + (delta.y / rect.height) * 100;

        nextX = Math.max(5, Math.min(95, nextX));
        nextY = Math.max(5, Math.min(95, nextY));

        if (form === 1) {
            const dx = nextX - 50;
            const dy = nextY - 50;
            const radius = 45;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > radius) {
                const angle = Math.atan2(dy, dx);
                nextX = 50 + Math.cos(angle) * radius;
                nextY = 50 + Math.sin(angle) * radius;
            }
        }

        onMove(key, nextX, nextY);
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
                ref={setBoardNode}
                className={`topping-board ${form === 1 ? "topping-board--round" : "topping-board--rectangle"}`}
            >
                <div className="topping-board__cake">
                    {activeToppings.map((topping) => (
                        <DraggableTopping
                            key={topping.key}
                            topping={topping}
                            layout={toppingLayout[topping.key]}
                        />
                    ))}
                </div>
            </div>
        </DndContext>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Configurator
// ─────────────────────────────────────────────────────────────────────────────
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
        pricingLoading,
        pricingError,
        toppingLayout,
        setToppingPosition,
        setToppingSize,
        tierFlavors,
        setTierLayerFlavor,
        tierFlavorLabels,
        inscriptionText,
        setInscriptionText,
        textFont,
        setTextFont,
    } = useCustomization();

    const { addCustomCakeToCart } = useCart();
    const navigate = useNavigate();
    const [orderStatus, setOrderStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSizeChange = (e) => setSelectedSize(e.target.value);
    const toppingEnabled = { candle, chocolate, balls, nuts };
    const activeToppings = TOPPING_OPTIONS.filter((topping) => toppingEnabled[topping.key]);
    const activeTierLabels = TIER_FLAVOR_LABELS[selectedTierIndex + 1] || TIER_FLAVOR_LABELS[1];

    const handleAddToCart = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const selectedTier = CAKE_SIZES[selectedTierIndex] ?? CAKE_SIZES[0];
        const selectedTierKey = selectedTier.tierKey;
        const layerCount = selectedTierIndex + 1;

        const activeTierFlavors =
            selectedTierKey === "tier1"
                ? [flavor]
                : Array.from(
                    { length: layerCount },
                    (_, idx) => tierFlavors[selectedTierKey]?.[idx] ?? flavors[idx % flavors.length]
                );

        const tierFlavorPayload =
            selectedTierKey === "tier1"
                ? {}
                : Object.fromEntries(
                    activeTierFlavors.map((layerFlavor, idx) => [
                        activeTierLabels[idx] ?? `Tier ${idx + 1}`,
                        layerFlavor,
                    ])
                );

        const payload = {
            shape: form === 1 ? "round" : "rectangle",
            cake_color: cakeColor.color,
            flavor: activeTierFlavors[0] || flavor,
            tier: selectedTier.tier,
            size: selectedSize,
            tier_flavors: tierFlavorPayload,
            inscription_text: inscriptionText.trim(),
            text_font: textFont,
            has_candle: candle,
            has_chocolate: chocolate,
            has_balls: balls,
            has_nuts: nuts,
            topping_layout: Object.fromEntries(
                activeToppings.map((topping) => [topping.key, toppingLayout[topping.key]])
            ),
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
            setErrorMessage(
                result.error?.error || result.error?.message || "Failed to add cake to cart. Please try again."
            );
            setTimeout(() => setOrderStatus(null), 3000);
        }

        setIsSubmitting(false);
    };

    return (
        <aside className="cfg-panel">
            <h2 className="cfg-title">Design Your Cake</h2>

            {/* ── Tier & Size ── */}
            <section className="cfg-section">
                <h3 className="cfg-label">Tier</h3>
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

            {/* ── Shape ── */}
            <section className="cfg-section">
                <h3 className="cfg-label">Shape</h3>
                <div className="cfg-chips">
                    <button className={`chip ${form === 1 ? "chip--active" : ""}`} onClick={() => setForm(1)}>
                        Round
                    </button>
                    <button className={`chip ${form === 2 ? "chip--active" : ""}`} onClick={() => setForm(2)}>
                        Rectangle
                    </button>
                </div>
            </section>

            {/* ── Cake Color ── */}
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

            {/* ── Flavor ── */}
            <section className="cfg-section">
                <h3 className="cfg-label">
                    {selectedTierIndex === 0 ? "Flavor" : "Tier Flavor Layout"}
                </h3>
                {selectedTierIndex === 0 ? (
                    <div className="cfg-chips">
                        {flavors.map((f) => (
                            <button
                                key={f}
                                className={`chip ${flavor === f ? "chip--active" : ""}`}
                                onClick={() => {
                                    setFlavor(f);
                                    if (f === "Choco Moist")
                                        setCakeColor(cakeColors.find((c) => c.name === "brown") || cakeColors[0]);
                                    else if (f === "Vanilla Chiffon")
                                        setCakeColor(cakeColors.find((c) => c.name === "vanilla") || cakeColors[0]);
                                    else if (f === "Ube Chiffon")
                                        setCakeColor(cakeColors.find((c) => c.name === "lavender") || cakeColors[0]);
                                }}
                            >
                                {FLAVOR_LABELS[f] || "Cake"} - {f}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="tier-flavor-list">
                        <p className="cfg-helper">Choose the flavor for each tier in your cake layout.</p>
                        {Array.from({ length: selectedTierIndex + 1 }).map((_, idx) => (
                            <label className="tier-flavor-row" key={`tier-flavor-${idx}`}>
                                <span className="tier-flavor-name">
                                    <span
                                        className="tier-flavor-dot"
                                        style={{
                                            backgroundColor:
                                                FLAVOR_VISUALS[tierFlavors[CAKE_SIZES[selectedTierIndex]?.tierKey]?.[idx]]
                                                    ?.color || cakeColor.color,
                                        }}
                                    />
                                    {activeTierLabels[idx] ?? tierFlavorLabels[idx] ?? `Tier ${idx + 1}`}
                                </span>
                                <select
                                    className="cfg-select tier-flavor-select"
                                    value={tierFlavors[CAKE_SIZES[selectedTierIndex]?.tierKey]?.[idx] || flavors[0]}
                                    onChange={(event) => setTierLayerFlavor(idx, event.target.value)}
                                >
                                    {flavors.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </label>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Cake Message ── */}
            <section className="cfg-section">
                <h3 className="cfg-label">Cake Message</h3>
                <input
                    className="cfg-input"
                    value={inscriptionText}
                    maxLength={48}
                    placeholder="Add text on top"
                    onChange={(event) => setInscriptionText(event.target.value)}
                />
                <div className="cfg-select-wrapper">
                    <select
                        className="cfg-select"
                        value={textFont}
                        onChange={(event) => setTextFont(event.target.value)}
                    >
                        {TEXT_FONT_OPTIONS.map((fontOption) => (
                            <option key={fontOption.value} value={fontOption.value}>
                                {fontOption.label}
                            </option>
                        ))}
                    </select>
                    <span className="cfg-select-arrow">▾</span>
                </div>
            </section>

            {/* ── Decorations ── */}
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

            {/* ── Topping Placement ── */}
            <section className="cfg-section">
                <h3 className="cfg-label">Topping Placement</h3>
                {activeToppings.length > 0 ? (
                    <>
                        <ToppingPlacementBoard
                            form={form}
                            activeToppings={activeToppings}
                            toppingLayout={toppingLayout}
                            onMove={setToppingPosition}
                        />

                        <div className="topping-size-list">
                            {activeToppings.map((topping) => (
                                <div className="topping-size-row" key={topping.key}>
                                    <span className="topping-size-name">
                                        <span
                                            className="topping-size-dot"
                                            style={{ backgroundColor: topping.color }}
                                        />
                                        {topping.label}
                                    </span>
                                    <div className="topping-size-options" aria-label={`${topping.label} size`}>
                                        {Object.keys(TOPPING_SIZES).map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                className={`size-chip ${toppingLayout[topping.key].size === size ? "size-chip--active" : ""}`}
                                                onClick={() => setToppingSize(topping.key, size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="topping-empty">Select a decoration first.</div>
                )}
            </section>

            {/* ── Randomize ── */}
            <button className="cfg-random-btn" onClick={generateRandomCake}>
                🎲 Randomize My Cake!
            </button>

            {/* ── Price ── */}
            {pricingLoading && (
                <div className="cfg-pricing-note">Loading latest prices...</div>
            )}
            {pricingError && (
                <div className="cfg-pricing-note cfg-pricing-note--error">{pricingError}</div>
            )}
            <div className="cfg-price-display">
                <span className="cfg-price-label">Total Price:</span>
                <span className="cfg-price-amount">₱{calculatePrice().toFixed(2)}</span>
            </div>

            {/* ── Add to Cart ── */}
            <button
                className="cfg-order-btn"
                onClick={handleAddToCart}
                disabled={isSubmitting || !!pricingError}
            >
                {isSubmitting ? "Adding..." : "🛒 Add to Cart"}
            </button>

            {orderStatus === "success" && (
                <div className="cfg-toast cfg-toast--success">✅ Added to cart! Redirecting...</div>
            )}
            {orderStatus === "error" && (
                <div className="cfg-toast cfg-toast--error">❌ {errorMessage}</div>
            )}
        </aside>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BuildBentoContent
// ─────────────────────────────────────────────────────────────────────────────
function BuildBentoContent() {
    const {
        selectedTierIndex,
        setSelectedTierIndex,
        selectedSize,
        setSelectedSize,
    } = useCustomization();

    return (
        <div className="build-page">
            <Navbar />

            <div className="build-layout">
                <div className="build-canvas-wrap">
                    {/* Error boundary isolates WebGL crashes from the rest of the UI */}
                    <CanvasErrorBoundary>
                        <Canvas
                            dpr={[1, 2]}
                            camera={{ fov: 40, position: [0, 4, 5] }}
                            shadows
                            // ✅ Tone mapping for realistic, film-like brightness response
                            gl={{
                                toneMapping: THREE.ACESFilmicToneMapping,
                                toneMappingExposure: 1.15,
                                outputColorSpace: THREE.SRGBColorSpace,
                            }}
                            onCreated={({ gl }) => {
                                gl.domElement.addEventListener(
                                    "webglcontextlost",
                                    (e) => {
                                        e.preventDefault();
                                        console.warn("WebGL context lost — will attempt to restore.");
                                    },
                                    false
                                );
                                gl.domElement.addEventListener(
                                    "webglcontextrestored",
                                    () => {
                                        console.info("WebGL context restored.");
                                    },
                                    false
                                );
                            }}
                        >
                            <color attach="background" args={["#120020"]} />

                            {/*
                             * ✅ Reduced fog density — previous fog was too thick,
                             * swallowing light and making everything appear dark.
                             * Far plane moved to 28 so the cake is fully clear.
                             */}
                            <fog attach="fog" args={["#1a0030", 16, 28]} />

                            {/* ✅ Full realistic lighting rig — replaces old dark colored lights */}
                            <RealisticLighting />

                            <Suspense fallback={null}>
                                <CakeModel selectedTierIndex={selectedTierIndex} />

                                {/*
                                 * ✅ ContactShadows opacity reduced slightly so it
                                 * doesn't make the base look muddy.
                                 */}
                                <ContactShadows
                                    position={[0, -2.3, 0]}
                                    opacity={0.35}
                                    scale={6}
                                    blur={2.5}
                                    color="#200040"
                                />
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
                    </CanvasErrorBoundary>

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

// ─────────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────────
export default function BuildBentoPage() {
    return (
        <CustomizationProvider>
            <BuildBentoContent />
        </CustomizationProvider>
    );
}