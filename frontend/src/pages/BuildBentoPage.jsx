// src/pages/BuildBentoPage.jsx
import { useRef, Suspense, useState, useEffect, useMemo, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, OrbitControls, ContactShadows, SpotLight } from "@react-three/drei";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { CAKE_SIZES, CustomizationProvider, FLAVOR_VISUALS, TEXT_FONT_OPTIONS, TOPPING_OPTIONS, TOPPING_SIZES, useCustomization } from "../contexts/Customization";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import CakeInscription from "../components/CakeInscription";
import './BuildBentoPage.css';

const TIER_MODEL_URLS = {
    tier1: "/models/tier1/tier1.gltf",
};

const TIER1_CHERRY_TEXTURE = "/models/tier1/Cherry.jpg";

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
    cherry: {
        yOffset: 0.01,
        rotation: [0, 0, 0],
        scale: 0.039,
        radius: 0.85,
    },
    sprinkles: {
        yOffset: 0.01,
        rotation: [0, 0, 0],
        scale: 0.09,
        radius: 0.88,
    },
};

const TIER_LAYER_LAYOUTS = [
    [{ y: 1.35, height: 1.75, radius: 1.02, width: 1.95, depth: 1.55 }],
    [
        { y: 0.95, height: 1.20, radius: 1.10, width: 2.10, depth: 1.60 },
        { y: 1.85, height: 0.78, radius: 0.74, width: 1.42, depth: 1.12 },
    ],
    [
        { y: 0.78, height: 1.02, radius: 1.15, width: 2.22, depth: 1.70 },
        { y: 1.58, height: 0.76, radius: 0.84, width: 1.62, depth: 1.26 },
        { y: 2.24, height: 0.58, radius: 0.58, width: 1.12, depth: 0.88 },
    ],
    [
        { y: 0.62, height: 0.88, radius: 1.20, width: 2.32, depth: 1.78 },
        { y: 1.32, height: 0.64, radius: 0.94, width: 1.82, depth: 1.40 },
        { y: 1.90, height: 0.54, radius: 0.68, width: 1.32, depth: 1.02 },
        { y: 2.40, height: 0.44, radius: 0.46, width: 0.90, depth: 0.70 },
    ],
];

const TIER_TOP_Y = TIER_LAYER_LAYOUTS.map((layers) => {
    const topLayer = layers[layers.length - 1];
    return topLayer.y + topLayer.height / 2;
});
const TIER_TOP_RADIUS = [1.02, 0.74, 0.58, 0.46];
const CANDLE_DIGIT_SPACING = 0.16;
const CANDLE_DIGIT_FALLBACK_SCALE = 0.045;
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

// ──────── Helpers ────────────
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

const getNodeRotationArray = (node) => {
    if (!node?.rotation) return [0, 0, 0];
    return [node.rotation.x, node.rotation.y, node.rotation.z];
};

const getNodeScaleArray = (node, multiplier = 1) => {
    if (!node?.scale) {
        const fallback = CANDLE_DIGIT_FALLBACK_SCALE * multiplier;
        return [fallback, fallback, fallback];
    }

    return [
        node.scale.x * multiplier,
        node.scale.y * multiplier,
        node.scale.z * multiplier,
    ];
};

