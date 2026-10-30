import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { getGroundedNutY } from "../src/utils/nutPlacement.js";
import { getChocolateQuaternion } from "../src/utils/chocolateRotation.js";
import { createToppingDragController } from "../src/utils/toppingDragController.js";
import { canCherryFitOnLedge, findToppingPosition, getTransformedToppingBox, TOPPING_PLACEMENT_GAP, TOPPING_SURFACE_OFFSET } from "../src/utils/toppingDragPlacement.js";
import * as tierConfig from "../src/components/cake/tierConfig.js";

// Cap outlines measured from the deployed models after their render transforms.
const measured = JSON.parse(readFileSync(new URL("./fixtures/cherryLedgeSurfaces.json", import.meta.url)));
const unitBox = new THREE.Box3(new THREE.Vector3(...measured.unitBounds.min), new THREE.Vector3(...measured.unitBounds.max));
const source = readFileSync(new URL("../src/components/cake/CakeTierScene.jsx", import.meta.url), "utf8")
    .replace(/^import .+;\r?$/gm, "").replace(/^export /gm, "");
const { code } = await transformWithOxc(source, "CakeTierScene.jsx", { jsx: { runtime: "classic" } });
const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };

function cakeScene(model) {
    const scene = new THREE.Group();
    model.tiers.forEach((tier, index) => {
        const shape = new THREE.Shape(tier.outline.map(([x, z]) => new THREE.Vector2(x, -z)));
        const bottom = model.tiers[index + 1]?.topY || 0;
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: tier.topY - bottom, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2).translate(0, bottom, 0);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
        mesh.name = model.round ? "cake_round" : "cake_rectangle";
        scene.add(mesh);
    });
    return scene;
}

function cherryGeometry() {
    return new THREE.BoxGeometry(...unitBox.getSize(new THREE.Vector3()).toArray())
        .translate(...unitBox.getCenter(new THREE.Vector3()).toArray());
}

function renderCherries(model, layouts) {
    const scene = cakeScene(model);
    const state = {
        form: model.round ? 1 : 2, candle: false, chocolate: false, balls: false, nuts: false, sprinkles: false,
        cherry: true, cherryLayouts: layouts, chocolateLayouts: [], cakeColor: { color: "#683434" }, icingColor: { color: "#683434" },
        flavors: ["Choco Moist"], flavorTextureMap: { "Choco Moist": "choco" },
        tierFlavors: { [`tier${model.count}`]: Array(model.count).fill("Choco Moist") },
        tierFlavorOverrides: { [`tier${model.count}`]: Array(model.count).fill(false) },
        toppingLayout: { balls: { size: "small" }, candle: { size: "small" } }, inscriptionLayout: {}, inscriptionText: "",
    };
    const { CakeTierScene, TOPPING_3D_CONFIG } = runInNewContext(`${code}\n;({ CakeTierScene, TOPPING_3D_CONFIG });`, {
        React, THREE, ...tierConfig, getGroundedNutY, getChocolateQuaternion, findToppingPosition, TOPPING_PLACEMENT_GAP, TOPPING_SURFACE_OFFSET,
        TOPPING_SIZES: { small: 0.8, medium: 1, large: 1.2 }, DEFAULT_FLAVOR: "Choco Moist", FLAVOR_VISUALS: {},
        useCustomization: () => state, useGLTF: () => ({ scene, nodes: { cherry: new THREE.Mesh(cherryGeometry()) }, materials: {} }),
        useMemo: fn => fn(), useRef: value => ({ current: value }), useEffect() {}, useLayoutEffect: fn => fn(), useFrame() {},
        useTexture: urls => Object.fromEntries(Object.keys(urls).map(key => [key, new THREE.Texture()])),
        useToppingDragPlacement: () => ({ isDragging: { current: false } }), DraggableCakeTopping: "DraggableCakeTopping", CakeInscription: "CakeInscription",
    });
    const rendered = CakeTierScene({ selectedTierIndex: model.count - 1, cakeGroupRef: { current: new THREE.Group() }, controlsRef: { current: {} } });
    const meshes = [];
    const visit = element => {
        if (Array.isArray(element)) element.forEach(visit);
        else if (element?.props) {
            if (element.type === "mesh") meshes.push(element);
            visit(element.props.children);
        }
    };
    visit(rendered);
    return { scale: TOPPING_3D_CONFIG.cherry.scale, meshes };
}

test("every cherry uses one measured fixed scale, including legacy saved sizes and every cake tier", () => {
    for (const model of [...measured.models, { ...measured.models[0], count: 1, tiers: [measured.models[0].tiers.at(-1)] }]) {
        const { scale, meshes } = renderCherries(model, ["small", "medium", "large", undefined].map(size => ({ x: 50, y: 50, size })));
        assert.equal(scale, 0.00606);
        assert.equal(meshes.length, 4);
        assert.ok(meshes.every(mesh => mesh.props.scale === scale));
        assert.ok(meshes.every(mesh => mesh.props.position.every(Number.isFinite)));
    }
});

