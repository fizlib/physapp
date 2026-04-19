"use client";

import { useState, useEffect } from 'react';
import { Droplet } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { LevelReturn } from './types';

const VESSELS_CLIP_PATH = "M 120,100 L 120,480 L 680,480 Q 800,290 680,100 L 600,100 Q 720,290 600,420 L 420,420 L 340,260 L 420,100 L 340,100 L 260,260 L 340,420 L 200,420 L 200,100 Z";
const GLASS_PATH_OUTER = "M 120,100 L 120,480 L 680,480 Q 800,290 680,100";
const GLASS_PATH_INNER_R = "M 600,100 Q 720,290 600,420 L 420,420 L 340,260 L 420,100";
const GLASS_PATH_INNER_L = "M 340,100 L 260,260 L 340,420 L 200,420 L 200,100";

export function useLevel1(active: boolean): LevelReturn {
    const [fillLevel, setFillLevel] = useState(0);
    const [isTapOpen, setIsTapOpen] = useState(false);

    // 1 Lygio animacija
    useEffect(() => {
        if (!active || !isTapOpen) return;
        let animationFrameId: number;

        const loop = () => {
            setFillLevel(prev => {
                const fillRate = 0.2;
                if (prev + fillRate >= 100) {
                    setIsTapOpen(false);
                    return 100;
                }
                return prev + fillRate;
            });
            animationFrameId = requestAnimationFrame(loop);
        };

        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [active, isTapOpen]);

    const l1WaterY = 480 - (fillLevel / 100) * 380;

    return {
        canProceed: fillLevel >= 50,
        reset: () => {
            setFillLevel(0);
            setIsTapOpen(false);
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">1 lygis:</span> Atidarykite čiaupą, įpilkite vandens ir stebėkite vandens lygį inde.
            </p>
        ),
        controls: (
            <Button
                onClick={() => setIsTapOpen(prev => !prev)}
                disabled={fillLevel >= 100 && !isTapOpen}
                className={`transition-colors duration-300 w-48 ${isTapOpen ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
                <Droplet className="w-4 h-4 mr-2" />
                {isTapOpen ? 'Uždaryti čiaupą' : 'Atidaryti čiaupą'}
            </Button>
        ),
        svgContent: (
            <g>
                <defs>
                    <clipPath id="vessels-clip">
                        <path d={VESSELS_CLIP_PATH} />
                    </clipPath>
                </defs>

                <g>
                    {/* Tikslo linija */}
                    <line x1="80" y1="280" x2="720" y2="280" stroke="var(--destructive)" strokeWidth="2" strokeDasharray="8,8" opacity="0.6" />
                    <text x="90" y="270" fill="var(--destructive)" fontSize="14" fontWeight="bold">Tikslas (50%)</text>

                    <g clipPath="url(#vessels-clip)">
                        <rect
                            x="-500"
                            y={l1WaterY}
                            width="2000"
                            height="1000"
                            fill="url(#waterDepth)"
                        />
                        <rect
                            x="-500"
                            y={l1WaterY}
                            width="2000"
                            height="6"
                            fill="rgba(255, 255, 255, 0.65)"
                        />

                        {isTapOpen && (
                            <g opacity={fillLevel > 5 ? 1 : 0}>
                                {[...Array(8)].map((_, i) => (
                                    <circle
                                        key={i}
                                        cx={140 + Math.random() * 40}
                                        cy={480}
                                        r={Math.random() * 3 + 2}
                                        fill="rgba(255,255,255,0.7)"
                                        className="bubble"
                                        style={{
                                            animationDelay: `${Math.random() * 1.5}s`,
                                            animationDuration: `${1 + Math.random() * 1}s`
                                        }}
                                    />
                                ))}
                            </g>
                        )}
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

                {/* Čiaupas */}
                <g className="tap-system">
                    {isTapOpen && (
                        <g>
                            <rect x="152" y="80" width="16" height={Math.max(0, l1WaterY - 80)} fill="url(#waterDepth)" opacity="0.9" />
                            <line x1="160" y1="80" x2="160" y2={l1WaterY} stroke="rgba(255,255,255,0.8)" strokeWidth="4" strokeDasharray="10 10" className="animate-water" />
                        </g>
                    )}
                    <path d="M 0 50 L 160 50 L 160 80" fill="none" stroke="#64748b" strokeWidth="20" strokeLinejoin="round" />
                    <path d="M 0 50 L 160 50 L 160 80" fill="none" stroke="#94a3b8" strokeWidth="16" strokeLinejoin="round" />
                    <g transform={`rotate(${isTapOpen ? -45 : 0} 160 35)`} style={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <rect x="145" y="31" width="30" height="8" rx="4" fill={isTapOpen ? "#ef4444" : "#3b82f6"} />
                    </g>
                    <circle cx="160" cy="35" r="6" fill="#475569" />
                </g>
            </g>
        ),
    };
}
