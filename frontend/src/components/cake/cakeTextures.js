import * as THREE from "three";

// These optimized local assets were generated from cake-assets commit 94d6637d22bcd802effa1525834f1da59d71d3ab.
export const TIER_MODEL_URLS = {
    tier1: "https://cake-assets-decc.patrickticoy78.workers.dev/tier1/tier1.gltf",
    tier2: "https://cake-assets-decc.patrickticoy78.workers.dev/tier2/tier2.gltf",
    tier3: "https://cake-assets-decc.patrickticoy78.workers.dev/tier3/tier3.gltf",
    tier4: "https://cake-assets-decc.patrickticoy78.workers.dev/tier4/tier4.gltf",
};

export const CAKE_TEXTURE_URLS = {
    choco: {
        map: "/textures/cake-flavors/choco_chiffon/Abstract_Organic_007_basecolor.jpg",
        normalMap: "/textures/cake-flavors/choco_chiffon/Abstract_Organic_006_normal.jpg",
        roughnessMap: "/textures/cake-flavors/choco_chiffon/Abstract_Organic_006_roughness.jpg",
        aoMap: "/textures/cake-flavors/choco_chiffon/Abstract_Organic_006_ambientOcclusion.jpg",
    },
    vanilla: {
        map: "/textures/cake-flavors/vanilla/vanilla_chiffon_diffuseOriginal.jpg",
        normalMap: "/textures/cake-flavors/vanilla/vanilla_chiffon_normal.jpg",
        roughnessMap: "/textures/cake-flavors/vanilla/vanilla_chiffon_roughness.jpg",
        aoMap: "/textures/cake-flavors/vanilla/vanilla_chiffon_ao.jpg",
    },
    ube: {
        map: "/textures/cake-flavors/ube/ube_chiffon_diffuseOriginal.jpg",
        normalMap: "/textures/cake-flavors/ube/ube_chiffon_normal.jpg",
        roughnessMap: "/textures/cake-flavors/ube/ube_chiffon_roughness.jpg",
        aoMap: "/textures/cake-flavors/ube/ube_chiffon_ao.jpg",
    },
};

const textureCache = new Map();
const textureSetCache = new Map();
const textureLoader = new THREE.TextureLoader();

export const getFlavorTextureKeys = (flavors, flavorTextureMap = {}) => [
    ...new Set(flavors.map((flavor) => flavorTextureMap[flavor] || "choco")),
];

export const getFlavorTextureUrls = (textureKeys) => Object.fromEntries(
    textureKeys.flatMap((key) => Object.entries(CAKE_TEXTURE_URLS[key]).map(
        ([property, url]) => [`${key}_${property}`, url]
    ))
);

function loadCakeTexture(url, key) {
    if (!textureCache.has(url)) {
        const request = (async () => {
            try {
                const texture = await textureLoader.loadAsync(url);
                texture.colorSpace = key === "cherry" || key.endsWith("_map")
                    ? THREE.SRGBColorSpace
                    : THREE.NoColorSpace;
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                return texture;
            } catch (error) {
                textureCache.delete(url);
                console.warn(`Could not load cake texture "${url}"; using a solid-color material.`, error);
                return null;
            }
        })();
        textureCache.set(url, request);
    }

    return textureCache.get(url);
}

export function loadCakeTextureSet(urls) {
    const entries = Object.entries(urls);
    const cacheKey = JSON.stringify(entries);
    if (!textureSetCache.has(cacheKey)) {
        const request = Promise.all(entries.map(async ([key, url]) => [
            key,
            await loadCakeTexture(url, key),
        ])).then((loadedTextures) => {
            const textures = Object.fromEntries(loadedTextures);
            if (loadedTextures.some(([, texture]) => !texture)) {
                textureSetCache.delete(cacheKey);
            }
            return textures;
        });
        textureSetCache.set(cacheKey, request);
    }

    return textureSetCache.get(cacheKey);
}

export function clearCakeTextureSet(urls) {
    textureSetCache.delete(JSON.stringify(Object.entries(urls)));
}

async function preloadTextureUrls(urls) {
    const textures = await loadCakeTextureSet(urls);
    const failedKeys = Object.keys(textures).filter((key) => !textures[key]);
    if (failedKeys.length) {
        clearCakeTextureSet(urls);
        throw new Error(`Could not load required cake textures: ${failedKeys.join(", ")}`);
    }
}

export function preloadCakeTextureKeys(textureKeys) {
    return preloadTextureUrls(getFlavorTextureUrls(textureKeys));
}