test("fixed-size cherries fit and drag flush around every measured lower ledge without state updates per move", () => {
    for (const model of measured.models) {
        const scale = renderCherries(model, [{ x: 50, y: 50 }]).scale;
        const parent = new THREE.Group();
        const scene = cakeScene(model);
        parent.add(scene);
        let commits = 0, warnings = 0;
        const state = { form: model.round ? 1 : 2, selectedTierIndex: model.count - 1, toppingLayout: {}, cherryLayouts: [{ x: 50, y: 50 }],
            setToppingPosition(id, x, y, position) { commits++; this.cherryLayouts[0] = { x, y, position }; } };
        const store = { publish() {}, clear() {} };
        const controller = createToppingDragController({ getCurrent: () => ({ scene, cakeGroupRef: { current: parent }, controlsRef: { current: {} }, state }), store,
            onCherryFitRejected: () => warnings++, eventTarget: new EventTarget(), scheduleFrame() {} });
        store.controller = controller;
        controller.reconcile();
        const object = new THREE.Group();
        object.matrixAutoUpdate = false;
        const anchor = new THREE.Vector3(0, model.tiers[0].topY, 0);
        const mesh = new THREE.Mesh(cherryGeometry());
        mesh.scale.setScalar(scale);
        mesh.position.copy(anchor);
        object.add(mesh);
        parent.add(object);
        const box = getTransformedToppingBox(object, parent).translate(anchor.clone().negate());
        controller.register("cherry-0", { id: "cherry-0", object, anchor, box, messageBox: box, layout: state.cherryLayouts[0], insertionDepth: 0 });
        controller.reconcile();
        commits = 0;
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 20, 0);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);
        camera.updateWorldMatrix(true, false);
        const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }) };
        const pointer = position => { const screen = position.clone().project(camera); return { x: (screen.x + 1) * 300, y: (1 - screen.y) * 300, pointerId: 7 }; };
        controller.begin("cherry-0");
        controller.startPointer("cherry-0", null, camera, canvas, pointer(controller.entries.get("cherry-0").position));
        const surface = controller.placementBounds(controller.entries.get("cherry-0")).surface;
        const radiusAt = (tier, cx, cz, dx, dz) => Math.min(...tier.outline.map((a, index) => {
            const b = tier.outline[(index + 1) % tier.outline.length];
            const nx = b.z - a.z, nz = a.x - b.x;
            const denominator = nx * dx + nz * dz;
            return denominator > 1e-10 ? (nx * (a.x - cx) + nz * (a.z - cz)) / denominator : Infinity;
        }));
        let last;
        for (let index = 1; index < surface.tiers.length; index++) {
            const tier = surface.tiers[index], upper = surface.tiers[index - 1];
            const cx = (tier.minX + tier.maxX) / 2, cz = (tier.minZ + tier.maxZ) / 2;
            for (let step = 0; step < 72; step++) {
                const angle = step * Math.PI / 36, dx = Math.cos(angle), dz = Math.sin(angle);
                const radius = (radiusAt(tier, cx, cz, dx, dz) + radiusAt(upper, cx, cz, dx, dz)) / 2;
                const center = box.getCenter(new THREE.Vector3());
                const target = new THREE.Vector3(cx + radius * dx - center.x, tier.topY - box.min.y, cz + radius * dz - center.z);
                assert.equal(canCherryFitOnLedge({ box, position: target, surface }), true);
                last = pointer(target);
                controller.pointerMove({ clientX: last.x, clientY: last.y, pointerId: 7 }, camera, canvas);
                controller.update(1 / 60);
                const entry = controller.entries.get("cherry-0");
                const bounds = getTransformedToppingBox(object, parent);
                assert.ok(Math.abs(bounds.min.y - tier.topY - TOPPING_SURFACE_OFFSET) < 1e-6, `${model.count} tiers, round=${model.round}, ledge=${index}, angle=${step * 5}`);
                assert.equal(controller.valid(entry, entry.position), true);
                assert.equal(mesh.scale.x, scale);
                assert.equal(object.scale.x, 1);
                assert.equal(commits, 0);
            }
        }
        controller.pointerUp({ clientX: last.x, clientY: last.y, pointerId: 7 }, camera, canvas);
        controller.reconcile();
        assert.equal(commits, 1);
        assert.equal(warnings, 0);
        assert.equal(Object.hasOwn(state.cherryLayouts[0], "size"), false);
    }
});

test("cherry size controls are absent while other topping size controls remain", async () => {
    const page = readFileSync(new URL("../src/pages/BuildBentoPage.jsx", import.meta.url), "utf8");
    const start = page.indexOf("{activeToppings.map((topping) => (", page.indexOf('<div className="flex flex-col gap-2.5">'));
    const finish = page.indexOf("{chocolate && chocolateLayouts.map", start);
    const { code: controls } = await transformWithOxc(`function Sizes() { return <>${page.slice(start, finish)}</>; }`, "Sizes.jsx", { jsx: { runtime: "classic" } });
    const { Sizes } = runInNewContext(`${controls}\n;({ Sizes });`, { React, activeToppings: [{ key: "cherry-0", label: "Cherry 1" }, { key: "candle", label: "Candle" }],
        TOPPING_SIZES: { small: 0.8, medium: 1, large: 1.2 }, placementLayout: { candle: { size: "small" } }, setToppingSize() {} });
    const rows = Sizes().props.children[0];
    assert.equal(rows[0].props.children[1], false);
    assert.equal(rows[1].props.children[1].props["aria-label"], "Candle size");
});
