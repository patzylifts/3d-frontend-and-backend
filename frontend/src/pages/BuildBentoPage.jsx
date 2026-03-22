import { useRef, Suspense } from "react";

import { Canvas, useFrame } from "@react-three/fiber";

import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";

import { useNavigate } from "react-router-dom";

import * as THREE from "three";

import { CustomizationProvider, useCustomization } from "../contexts/Customization";

import "./BuildBentoPage.css";



/* ─────────────────────────────── 3D MODEL ─────────────────────────────── */



function CakeModel() {

    const { scene } = useGLTF("/models/cake.gltf");

    const { cakeColor, creamColor, candle, chocolate, balls, nuts } = useCustomization();

    const groupRef = useRef();



    // Slow auto-rotation

    useFrame((_, delta) => {

        if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;

    });



    // Apply color overrides and toggle visibility each frame

    useFrame(() => {

        scene.traverse((obj) => {

            if (!obj.isMesh) return;



            const n = obj.name.toLowerCase();

            const matName = obj.material?.name?.toLowerCase() ?? "";



            // Cake body color

            if (matName === "cake") {

                obj.material = obj.material.clone();

                obj.material.color = new THREE.Color(cakeColor.color);

            }

            // Cream color

            if (matName === "cream") {

                obj.material = obj.material.clone();

                obj.material.color = new THREE.Color(creamColor.color);

            }



            // Decoration visibility via node name

            if (n === "chandel") obj.visible = candle;

            if (n === "bar")     obj.visible = chocolate;

            if (n === "balls")   obj.visible = balls;

            if (n === "nuts")    obj.visible = nuts;

        });

    });



    return (

        <group ref={groupRef}>

            <primitive object={scene} scale={0.9} position={[0, -1.2, 0]} />

        </group>

    );

}



/* ─────────────────────────────── CONFIGURATOR PANEL ─────────────────────────────── */



function Configurator() {

    const {

        cakeColors, cakeColor, setCakeColor,

        creamColors, creamColor, setCreamColor,

        candle, setCandle,

        chocolate, setChocolate,

        balls, setBalls,

        nuts, setNuts,

        fillings, filling, setFilling,

        doughTypes, dough, setDough,

        generateRandomCake,

    } = useCustomization();



    return (

        <aside className="cfg-panel">

            <h2 className="cfg-title">🎂 Design Your Cake</h2>



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



            {/* ── Cream Color ── */}

            <section className="cfg-section">

                <h3 className="cfg-label">Cream Color</h3>

                <div className="cfg-swatches">

                    {creamColors.map((c) => (

                        <button

                            key={c.name}

                            className={`swatch ${creamColor.name === c.name ? "swatch--active" : ""}`}

                            style={{ background: c.color }}

                            title={c.name}

                            onClick={() => setCreamColor(c)}

                            aria-label={`Cream color ${c.name}`}

                        />

                    ))}

                </div>

            </section>



            {/* ── Filling ── */}

            <section className="cfg-section">

                <h3 className="cfg-label">Filling</h3>

                <div className="cfg-chips">

                    {fillings.map((f) => (

                        <button

                            key={f}

                            className={`chip ${filling === f ? "chip--active" : ""}`}

                            onClick={() => setFilling(f)}

                        >

                            {f}

                        </button>

                    ))}

                </div>

            </section>



            {/* ── Dough ── */}

            <section className="cfg-section">

                <h3 className="cfg-label">Dough Type</h3>

                <div className="cfg-chips">

                    {doughTypes.map((d) => (

                        <button

                            key={d}

                            className={`chip ${dough === d ? "chip--active" : ""}`}

                            onClick={() => setDough(d)}

                        >

                            {d}

                        </button>

                    ))}

                </div>

            </section>



            {/* ── Decorations ── */}

            <section className="cfg-section">

                <h3 className="cfg-label">Decorations</h3>

                <div className="cfg-toggles">

                    {[

                        { label: "🕯️ Candle",    value: candle,    set: setCandle },

                        { label: "🍫 Chocolate",  value: chocolate, set: setChocolate },

                        { label: "🔮 Balls",      value: balls,     set: setBalls },

                        { label: "🥜 Nuts",       value: nuts,      set: setNuts },

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



            {/* ── Randomize ── */}

            <button className="cfg-random-btn" onClick={generateRandomCake}>

                🎲 Randomize My Cake!

            </button>

        </aside>

    );

}



/* ─────────────────────────────── PAGE ─────────────────────────────── */



function BuildBentoContent() {

    const navigate = useNavigate();



    return (

        <div className="build-page">

            {/* Top nav */}

            <header className="build-nav">

                <button className="build-back-btn" onClick={() => navigate("/")}>

                    ← Back

                </button>

                <span className="build-brand">🍰 Smiley Page Corner · Cake Builder</span>

            </header>



            <div className="build-layout">

                {/* 3D Canvas */}

                <div className="build-canvas-wrap">

                    <Canvas

                        dpr={[1, 2]}

                        camera={{ fov: 45, position: [0, 2, 7] }}

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

                                position={[0, -1.5, 0]}

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

                        />

                    </Canvas>



                    <div className="canvas-hint">🖱️ Drag to rotate · Scroll to zoom</div>

                </div>



                {/* Configurator side panel */}

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