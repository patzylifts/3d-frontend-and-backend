import { Component, lazy, Suspense, use, useEffect, useLayoutEffect } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { TIER_MODEL_URLS, clearCakeTextureSet, getFlavorTextureUrls, loadCakeTextureSet, preloadCakeTextureKeys } from "./cakeTextures";
import { getTierLoadingPosition } from "./tierConfig";

// Keep the scene and its draggable message mounted while the tier model changes.
const Tier = lazy(() => import("./CakeTierScene").then((module) => ({ default: module.CakeTierScene })));

useGLTF.preload(TIER_MODEL_URLS.tier1);
preloadCakeTextureKeys(["choco"]).catch((error) => {
    console.warn("Could not preload the default cake textures.", error);
});

function CakeAssetPreloaderContent({ request, onComplete }) {
    const modelUrl = TIER_MODEL_URLS[`tier${request.tierIndex + 1}`] || TIER_MODEL_URLS.tier1;
    const textureUrls = getFlavorTextureUrls(request.textureKeys);
    if (request.includeCherry) textureUrls.cherry = "/models/tier1/Cherry.jpg";

    const textureRequest = loadCakeTextureSet(textureUrls);
    useGLTF.preload(modelUrl);
    useGLTF(modelUrl);
    const textures = use(textureRequest);

    useEffect(() => {
        const failedTextures = Object.keys(textures).filter((key) => !textures[key]);
        if (failedTextures.length) {
            clearCakeTextureSet(textureUrls);
            onComplete(false, new Error(`Could not load cake textures: ${failedTextures.join(", ")}`));
            return;
        }
        onComplete(true);
    }, [onComplete, textureUrls, textures]);

    return null;
}

class CakeAssetPreloaderBoundary extends Component {
    componentDidCatch(error) {
        console.warn("Could not preload the next cake; keeping the current cake.", error);
        this.props.onComplete(false, error);
        useGLTF.clear(this.props.modelUrl);
    }

    render() {
        return this.state?.hasError ? null : this.props.children;
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }
}

export function CakeAssetPreloader({ request, onComplete }) {
    const modelUrl = TIER_MODEL_URLS[`tier${request.tierIndex + 1}`] || TIER_MODEL_URLS.tier1;
    return (
        <CakeAssetPreloaderBoundary key={request.id} modelUrl={modelUrl} onComplete={onComplete}>
            <Suspense fallback={null}>
                <CakeAssetPreloaderContent request={request} onComplete={onComplete} />
            </Suspense>
        </CakeAssetPreloaderBoundary>
    );
}

export function TierLoadingFallback({ selectedTierIndex = 0, onReady }) {
    useLayoutEffect(() => { onReady?.(false); }, [onReady]);
    return (
        <Html center position={getTierLoadingPosition(selectedTierIndex)} style={{ pointerEvents: "none" }}>
            <div role="status" aria-live="polite" data-tier-loading={selectedTierIndex + 1} className="h-14 w-14 animate-spin rounded-full border-[5px] border-[#F3E5D0] border-l-[#C05A11]">
                <span className="sr-only">Loading tier {selectedTierIndex + 1} cake assets</span>
            </div>
        </Html>
    );
}

export default function CakeModel(props) {
    const index = Number.isInteger(props.selectedTierIndex) && props.selectedTierIndex >= 0 && props.selectedTierIndex < 4 ? props.selectedTierIndex : 0;
    return <Tier {...props} selectedTierIndex={index} />;
}