function applyMaterialsToScene(scene, {
    cakeColor,
    activeTexture,
    form,
    selectedLayerFlavors = [],
    textureByFlavor = {},
    icingColor,
    cherryTexture,
    cherryVisible = false,
}) {
    if (!scene) return;

    const cakeMatProps = { color: cakeColor.color, roughness: 0.65, metalness: 0.0, ...activeTexture };
    const cherryMatProps = {
        color: "#FFFFFF",
        roughness: 0.42,
        metalness: 0.0,
        ...(cherryTexture ? { map: cherryTexture } : {}),
    };
    const cakeMeshes = [];

    scene.traverse((child) => {
        if (!child.isMesh) return;

        const lname = (child.name || "").toLowerCase();

        if (lname.includes("chandel") || lname.includes("candle")) { child.visible = false; return; }
        if (lname.includes("nut")) { child.visible = false; return; }
        if (lname.includes("bar")) { child.visible = false; return; }
        if (lname.includes("ball")) { child.visible = false; return; }
        if (lname.includes("sprinkle")) { child.visible = false; return; }

        if (lname.includes("icing")) {
            const isRectangleIcing = lname.includes("rectangle") || lname.includes("rect");
            const isRoundIcing = lname.includes("round");
            child.visible =
                (!isRectangleIcing && !isRoundIcing) ||
                (isRoundIcing && form === 1) ||
                (isRectangleIcing && form === 2);

            // Create realistic icing material
            const icingMat = new THREE.MeshPhysicalMaterial({
                color: icingColor?.color || "#3B1F18",
                roughness: 0.12,
                metalness: 0.0,
                clearcoat: 0.6,
                clearcoatRoughness: 0.15,
                sheen: 0.3,
                sheenRoughness: 0.4,
                sheenColor: new THREE.Color(icingColor?.color || "#3B1F18").multiplyScalar(1.3),
                envMapIntensity: 1.5,
                side: THREE.DoubleSide,
            });
            child.material = icingMat;

            // Use GLTF model's original positions — these are authored to fit the cake side
            // Round icing: position from GLTF node (-0.0119, -0.7735, 0.0015), scale (1.235, 1.013, 1.235)
            // Rectangle icing: position from GLTF node (0.008, -1.249, -0.0005), scale (1.259, 1.146, 1.259)
            if (isRoundIcing && child.visible) {
                child.position.set(-0.0119, -0.7735, 0.0015);
                child.scale.set(1.235, 1.013, 1.235);
            } else if (isRectangleIcing && child.visible) {
                child.position.set(0.008, -1.249, -0.0005);
                child.scale.set(1.259, 1.146, 1.259);
            }

            child.castShadow = true;
            child.receiveShadow = true;
            return;
        }

        if (lname.includes("cherry")) {
            child.visible = cherryVisible;
            child.material = new THREE.MeshStandardMaterial(cherryMatProps);
            child.castShadow = true;
            child.receiveShadow = true;
            return;
        }

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

// ────────── Error Boundary ──────────────
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
                <div className="flex flex-col items-center justify-center h-full text-[#6E473B] gap-3 bg-[#FCF8EE] rounded-2xl border border-[#E6CCA2]">
                    <span className="text-5xl animate-pulse">🎂</span>
                    <p className="text-sm font-medium text-[#A07060]">3D preview couldn't load.</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-5 py-2 text-xs font-semibold bg-[#C05A11] hover:bg-[#A84E0E] text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ────────── RealisticLighting ───────────────
function RealisticLighting() {
    return (
        <>
            <ambientLight intensity={0.9} color="#fff8f2" />
            <hemisphereLight intensity={0.7} skyColor="#fffbf0" groundColor="#c8956c" />
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
            <directionalLight position={[-5, 6, -3]} intensity={1.6} color="#ffeedd" />
            <directionalLight position={[0, 4, -7]} intensity={1.2} color="#e8f0ff" />
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
            <pointLight position={[1, 3, 5]} intensity={1.4} color="#fff8f0" distance={12} decay={2} />
            <pointLight position={[-3, 4, 3]} intensity={0.9} color="#ffe8cc" distance={10} decay={2} />
        </>
    );
}

function CakeStand() {
    return (
        <group position={[0, 0.02, 0]}>
            <mesh position={[0, -0.12, 0]} receiveShadow>
                <cylinderGeometry args={[1.55, 1.65, 0.18, 96]} />
                <meshStandardMaterial color="#E9D8B5" roughness={0.38} metalness={0.12} />
            </mesh>
            <mesh position={[0, -0.03, 0]}>
                <torusGeometry args={[1.45, 0.055, 16, 96]} />
                <meshStandardMaterial color="#C8A766" roughness={0.28} metalness={0.45} />
            </mesh>
        </group>
    );
}

function ProceduralCakeBody({ selectedTierIndex, form, selectedTierFlavors, textureByFlavor, cakeColor, icingColor }) {
    const layers = TIER_LAYER_LAYOUTS[selectedTierIndex] ?? TIER_LAYER_LAYOUTS[0];

    return (
        <group>
            <CakeStand />
            {layers.map((layer, idx) => {
                const flavorName = selectedTierFlavors[idx] ?? selectedTierFlavors[0];
                const materialProps = getFlavorMaterialProps(flavorName, textureByFlavor, cakeColor.color);
                const topY = layer.y + layer.height / 2;

                return (
                    <group key={`tier-layer-${idx}`}>
                        {form === 1 ? (
                            <>
                                <mesh position={[0, layer.y, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[layer.radius, layer.radius, layer.height, 96]} />
                                    <meshStandardMaterial {...materialProps} />
                                </mesh>
                                <mesh position={[0, topY + 0.035, 0]} castShadow>
                                    <cylinderGeometry args={[layer.radius + 0.035, layer.radius + 0.035, 0.07, 96]} />
                                    <meshPhysicalMaterial
                                        color={icingColor.color}
                                        roughness={0.18}
                                        metalness={0}
                                        clearcoat={0.45}
                                        clearcoatRoughness={0.18}
                                    />
                                </mesh>
                                <mesh position={[0, topY - 0.02, 0]}>
                                    <torusGeometry args={[layer.radius - 0.02, 0.04, 14, 96]} />
                                    <meshPhysicalMaterial color={icingColor.color} roughness={0.2} />
                                </mesh>
                            </>
                        ) : (
                            <>
                                <mesh position={[0, layer.y, 0]} castShadow receiveShadow>
                                    <boxGeometry args={[layer.width, layer.height, layer.depth]} />
                                    <meshStandardMaterial {...materialProps} />
                                </mesh>
                                <mesh position={[0, topY + 0.035, 0]} castShadow>
                                    <boxGeometry args={[layer.width + 0.07, 0.07, layer.depth + 0.07]} />
                                    <meshPhysicalMaterial
                                        color={icingColor.color}
                                        roughness={0.18}
                                        metalness={0}
                                        clearcoat={0.45}
                                        clearcoatRoughness={0.18}
                                    />
                                </mesh>
                            </>
                        )}
                    </group>
                );
            })}
        </group>
    );
}

function ProceduralGoldCandle({ position, sizeMultiplier = 1 }) {
    return (
        <group position={position} scale={sizeMultiplier}>
            <mesh position={[0, 0.18, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.36, 24]} />
                <meshStandardMaterial color="#D4AF37" roughness={0.18} metalness={0.75} />
            </mesh>
            <mesh position={[0, 0.39, 0]} castShadow>
                <coneGeometry args={[0.055, 0.16, 24]} />
                <meshStandardMaterial color="#FFB12A" emissive="#FF8A00" emissiveIntensity={0.45} />
            </mesh>
            <pointLight position={[0, 0.45, 0]} intensity={0.35} color="#FFD891" distance={1.5} />
        </group>
    );
}

function ProceduralNumberCandle({ value, position, sizeMultiplier = 1 }) {
    const digits = String(Math.max(1, Math.min(100, Number(value) || 1)));
    const flamePositions = Array.from({ length: digits.length }, (_, idx) => (
        (idx - (digits.length - 1) / 2) * 0.22
    ));
    const numberTexture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 384;
        canvas.height = 192;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "900 128px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#8B6A16";
        ctx.fillStyle = "#D4AF37";
        ctx.strokeText(digits, canvas.width / 2, canvas.height / 2 + 4);
        ctx.fillText(digits, canvas.width / 2, canvas.height / 2 + 4);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }, [digits]);

    useEffect(() => () => numberTexture.dispose(), [numberTexture]);

    return (
        <group position={position} scale={sizeMultiplier}>
            <mesh position={[0, 0.25, 0.045]} castShadow>
                <planeGeometry args={[Math.max(0.42, digits.length * 0.24), 0.34]} />
                <meshBasicMaterial map={numberTexture} transparent side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {flamePositions.map((x, idx) => (
                <group key={`number-flame-${idx}`} position={[x, 0.48, 0.02]}>
                    <mesh castShadow>
                        <coneGeometry args={[0.035, 0.11, 18]} />
                        <meshStandardMaterial color="#FFB12A" emissive="#FF8A00" emissiveIntensity={0.4} />
                    </mesh>
                    <pointLight intensity={0.14} color="#FFD891" distance={1.1} />
                </group>
            ))}
        </group>
    );
}

function ProceduralCherry({ position, sizeMultiplier = 1 }) {
    return (
        <group position={position} scale={sizeMultiplier}>
            <mesh position={[0, 0.07, 0]} castShadow>
                <sphereGeometry args={[0.09, 28, 20]} />
                <meshPhysicalMaterial color="#C81532" roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.12} />
            </mesh>
            <mesh position={[0.045, 0.18, 0]} rotation={[0.45, 0.1, -0.4]} castShadow>
                <cylinderGeometry args={[0.01, 0.014, 0.22, 12]} />
                <meshStandardMaterial color="#376B2C" roughness={0.45} />
            </mesh>
        </group>
    );
}

function ProceduralSprinkles({ selectedTierIndex, form, position, sizeMultiplier = 1 }) {
    const sprinkles = useMemo(() => {
        const radius = TIER_TOP_RADIUS[selectedTierIndex] ?? 1;
        return Array.from({ length: 44 }, (_, idx) => {
            const angle = idx * 2.399963;
            const ring = Math.sqrt(((idx * 37) % 100) / 100);
            const x = Math.cos(angle) * radius * 0.58 * ring;
            const z = Math.sin(angle) * radius * 0.58 * ring;
            return {
                x: form === 1 ? x : Math.max(-radius * 0.6, Math.min(radius * 0.6, x)),
                z: form === 1 ? z : Math.max(-radius * 0.45, Math.min(radius * 0.45, z)),
                rotation: [Math.PI / 2, 0, angle],
                color: ["#E83F6F", "#F6D55C", "#3CAEA3", "#20639B", "#F26B38"][idx % 5],
            };
        });
    }, [selectedTierIndex, form]);

    return (
        <group position={position} scale={sizeMultiplier}>
            {sprinkles.map((item, idx) => (
                <mesh key={`sprinkle-${idx}`} position={[item.x, 0.035, item.z]} rotation={item.rotation} castShadow>
                    <boxGeometry args={[0.12, 0.018, 0.018]} />
                    <meshStandardMaterial color={item.color} roughness={0.35} />
                </mesh>
            ))}
        </group>
    );
}

// ───── CakeModel ─────
export function CakeModel({ selectedTierIndex }) {
    const tier1 = useGLTF(TIER_MODEL_URLS.tier1);
    const { nodes, materials } = tier1;
    const {
        form,
        cakeColor,
        icingColor,
        flavor,
        flavorTextureMap,
        selectedTierFlavors,
        candle,
        candleMode,
        candleNumber,
        chocolate,
        balls,
        nuts,
        cherry,
        sprinkles,
        toppingLayout,
        inscriptionText,
        textFont,
    } = useCustomization();
    const groupRef = useRef();

    const chocoTexture = useTexture(TEXTURE_URLS.choco);
    const milkshakeTexture = useTexture(TEXTURE_URLS.vanilla);
    const abstractTexture = useTexture(TEXTURE_URLS.ube);
    const cherryTexture = useTexture(TIER1_CHERRY_TEXTURE);
    const goldMaterial = useMemo(() => (
        new THREE.MeshStandardMaterial({ color: "#D4AF37", roughness: 0.18, metalness: 0.75 })
    ), []);

    const texturesByKey = {
        choco: chocoTexture,
        vanilla: milkshakeTexture,
        ube: abstractTexture,
    };

    const textureByFlavor = Object.fromEntries(
        Object.entries(flavorTextureMap).map(([flavorName, textureKey]) => [
            flavorName,
            texturesByKey[textureKey],
        ])
    );

    useEffect(() => {
        if (!cherryTexture) return;
        cherryTexture.colorSpace = THREE.SRGBColorSpace;
        cherryTexture.needsUpdate = true;
    }, [cherryTexture]);

    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
    });

    const selectedToppings = { candle, chocolate, balls, nuts, cherry, sprinkles };

    const renderGoldCandle = () => {
        const sizeMultiplier = TOPPING_SIZES[toppingLayout.candle.size] || 1;
        const position = getToppingPosition(toppingLayout.candle, TOPPING_3D_CONFIG.candle, selectedTierIndex);

        if (nodes.chandel?.geometry) {
            return (
                <mesh
                    geometry={nodes.chandel.geometry}
                    material={goldMaterial}
                    position={position}
                    rotation={TOPPING_3D_CONFIG.candle.rotation}
                    scale={Math.abs(TOPPING_3D_CONFIG.candle.scale) * sizeMultiplier}
                    castShadow
                />
            );
        }

        return <ProceduralGoldCandle position={position} sizeMultiplier={sizeMultiplier} />;
    };

    const renderCandleNumber = () => {
        return (
            <ProceduralNumberCandle
                value={candleNumber}
                position={getToppingPosition(toppingLayout.candle, TOPPING_3D_CONFIG.candle, selectedTierIndex)}
                sizeMultiplier={TOPPING_SIZES[toppingLayout.candle.size] || 1}
            />
        );
    };

    const renderCustomToppings = () => (
        <>
            {selectedToppings.candle && (candleMode === "number" ? renderCandleNumber() : renderGoldCandle())}

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

            {selectedToppings.cherry && (
                <ProceduralCherry
                    position={getToppingPosition(toppingLayout.cherry, TOPPING_3D_CONFIG.cherry, selectedTierIndex)}
                    sizeMultiplier={TOPPING_SIZES[toppingLayout.cherry.size] || 1}
                />
            )}

            {selectedToppings.sprinkles && (
                <ProceduralSprinkles
                    selectedTierIndex={selectedTierIndex}
                    form={form}
                    position={getToppingPosition(toppingLayout.sprinkles, TOPPING_3D_CONFIG.sprinkles, selectedTierIndex)}
                    sizeMultiplier={TOPPING_SIZES[toppingLayout.sprinkles.size] || 1}
                />
            )}
        </>
    );

    return (
        <group ref={groupRef} dispose={null} position={[0, -0.8, 0]}>
            <ProceduralCakeBody
                selectedTierIndex={selectedTierIndex}
                form={form}
                selectedTierFlavors={selectedTierFlavors?.length ? selectedTierFlavors : [flavor]}
                textureByFlavor={textureByFlavor}
                cakeColor={cakeColor}
                icingColor={icingColor}
            />

            {renderCustomToppings()}
            <CakeInscription selectedTierIndex={selectedTierIndex} text={inscriptionText} font={textFont} />
        </group>
    );
}


