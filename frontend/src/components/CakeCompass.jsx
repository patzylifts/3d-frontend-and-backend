// src/components/CakeCompass.jsx
import { useEffect, useRef } from "react";

export default function CakeCompass({
    cakeGroupRef,
    controlsRef,
    onReset,
}) {
    const needleRef = useRef(null);

    useEffect(() => {
        let animationFrameId;

        const updateCompass = () => {
            const cakeRotation = cakeGroupRef.current?.rotation?.y ?? 0;
            const cameraRotation =
                controlsRef.current?.getAzimuthalAngle?.() ?? 0;

            const headingRadians = cameraRotation - cakeRotation;
            const headingDegrees = headingRadians * (180 / Math.PI);

            if (needleRef.current) {
                needleRef.current.style.transform =
                    `rotate(${headingDegrees}deg)`;
            }

            animationFrameId = requestAnimationFrame(updateCompass);
        };

        updateCompass();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [cakeGroupRef, controlsRef]);

    return (
        <button
            type="button"
            onClick={onReset}
            aria-label="Reset 3D view to north"
            title="Reset view to North"
            className="absolute bottom-4 right-4 z-30 w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm border border-[#E6CCA2] shadow-md hover:shadow-lg hover:bg-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
        >
            <div className="relative w-10 h-10 rounded-full border border-[#D8BE91] bg-[#FFFDF9] flex items-center justify-center">
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold text-[#C62828]">
                    N
                </span>

                <div
                    ref={needleRef}
                    className="relative w-5 h-5 transition-transform duration-75"
                >
                    <span
                        className="absolute left-1/2 top-0 -translate-x-1/2
                                   w-0 h-0
                                   border-l-[4px] border-l-transparent
                                   border-r-[4px] border-r-transparent
                                   border-b-[10px] border-b-[#C62828]"
                    />

                    <span
                        className="absolute left-1/2 bottom-0 -translate-x-1/2
                                   w-0 h-0
                                   border-l-[4px] border-l-transparent
                                   border-r-[4px] border-r-transparent
                                   border-t-[10px] border-t-[#8D796C]"
                    />
                </div>

                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#8D796C]">
                    S
                </span>
            </div>
        </button>
    );
}