"use client";

import { useState } from 'react';
import { Droplet } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { LevelReturn } from './types';

const L4_CLIP_PATH = "M 250,100 L 250,450 L 550,450 L 480,250 L 550,100 L 500,100 L 430,250 L 500,400 L 300,400 L 300,100 Z";

export function useLevel4(active: boolean): LevelReturn {
    const [oilAmount, setOilAmount] = useState(0);

    // 4 Lygio matmenys (U vamzdelis)
    const dx = 0.4 * oilAmount;
    const waterLeftY = 250 + dx;
    const waterRightY = 250 - dx;
    const oilTopY = waterLeftY - oilAmount;

    return {
        canProceed: oilAmount >= 80,
        reset: () => {
            setOilAmount(0);
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">4 lygis:</span> U-vamzdelis su pasvirusia dešine šaka. Įpilkite skysčių ir stebėkite kaip kinta vandens lygis.
            </p>
        ),
        controls: (
            <Button
                onClick={() => setOilAmount(prev => Math.min(prev + 20, 120))}
                disabled={oilAmount >= 120}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
                <Droplet className="w-4 h-4 mr-2" /> Įpilti aliejaus
            </Button>
        ),
        svgContent: (
            <g>
                <defs>
                    <clipPath id="l4-clip">
                        <path d={L4_CLIP_PATH} />
                    </clipPath>
                </defs>

                <g clipPath="url(#l4-clip)">
                    {/* Vanduo */}
                    <polygon
                        points={`0,${waterLeftY} 365,${waterLeftY} 365,${waterRightY} 800,${waterRightY} 800,500 0,500`}
                        fill="url(#waterDepth)"
                        style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                    {oilAmount === 0 && <line x1="200" y1={waterLeftY} x2="400" y2={waterLeftY} stroke="rgba(255,255,255,0.7)" strokeWidth="4" style={{ transition: 'all 0.5s' }} />}
                    <line x1="400" y1={waterRightY} x2="600" y2={waterRightY} stroke="rgba(255,255,255,0.7)" strokeWidth="4" style={{ transition: 'all 0.5s' }} />

                    {/* Aliejus */}
                    {oilAmount > 0 && (
                        <polygon
                            points={`0,${oilTopY} 365,${oilTopY} 365,${waterLeftY} 0,${waterLeftY}`}
                            fill="url(#oilDepth)"
                            style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                    )}
                    {oilAmount > 0 && (
                        <>
                            <line x1="200" y1={oilTopY} x2="400" y2={oilTopY} stroke="rgba(255,255,255,0.8)" strokeWidth="4" style={{ transition: 'all 0.5s' }} />
                            <line x1="200" y1={waterLeftY} x2="400" y2={waterLeftY} stroke="rgba(0,0,0,0.4)" strokeWidth="3" style={{ transition: 'all 0.5s' }} />
                        </>
                    )}
                </g>

                {/* Atspindžiai U-vamzdeliui */}
                <g strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
                    <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6">
                        <path d="M 255,102 L 255,445" />
                        <path d="M 505,102 L 435,250 L 505,395" />
                    </g>
                    <g fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4">
                        <path d="M 295,102 L 295,395" />
                        <path d="M 545,102 L 475,250 L 545,445" />
                    </g>
                    <path d="M 255,445 L 545,445" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                </g>

                <path d="M 250,100 L 250,450 L 550,450 L 480,250 L 550,100" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />
                <path d="M 500,100 L 430,250 L 500,400 L 300,400 L 300,100" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />
            </g>
        ),
    };
}
