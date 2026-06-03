// src/pages/BuildBentoPag.jsx
import { useRef, Suspense, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { CAKE_SIZES, CustomizationProvider, FLAVOR_VISUALS, TEXT_FONT_OPTIONS, TOPPING_OPTIONS, TOPPING_SIZES, useCustomization } from "../contexts/Customization";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import CakeInscription from "../components/CakeInscription";
import "./BuildBentoPage.css";

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
        yOffset: 0,
        rotation: [-Math.PI / 2, 0, 0],
        scale: -0.03,
        radius: 0.95,
    },
    chocolate: {
        yOffset: 0.17,
        rotation: [2.87, -0.55, -2.38],
        scale: 0.1,
        radius: 0.9,
    },
    balls: {
        yOffset: 0.11,
        rotation: [-2.24, 0.35, -0.42],
        scale: -0.06,
        radius: 0.95,
    },
    nuts: {
        yOffset: -0.02,
        rotation: [Math.PI / 2, 0, -2.81],
        scale: 0.18,
        radius: 0.92,
    },
};

const TIER_TOP_Y = [2.33, 3.35, 4.2, 5.05];
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

const getToppingPosition = (layout, config, selectedTierIndex) => {
    const tierRadius = TIER_TOP_RADIUS[selectedTierIndex] ?? TIER_TOP_RADIUS[0];
    const radius = config.radius * tierRadius;
    const x = ((layout.x - 50) / 50) * radius;
    const z = ((layout.y - 50) / 50) * radius;
    const y = (TIER_TOP_Y[selectedTierIndex] ?? TIER_TOP_Y[0]) + config.yOffset;

    return [x, y, z];
};

const getFlavorMaterialProps = (flavorName, textureByFlavor, fallbackColor) => ({
    color: FLAVOR_VISUALS[flavorName]?.color || fallbackColor,
    roughness: 0.8,
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

    const cakeMatProps = { color: cakeColor.color, roughness: 0.8, ...activeTexture };
    const cakeMeshes = [];

    scene.traverse((child) => {
        if (!child.isMesh) return;

        const lname = (child.name || "").toLowerCase();

        if (lname.includes("chandel") || lname.includes("candle")) {
            child.visible = false;
            return;
        }
        if (lname.includes("nut")) {
            child.visible = false;
            return;
        }
        if (lname.includes("bar")) {
            child.visible = false;
            return;
        }
        if (lname.includes("ball")) {
            child.visible = false;
            return;
        }

        const shape = getCakeShape(child.name);
        if (shape) {
            child.visible = (shape === "round" && form === 1) || (shape === "rectangle" && form === 2);
            cakeMeshes.push(child);
            return;
        }

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

function CakeModel({ selectedTierIndex }) {
    const tier1 = useGLTF(TIER_MODEL_URLS.tier1);
    const tier2 = useGLTF(TIER_MODEL_URLS.tier2);
    const tier3 = useGLTF(TIER_MODEL_URLS.tier3);
    const tier4 = useGLTF(TIER_MODEL_URLS.tier4);

    const { nodes, materials } = tier1;          // tier1 uses inline JSX
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

    const chocoTexture     = useTexture(TEXTURE_URLS.choco);
    const milkshakeTexture = useTexture(TEXTURE_URLS.vanilla);
    const abstractTexture  = useTexture(TEXTURE_URLS.ube);

    const texturesByKey = {
        choco:   chocoTexture,
        vanilla: milkshakeTexture,
        ube:     abstractTexture,
    };

    const activeTextureKey = flavorTextureMap[selectedTierFlavors?.[0] || flavor] || "choco";
    const activeTexture    = texturesByKey[activeTextureKey];
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

                </>
            )}
            {renderCustomToppings()}
            <CakeInscription selectedTierIndex={selectedTierIndex} text={inscriptionText} font={textFont} />
        </group>
    );
}

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

        let nextX =
            currentLayout.x + (delta.x / rect.width) * 100;

        let nextY =
            currentLayout.y + (delta.y / rect.height) * 100;

        nextX = Math.max(5, Math.min(95, nextX));
        nextY = Math.max(5, Math.min(95, nextY));

        if (form === 1) {
            const dx = nextX - 50;
            const dy = nextY - 50;

            const radius = 45; // leave some padding

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

        const activeTierFlavors = selectedTierKey === "tier1"
            ? [flavor]
            : Array.from(
                { length: layerCount },
                (_, idx) => tierFlavors[selectedTierKey]?.[idx] ?? flavors[idx % flavors.length]
            );

        const tierFlavorPayload = selectedTierKey === "tier1"
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
            setErrorMessage(result.error?.error || result.error?.message || "Failed to add cake to cart. Please try again.");
            setTimeout(() => setOrderStatus(null), 3000);
        }

        setIsSubmitting(false);
    };

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
                <h3 className="cfg-label">{selectedTierIndex === 0 ? "Flavor" : "Tier Flavor Layout"}</h3>
                {selectedTierIndex === 0 ? (
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
                                        style={{ backgroundColor: FLAVOR_VISUALS[tierFlavors[CAKE_SIZES[selectedTierIndex]?.tierKey]?.[idx]]?.color || cakeColor.color }}
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

            {/* Cake Message */}
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
                            <option key={fontOption.value} value={fontOption.value}>{fontOption.label}</option>
                        ))}
                    </select>
                    <span className="cfg-select-arrow">▾</span>
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

            {/* Randomize */}
            <button className="cfg-random-btn" onClick={generateRandomCake}>
                🎲 Randomize My Cake!
            </button>

            {/* Price Display */}
            {pricingLoading && (
                <div className="cfg-pricing-note">Loading latest prices...</div>
            )}
            {pricingError && (
                <div className="cfg-pricing-note cfg-pricing-note--error">
                    {pricingError}
                </div>
            )}
            <div className="cfg-price-display">
                <span className="cfg-price-label">Total Price:</span>
                <span className="cfg-price-amount">₱{calculatePrice().toFixed(2)}</span>
            </div>

            {/* Add to Cart */}
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
