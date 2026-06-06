// src/components/admin/CakePreview3D.jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { CakeModel } from "../../pages/BuildBentoPage.jsx";
import { CAKE_SIZES, CustomizationProvider } from "../../contexts/Customization";

export default function CakePreview3D({ customization }) {

    const tierIndex = CAKE_SIZES.findIndex(
        t => t.tier === customization?.tier
    );

    const safeTierIndex = tierIndex === -1 ? 0 : tierIndex;

    return (
        <CustomizationProvider initialState={customization}>
            <div style={{ width: "100%", height: "100%" }}>
                <Canvas camera={{ fov: 40, position: [0, 4, 5] }}>

                    {/* lights */}
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[5, 8, 5]} intensity={1.4} />
                    <pointLight position={[-4, 4, -4]} intensity={0.6} />
                    <pointLight position={[4, 2, 4]} intensity={0.4} />

                    {/* LANDMARK: now CakeModel reads REAL saved state */}
                    <CakeModel selectedTierIndex={safeTierIndex} />

                    <ContactShadows
                        position={[0, -2.3, 0]}
                        opacity={0.5}
                        scale={6}
                        blur={2}
                    />

                    <Environment preset="city" />

                    <OrbitControls
                        enablePan={false}
                        minDistance={3}
                        maxDistance={12}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 2}
                        target={[0, 1.2, 0]}
                    />
                </Canvas>
            </div>
        </CustomizationProvider>
    );
}