// ──────── DraggableTopping ────────
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

// ────── ToppingPlacementBoard ──────
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

// ────── Configurator ──────
function Configurator({ selectedTierIndex, setSelectedTierIndex, selectedSize, setSelectedSize }) {
    const {
        cakeColors, cakeColor, setCakeColor,
        icingColors, icingColor, setIcingColor,
        form, setForm,
        flavors, flavor, setFlavor,
        candle, setCandle,
        candleMode, setCandleMode,
        candleNumber, setCandleNumber,
        chocolate, setChocolate,
        balls, setBalls,
        nuts, setNuts,
        cherry, setCherry,
        sprinkles, setSprinkles,
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
    const toppingEnabled = { candle, chocolate, balls, nuts, cherry, sprinkles };
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
            icing_color: icingColor.color,
            flavor: activeTierFlavors[0] || flavor,
            tier: selectedTier.tier,
            size: selectedSize,
            tier_flavors: tierFlavorPayload,
            inscription_text: inscriptionText.trim(),
            text_font: textFont,
            topping_layout: {
                ...toppingLayout,
                candle: {
                    ...toppingLayout.candle,
                    mode: candleMode,
                },
            },
            has_candle: candle,
            candle_number: candleNumber,
            has_chocolate: chocolate,
            has_balls: balls,
            has_nuts: nuts,
            has_cherry: cherry,
            has_sprinkles: sprinkles,
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
        <aside className="w-full lg:w-[400px] h-full overflow-y-auto bg-[#FFFDF9]/95 backdrop-blur-xl border border-[#E6CCA2] rounded-2xl p-6 shadow-xl flex flex-col gap-6 custom-scrollbar">
            <h2 className="text-xl font-bold tracking-tight text-[#6E473B]">
                Design Your Cake
            </h2>

            {/* ── Tier & Size ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Tier Layout</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {CAKE_SIZES.map((item, idx) => (
                        <button
                            key={item.tier}
                            type="button"
                            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none active:scale-95 ${
                                selectedTierIndex === idx
                                    ? "bg-[#C05A11] border-[#C05A11] text-white font-semibold shadow-md shadow-[#C05A11]/20"
                                    : "bg-white border-[#E6CCA2] text-[#6E473B] hover:bg-[#FDF6E2]"
                            }`}
                            onClick={() => {
                                setSelectedTierIndex(idx);
                                setSelectedSize(CAKE_SIZES[idx].sizes[0]);
                            }}
                        >
                            {item.tier}
                        </button>
                    ))}
                </div>

                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-2">Base Dimensions</h3>
                <div className="relative w-full">
                    <select 
                        id="size-select" 
                        className="w-full px-4 py-2.5 text-sm rounded-xl bg-white border border-[#E6CCA2] text-[#6E473B] appearance-none focus:outline-none focus:border-[#C05A11] focus:ring-1 focus:ring-[#C05A11]/30 cursor-pointer" 
                        value={selectedSize} 
                        onChange={handleSizeChange}
                    >
                        {CAKE_SIZES[selectedTierIndex].sizes.map((s) => (
                            <option key={s} value={s} className="bg-white text-[#6E473B]">{s}</option>
                        ))}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A05A2C] pointer-events-none text-xs">▼</span>
                </div>
            </section>

            {/* ── Shape ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Cake Base Shape</h3>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none active:scale-95 ${
                            form === 1
                                ? "bg-[#C05A11] border-[#C05A11] text-white font-semibold shadow-md shadow-[#C05A11]/20"
                                : "bg-white border-[#E6CCA2] text-[#6E473B] hover:bg-[#FDF6E2]"
                        }`} 
                        onClick={() => setForm(1)}
                    >
                        ⭕ Round
                    </button>
                    <button 
                        type="button"
                        className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none active:scale-95 ${
                            form === 2
                                ? "bg-[#C05A11] border-[#C05A11] text-white font-semibold shadow-md shadow-[#C05A11]/20"
                                : "bg-white border-[#E6CCA2] text-[#6E473B] hover:bg-[#FDF6E2]"
                        }`} 
                        onClick={() => setForm(2)}
                    >
                        ⬜ Rectangle
                    </button>
                </div>
            </section>
{/* ── Cake Color ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Cake Color</h3>
                <div className="flex flex-wrap gap-2.5">
                    {cakeColors.map((c) => (
                        <button
                            key={c.name}
                            type="button"
                            className={`w-9 h-9 rounded-full border-2 transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 focus:outline-none ${
                                cakeColor.name === c.name 
                                    ? "border-[#C05A11] ring-2 ring-[#C05A11]/30 scale-105 shadow-md" 
                                    : "border-transparent shadow-sm"
                            }`}
                            style={{ background: c.color }}
                            title={c.name}
                            onClick={() => setCakeColor(c)}
                            aria-label={`Cake color ${c.name}`}
                        />
                    ))}
                </div>
            </section>

            {/* ── Icing Color ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Icing Color</h3>
                <div className="flex flex-wrap gap-2.5">
                    {icingColors.map((c) => (
                        <button
                            key={c.name}
                            type="button"
                            className={`group relative w-9 h-9 rounded-full border-2 transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 focus:outline-none ${
                                icingColor.name === c.name
                                    ? "border-[#C05A11] ring-2 ring-[#C05A11]/30 scale-105 shadow-md"
                                    : "border-transparent shadow-sm"
                            }`}
                            style={{ background: c.color }}
                            title={c.name}
                            onClick={() => setIcingColor(c)}
                            aria-label={`Icing color ${c.name}`}
                        >
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-medium text-[#A07060] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none capitalize">{c.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* ── Flavor ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">
                    {selectedTierIndex === 0 ? "Flavor" : "Tier Flavor Layout"}
                </h3>
                {selectedTierIndex === 0 ? (
                    <div className="flex flex-col gap-2">
                        {flavors.map((f) => (
                            <button
                                key={f}
                                type="button"
                                className={`w-full px-4 py-3 text-left text-sm font-medium rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none active:scale-[0.99] ${
                                    flavor === f 
                                        ? "bg-[#C05A11] border-[#C05A11] text-white font-semibold shadow-md shadow-[#C05A11]/20" 
                                        : "bg-white border-[#E6CCA2] text-[#6E473B] hover:bg-[#FFFDF9]"
                                }`}
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
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-[#A07060] italic">Choose the flavor for each tier in your cake layout.</p>
                        {Array.from({ length: selectedTierIndex + 1 }).map((_, idx) => (
                            <label className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-[#E6CCA2]" key={`tier-flavor-${idx}`}>
                                <span className="flex items-center gap-2 text-sm font-medium text-[#6E473B]">
                                    <span
                                        className="w-3 h-3 rounded-full border border-black/10 inline-block shadow-sm"
                                        style={{
                                            backgroundColor:
                                                FLAVOR_VISUALS[tierFlavors[CAKE_SIZES[selectedTierIndex]?.tierKey]?.[idx]]
                                                    ?.color || cakeColor.color,
                                        }}
                                    />
                                    {activeTierLabels[idx] ?? tierFlavorLabels[idx] ?? `Tier ${idx + 1}`}
                                </span>
                                <select
                                    className="px-3 py-1.5 text-xs rounded-lg bg-[#FFFDF9] border border-[#E6CCA2] text-[#6E473B] focus:outline-none focus:border-[#C05A11] cursor-pointer"
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
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Cake Message</h3>
                <div className="flex flex-col gap-2.5">
                    <input
                        className="w-full px-4 py-2.5 text-sm rounded-xl bg-white border border-[#E6CCA2] text-[#6E473B] placeholder-[#CBB294] focus:outline-none focus:border-[#C05A11] focus:ring-1 focus:ring-[#C05A11]/30 transition-all"
                        value={inscriptionText}
                        maxLength={48}
                        placeholder="Add text on top"
                        onChange={(event) => setInscriptionText(event.target.value)}
                    />
                    <div className="relative w-full">
                        <select
                            className="w-full px-4 py-2.5 text-sm rounded-xl bg-white border border-[#E6CCA2] text-[#6E473B] appearance-none focus:outline-none focus:border-[#C05A11] focus:ring-1 focus:ring-[#C05A11]/30 cursor-pointer"
                            value={textFont}
                            onChange={(event) => setTextFont(event.target.value)}
                        >
                            {TEXT_FONT_OPTIONS.map((fontOption) => (
                                <option key={fontOption.value} value={fontOption.value}>
                                    {fontOption.label}
                                </option>
                            ))}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A05A2C] pointer-events-none text-xs">▼</span>
                    </div>
                </div>
            </section>

            {/* ── Decorations ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Decorations</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: "🕯️ Candle", value: candle, set: setCandle },
                        { label: "🍫 Chocolate", value: chocolate, set: setChocolate },
                        { label: "🔮 Balls", value: balls, set: setBalls },
                        { label: "🥜 Nuts", value: nuts, set: setNuts },
                        { label: "🍒 Cherry", value: cherry, set: setCherry },
                        { label: "✨ Sprinkles", value: sprinkles, set: setSprinkles },
                    ].map(({ label, value, set }) => (
                        <button
                            key={label}
                            type="button"
                            className={`flex justify-between items-center px-3.5 py-2.5 text-xs font-medium rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none active:scale-95 ${
                                value 
                                    ? "bg-[#C05A11]/10 border-[#C05A11] text-[#A84E0E] font-semibold shadow-inner" 
                                    : "bg-white border-[#E6CCA2] text-[#6E473B] hover:bg-[#FFFDF9]"
                            }`}
                            onClick={() => set(!value)}
                        >
                            <span>{label}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${value ? "bg-[#C05A11] text-white" : "bg-[#E6CCA2] text-[#6E473B]"}`}>
                                {value ? "ON" : "OFF"}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Candle Mode ── */}
                {candle && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-[#E6CCA2] shadow-sm flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2 bg-[#FDF6E2] p-1 rounded-lg border border-[#ECD9B4]">
                            {[
                                { value: "gold", label: "Gold Chandel" },
                                { value: "number", label: "Number" },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`px-3 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                        candleMode === option.value
                                            ? "bg-[#C05A11] text-white shadow-sm"
                                            : "text-[#A07060] hover:text-[#6E473B]"
                                    }`}
                                    onClick={() => setCandleMode(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        {candleMode === "number" && (
                            <div>
                                <label className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-semibold text-[#6E473B] flex items-center gap-1.5">
                                        Candle Number
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FDF6E2] border border-[#ECD9B4] text-[#6E473B] font-bold text-sm hover:bg-[#C05A11] hover:text-white hover:border-[#C05A11] transition-all cursor-pointer active:scale-90"
                                            onClick={() => setCandleNumber(Math.max(1, candleNumber - 1))}
                                            disabled={candleNumber <= 1}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={candleNumber}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                if (!isNaN(val)) setCandleNumber(Math.max(1, Math.min(100, val)));
                                            }}
                                            className="w-14 text-center px-2 py-1.5 text-sm font-bold rounded-lg bg-[#FFFDF9] border border-[#E6CCA2] text-[#6E473B] focus:outline-none focus:border-[#C05A11] focus:ring-1 focus:ring-[#C05A11]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button
                                            type="button"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FDF6E2] border border-[#ECD9B4] text-[#6E473B] font-bold text-sm hover:bg-[#C05A11] hover:text-white hover:border-[#C05A11] transition-all cursor-pointer active:scale-90"
                                            onClick={() => setCandleNumber(Math.min(100, candleNumber + 1))}
                                            disabled={candleNumber >= 100}
                                        >
                                            +
                                        </button>
                                    </div>
                                </label>
                                <div className="mt-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={candleNumber}
                                        onChange={(e) => setCandleNumber(parseInt(e.target.value, 10))}
                                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#C05A11] bg-[#E6CCA2]"
                                    />
                                    <div className="flex justify-between text-[9px] text-[#A07060] mt-0.5 font-medium">
                                        <span>1</span>
                                        <span>25</span>
                                        <span>50</span>
                                        <span>75</span>
                                        <span>100</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Topping Placement ── */}
            <section className="p-5 rounded-xl bg-[#FDF6E2] border border-[#ECD9B4] shadow-sm transition-all hover:border-[#D8BE91]">
                <h3 className="text-xs font-semibold tracking-wider text-[#A05A2C] uppercase mb-3">Topping Placement</h3>
                {activeToppings.length > 0 ? (
                    <div className="flex flex-col gap-5">
                        <div className="flex justify-center p-2 bg-[#FFFDF9] rounded-2xl border border-[#E6CCA2]">
                            <ToppingPlacementBoard
                                form={form}
                                activeToppings={activeToppings}
                                toppingLayout={toppingLayout}
                                onMove={setToppingPosition}
                            />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {activeToppings.map((topping) => (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-[#E6CCA2] shadow-sm" key={topping.key}>
                                    <span className="flex items-center gap-2 text-xs font-semibold text-[#6E473B]">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                                            style={{ backgroundColor: topping.color }}
                                        />
                                        {topping.label}
                                    </span>
                                    <div className="flex gap-1 bg-[#FDF6E2] p-1 rounded-lg border border-[#ECD9B4]" aria-label={`${topping.label} size`}>
                                        {Object.keys(TOPPING_SIZES).map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                className={`px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md transition-all cursor-pointer ${
                                                    toppingLayout[topping.key].size === size 
                                                        ? "bg-[#C05A11] text-white shadow-sm" 
                                                        : "text-[#A07060] hover:text-[#6E473B]"
                                                }`}
                                                onClick={() => setToppingSize(topping.key, size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-xs text-[#A07060] italic bg-[#FFFDF9] rounded-xl border border-dashed border-[#E6CCA2]">
                        Select a decoration first.
                    </div>
                )}
            </section>

            {/* ── Randomize ── */}
            <button 
                type="button"
                className="w-full py-3 text-sm font-semibold text-[#C05A11] bg-white border-2 border-[#C05A11] rounded-xl shadow-sm hover:bg-[#C05A11]/5 active:scale-[0.98] transition-all cursor-pointer font-medium" 
                onClick={generateRandomCake}
            >
                🎲 Randomize My Cake!
            </button>

            {/* ── Price ── */}
            <div className="mt-2 pt-4 border-t border-[#E6CCA2]/60 flex flex-col gap-1.5">
                {pricingLoading && (
                    <div className="text-xs text-[#A07060] animate-pulse">Loading latest prices...</div>
                )}
                {pricingError && (
                    <div className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">{pricingError}</div>
                )}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#C05A11]/10 border border-[#C05A11]/20">
                    <span className="text-sm font-medium text-[#6E473B]">Total Price:</span>
                    <span className="text-xl font-black text-[#C05A11]">₱{calculatePrice().toFixed(2)}</span>
                </div>
            </div>

            {/* ── Add to Cart ── */}
            <button
                type="button"
                className="w-full py-3.5 bg-[#C05A11] hover:bg-[#A84E0E] text-white font-bold rounded-xl shadow-md shadow-[#C05A11]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-base text-center"
                onClick={handleAddToCart}
                disabled={isSubmitting || !!pricingError}
            >
                {isSubmitting ? "Adding..." : "🛒 Add to Cart"}
            </button>

            {orderStatus === "success" && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#2E7D32] text-white font-semibold text-sm px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
                    ✅ Added to cart! Redirecting...
                </div>
            )}
            {orderStatus === "error" && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#C62828] text-white font-semibold text-sm px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2">
                    ❌ {errorMessage}
                </div>
            )}
        </aside>
    );
}

// ────── BuildBentoContent ──────
function BuildBentoContent() {
    const {
        selectedTierIndex,
        setSelectedTierIndex,
        selectedSize,
        setSelectedSize,
    } = useCustomization();

    return (
        <div className="min-h-screen bg-[#FCF8EE] flex flex-col antialiased font-sans">
            <Navbar />

            {/* Main responsive wrapper layout */}
            <div className="max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
                
                {/* 3D Canvas Box - Slightly bigger for a clearer and more prominent preview */}
                <div className="flex-1 w-full h-[480px] md:h-[620px] relative bg-white border border-[#E6CCA2] rounded-2xl shadow-sm overflow-hidden flex flex-col lg:sticky lg:top-6">
                    <div className="w-full h-full relative">
                        <CanvasErrorBoundary>
                            <Canvas
                                dpr={[1, 2]}
                                camera={{ fov: 40, position: [0, 4, 5] }}
                                shadows
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
                                <color attach="background" args={["#FCF8EE"]} />

                                <fog attach="fog" args={["#FCF8EE", 16, 28]} />

                                <RealisticLighting />

                                <Suspense fallback={null}>
                                    <CakeModel selectedTierIndex={selectedTierIndex} />

                                    <ContactShadows
                                        position={[0, -2.3, 0]}
                                        opacity={0.18}
                                        scale={6}
                                        blur={2.5}
                                        color="#5C4033"
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
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FFFDF9]/90 backdrop-blur border border-[#E6CCA2] px-4 py-1.5 rounded-full text-[11px] font-medium text-[#A05A2C] shadow-sm select-none pointer-events-none tracking-wide uppercase">
                        🖱️ Drag to rotate · Scroll to zoom
                    </div>
                </div>

                {/* Configurator Side Column - Flows naturally alongside the enlarged preview */}
                <div className="w-full lg:w-auto">
                    <Configurator
                        selectedTierIndex={selectedTierIndex}
                        setSelectedTierIndex={setSelectedTierIndex}
                        selectedSize={selectedSize}
                        setSelectedSize={setSelectedSize}
                    />
                </div>
            </div>
        </div>
    );
}

// ────── Default export ──────
export default function BuildBentoPage() {
    return (
        <CustomizationProvider>
            <BuildBentoContent />
        </CustomizationProvider>
    );
}
