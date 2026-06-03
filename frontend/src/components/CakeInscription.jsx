// src/components/CakeInscription.jsx
import { useMemo, useCallback } from "react";
import * as THREE from "three";
import { Text as ThreeText } from "three-text/mesh/react";
import { TEXT_FONT_OPTIONS } from "../contexts/Customization";

ThreeText.setHarfBuzzPath("/hb/hb.wasm");

const TEXT_LAYOUT_BY_TIER = [
    { y: 2.35, width: 1.55, size: 0.22, z: 0.22 },
    { y: 1.80, width: 1.28, size: 0.18, z: 0.18 },
    { y: 2.30, width: 1.05, size: 0.16, z: 0.12 },
    { y: 2.75, width: 0.86, size: 0.13, z: 0.10 },
];

const FONT_PATHS = Object.fromEntries(
    TEXT_FONT_OPTIONS.map((fontOption) => [fontOption.value, fontOption.path])
);

const cleanInscription = (text) =>
    text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 48);

export function CakeInscription({ selectedTierIndex, text = "", font = "classic" }) {
    const safeText = cleanInscription(text);
    const layout = TEXT_LAYOUT_BY_TIER[selectedTierIndex] ?? TEXT_LAYOUT_BY_TIER[0];
    const fontPath = FONT_PATHS[font] ?? TEXT_FONT_OPTIONS[0].path;

    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#fff7ea",
                emissive: "#4a1f14",
                emissiveIntensity: 0.18,
                roughness: 0.42,
                metalness: 0.02,
                side: THREE.DoubleSide,
            }),
        []
    );

    const centerGeometry = useCallback((geometry) => {
        geometry.computeBoundingBox();
        geometry.center();
        geometry.computeBoundingBox();
    }, []);

    if (!safeText) return null;

    return (
        <ThreeText
            font={fontPath}
            size={layout.size}
            depth={0.018}
            lineHeight={0.82}
            letterSpacing={0.01}
            removeOverlaps
            layout={{
                width: layout.width,
                align: "center",
                respectExistingBreaks: true,
            }}
            material={material}
            position={[0, layout.y, layout.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            onLoad={centerGeometry}
            onError={(error) => console.error("Cake inscription failed:", error)}
        >
            {safeText}
        </ThreeText>
    );
}

export default CakeInscription;
