// src/components/Cake.jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useCustomization } from "../contexts/Customization.jsx";
import {
    LinearEncoding,
    sRGBEncoding,
    LinearMipmapLinearFilter,
    LinearFilter
} from "three";
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from "three";

// ── Tier layer layout definitions ──
// Each tier config defines layers from bottom to top with positions and dimensions
const TIER_LAYER_LAYOUTS = [
    // 1 Tier
    [{ y: 1.35, height: 1.75, radius: 1.02, width: 1.95, depth: 1.55 }],
    // 2 Tier
    [
        { y: 0.95, height: 1.20, radius: 1.10, width: 2.10, depth: 1.60 },
        { y: 1.85, height: 0.78, radius: 0.74, width: 1.42, depth: 1.12 },
    ],
    // 3 Tier
    [
        { y: 0.78, height: 1.02, radius: 1.15, width: 2.22, depth: 1.70 },
        { y: 1.58, height: 0.76, radius: 0.84, width: 1.62, depth: 1.26 },
        { y: 2.24, height: 0.58, radius: 0.58, width: 1.12, depth: 0.88 },
    ],
    // 4 Tier
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

const FLAVOR_VISUALS = {
    "Choco Moist": { color: "#8B4513" },
    "Vanilla Chiffon": { color: "#F3E5AB" },
    "Ube Chiffon": { color: "#A56BFF" },
};

const getFlavorMaterialProps = (flavorName, textureByFlavor, fallbackColor) => ({
    color: FLAVOR_VISUALS[flavorName]?.color || fallbackColor,
    roughness: 0.65,
    metalness: 0.0,
    ...(textureByFlavor[flavorName] || {}),
});

// ── Cake Stand ──
function CakeStand() {
    return (
        <group position={[0, 0.02, 0]}>
            {/* Platform */}
            <mesh position={[0, -0.12, 0]} receiveShadow>
                <cylinderGeometry args={[1.55, 1.65, 0.18, 96]} />
                <meshStandardMaterial color="#E9D8B5" roughness={0.38} metalness={0.12} />
            </mesh>
            {/* Gold rim */}
            <mesh position={[0, -0.03, 0]}>
                <torusGeometry args={[1.45, 0.055, 16, 96]} />
                <meshStandardMaterial color="#C8A766" roughness={0.28} metalness={0.45} />
            </mesh>
        </group>
    );
}

// ── Procedural Cake Body (multi-tier with icing) ──
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
                                {/* Round cake body */}
                                <mesh position={[0, layer.y, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[layer.radius, layer.radius, layer.height, 96]} />
                                    <meshStandardMaterial {...materialProps} />
                                </mesh>
                                {/* Icing cap */}
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
                                {/* Icing drip ring */}
                                <mesh position={[0, topY - 0.02, 0]}>
                                    <torusGeometry args={[layer.radius - 0.02, 0.04, 14, 96]} />
                                    <meshPhysicalMaterial color={icingColor.color} roughness={0.2} />
                                </mesh>
                            </>
                        ) : (
                            <>
                                {/* Rectangle cake body */}
                                <mesh position={[0, layer.y, 0]} castShadow receiveShadow>
                                    <boxGeometry args={[layer.width, layer.height, layer.depth]} />
                                    <meshStandardMaterial {...materialProps} />
                                </mesh>
                                {/* Icing cap */}
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

// ── Texture URLs ──
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

// ── Main Cake component ──
export function Cake(props) {
    const {
        flavor,
        flavorTextureMap,
        form,
        cakeColor,
        icingColor,
        nuts,
        chocolate,
        balls,
        candle,
        candleNumber,
        selectedTierIndex = 0,
        selectedTierFlavors,
    } = useCustomization();

    const groupRef = useRef();
    const { gl } = useThree();

    // Load the tier1 GLTF for topping meshes (nuts, chocolate bar, balls, candle)
    const { nodes, materials } = useGLTF('https://cake-assets-decc.patrickticoy78.workers.dev/tier1/tier1.gltf');

    // Load textures
    const chocoTexture = useTexture(TEXTURE_URLS.choco);
    const vanillaTexture = useTexture(TEXTURE_URLS.vanilla);
    const ubeTexture = useTexture(TEXTURE_URLS.ube);

    const texturesByKey = useMemo(() => ({
        choco: chocoTexture,
        vanilla: vanillaTexture,
        ube: ubeTexture,
    }), [chocoTexture, vanillaTexture, ubeTexture]);

    const textureByFlavor = useMemo(() =>
        Object.fromEntries(
            Object.entries(flavorTextureMap).map(([flavorName, textureKey]) => [
                flavorName,
                texturesByKey[textureKey],
            ])
        ), [flavorTextureMap, texturesByKey]
    );

    // Apply texture settings
    useEffect(() => {
        const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
        Object.values(texturesByKey).forEach((textureGroup) => {
            Object.keys(textureGroup).forEach((key) => {
                const texture = textureGroup[key];
                if (texture) {
                    texture.encoding = key === 'map' ? sRGBEncoding : LinearEncoding;
                    texture.anisotropy = maxAnisotropy;
                    texture.minFilter = LinearMipmapLinearFilter;
                    texture.magFilter = LinearFilter;
                    texture.generateMipmaps = true;
                }
            });
        });
    }, [gl, texturesByKey]);

    // Realistic icing material for legacy topping overlay
    const creamMaterial = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(icingColor.color),
            roughness: 0.12,
            metalness: 0.0,
            clearcoat: 0.6,
            clearcoatRoughness: 0.15,
            sheen: 0.3,
            sheenRoughness: 0.4,
            sheenColor: new THREE.Color(icingColor.color).multiplyScalar(1.3),
            envMapIntensity: 1.5,
            side: THREE.DoubleSide,
        });
    }, [icingColor]);

    // Gold material for candle
    const goldMaterial = useMemo(() => (
        new THREE.MeshStandardMaterial({ color: "#D4AF37", roughness: 0.18, metalness: 0.75 })
    ), []);

    // Slow auto-rotation
    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
    });

    // Calculate top surface Y position for placing toppings
    const topSurfaceY = TIER_TOP_Y[selectedTierIndex] ?? TIER_TOP_Y[0];

    // Build layer flavors
    const layerFlavors = selectedTierFlavors?.length
        ? selectedTierFlavors
        : [flavor];

    return (
        <group {...props} ref={groupRef} dispose={null} position={[0, -0.8, 0]}>
            {/* ── Procedural multi-tier cake body ── */}
            <ProceduralCakeBody
                selectedTierIndex={selectedTierIndex}
                form={form}
                selectedTierFlavors={layerFlavors}
                textureByFlavor={textureByFlavor}
                cakeColor={cakeColor}
                icingColor={icingColor}
            />

            {/* ── Toppings placed on top of the highest tier ── */}

            {/* Candle */}
            {candle && nodes.chandel?.geometry && (
                <mesh
                    geometry={nodes.chandel.geometry}
                    material={goldMaterial}
                    position={[0, topSurfaceY + 0.03, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    scale={0.03}
                    castShadow
                />
            )}

            {/* Candle fallback (procedural gold candle) */}
            {candle && !nodes.chandel?.geometry && (
                <group position={[0, topSurfaceY, 0]}>
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
            )}

            {/* Nuts */}
            {nodes.Mesh021?.geometry && nodes.Mesh021_1?.geometry && (
                <group
                    position={[0.08, topSurfaceY + 0.02, 0.42]}
                    rotation={[Math.PI / 2, 0, -2.81]}
                    scale={0.18}
                    visible={nuts}
                >
                    <mesh geometry={nodes.Mesh021.geometry} material={materials.Default} />
                    <mesh geometry={nodes.Mesh021_1.geometry} material={materials.Default} />
                </group>
            )}

            {/* Chocolate Bar */}
            {nodes.bar?.geometry && (
                <mesh
                    geometry={nodes.bar.geometry}
                    material={materials.choco}
                    position={[0, topSurfaceY + 0.06, 0]}
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
                    position={[0.27, topSurfaceY + 0.05, -0.05]}
                    rotation={[-2.24, 0.35, -0.42]}
                    scale={-0.06}
                    visible={balls}
                />
            )}
        </group>
    );
}

useGLTF.preload('https://cake-assets-decc.patrickticoy78.workers.dev/tier1/tier1.gltf');
useGLTF.preload('https://cake-assets-decc.patrickticoy78.workers.dev/tier2/tier2.gltf');
useGLTF.preload('https://cake-assets-decc.patrickticoy78.workers.dev/tier3/tier3.gltf');
useGLTF.preload('https://cake-assets-decc.patrickticoy78.workers.dev/tier4/tier4.gltf');