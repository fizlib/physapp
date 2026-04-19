"use client";

import { useState, useEffect } from 'react';
import { LevelReturn } from './types';

const VESSELS_CLIP_PATH = "M 120,100 L 120,480 L 680,480 Q 800,290 680,100 L 600,100 Q 720,290 600,420 L 420,420 L 340,260 L 420,100 L 340,100 L 260,260 L 340,420 L 200,420 L 200,100 Z";
const GLASS_PATH_OUTER = "M 120,100 L 120,480 L 680,480 Q 800,290 680,100";
const GLASS_PATH_INNER_R = "M 600,100 Q 720,290 600,420 L 420,420 L 340,260 L 420,100";
const GLASS_PATH_INNER_L = "M 340,100 L 260,260 L 340,420 L 200,420 L 200,100";

export function useLevel2(active: boolean): LevelReturn {
    const [tilt, setTilt] = useState(0);
    const [tiltedLeft, setTiltedLeft] = useState(false);
    const [tiltedRight, setTiltedRight] = useState(false);

    // 2 Lygis
    useEffect(() => {
        if (!active) return;
        if (tilt <= -20) setTiltedLeft(true);
        if (tilt >= 20) setTiltedRight(true);
    }, [tilt, active]);

    const l2WaterY = 480 - 0.6 * 380;

    return {
        canProceed: tiltedLeft && tiltedRight,
        reset: () => {
            setTilt(0);
            setTiltedLeft(false);
            setTiltedRight(false);
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">2 lygis:</span> Pakreipkite indų sistemą į kairę ir į dešinę (&gt;20°). Stebėkite skysčio paviršiaus horizontalumą nepriklausomai nuo indo formos.
            </p>
        ),
        controls: (
            <div className="flex items-center gap-4 w-full max-w-sm">
                <span className="text-sm font-medium w-16 text-right">{tilt}°</span>
                <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={tilt}
                    onChange={(e) => setTilt(Number(e.target.value))}
                    className="flex-1 cursor-pointer accent-primary"
                />
            </div>
        ),
        svgContent: (
            <g>
                <defs>
                    <clipPath id="vessels-clip">
                        <path d={VESSELS_CLIP_PATH} />
                    </clipPath>
                </defs>

                <g transform={`rotate(${tilt}, 400, 450)`} className="transition-transform duration-75 ease-linear">
                    <g clipPath="url(#vessels-clip)">
                        <rect
                            x="-500"
                            y={l2WaterY}
                            width="2000"
                            height="1000"
                            fill="url(#waterDepth)"
                            transform={`rotate(${-tilt}, 400, ${l2WaterY})`}
                        />
                        <rect
                            x="-500"
                            y={l2WaterY}
                            width="2000"
                            height="6"
                            fill="rgba(255, 255, 255, 0.65)"
                            transform={`rotate(${-tilt}, 400, ${l2WaterY})`}
                        />
                    </g>

                    {/* Dinaminiai stiklo atspindžiai */}
                    <g strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
                        <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6">
                            <path d="M 125,102 L 125,475" />
                            <path d="M 345,102 L 265,260 L 345,415" />
                            <path d="M 605,102 Q 725,290 605,415" />
                        </g>
                        <g fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4">
                            <path d="M 195,102 L 195,415" />
                            <path d="M 415,102 L 335,260 L 415,415" />
                            <path d="M 675,102 Q 795,290 675,475" />
                        </g>
                        <path d="M 125,475 L 675,475" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                    </g>

                    {/* Stikliniai kontūrai */}
                    <g fill="rgba(255, 255, 255, 0.05)" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" strokeLinecap="round">
                        <path d={GLASS_PATH_OUTER} />
                        <path d={GLASS_PATH_INNER_R} />
                        <path d={GLASS_PATH_INNER_L} />
                    </g>
                </g>
            </g>
        ),
    };
}
