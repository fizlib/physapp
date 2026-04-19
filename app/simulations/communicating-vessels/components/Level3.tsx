"use client";

import { useState, useEffect, useRef } from 'react';
import { LevelReturn } from './types';

export function useLevel3(active: boolean): LevelReturn {
    const [liftOffset, setLiftOffset] = useState(0); // 0 iki 200 pikselių
    const [l3WaterVolume, setL3WaterVolume] = useState(455); // Bendras vandens kiekis (didesnis dėl platesnio indo)
    const [isDraggingL3, setIsDraggingL3] = useState(false);
    const dragStart = useRef({ y: 0, offset: 0 });
    const l3OffsetRef = useRef(liftOffset);

    // 3 Lygio fizika (Vandens lėtas nutekėjimas ir sistemų susilyginimas)
    useEffect(() => {
        l3OffsetRef.current = liftOffset;
    }, [liftOffset]);

    useEffect(() => {
        if (!active) return;
        let animationFrameId: number;
        const loop = () => {
            setL3WaterVolume(prev => {
                const currentOffset = l3OffsetRef.current;
                const AR_AL = 2.5; // Dešiniojo indo ploto santykis su kairiuoju
                let currentHL = (prev <= currentOffset) ? prev : (prev + AR_AL * currentOffset) / (1 + AR_AL);

                // Jei kairiojo indo lygis viršija angos aukštį (200px), vanduo trykšta ir tūris mažėja.
                if (currentHL > 200) {
                    const excess = currentHL - 200;
                    if (excess < 0.1) {
                        // Tolygus sustabdymas: kai lygis labai arti 200, užfiksuojame idealų tūrį
                        const targetPrev = 200 * (1 + AR_AL) - AR_AL * currentOffset;
                        return Math.max(0, Math.min(prev, targetPrev));
                    }
                    const spill = excess * 0.01;
                    return Math.max(0, prev - spill);
                }
                return prev;
            });
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [active]);

    // 3 Lygio matmenys
    const AR_AL = 2.5;
    let l3HL: number, l3HR: number;
    if (l3WaterVolume <= liftOffset) {
        l3HL = l3WaterVolume;
        l3HR = 0;
    } else {
        l3HL = (l3WaterVolume + AR_AL * liftOffset) / (1 + AR_AL);
        l3HR = (l3WaterVolume - liftOffset) / (1 + AR_AL);
    }

    const displayHL = Math.min(l3HL, 200);
    const l3LeftWaterY = 450 - displayHL;
    const l3FountainH = Math.max(0, l3HL - 200);
    const l3JetHeight = Math.min(240, l3FountainH * 3.5);

    return {
        canProceed: l3WaterVolume < 450,
        reset: () => {
            setLiftOffset(0);
            setL3WaterVolume(455);
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">3 lygis:</span> Kelkite dešinįjį indą su vandeniu. Vanduo ištrykš pro angą, kol kairiojo ir dešiniojo skysčio paviršiai visiškai susivienodins ir išsilygins horizontalioje plokštumoje!
            </p>
        ),
        controls: (
            <div className="flex items-center justify-center w-full">
                <span className="text-sm font-medium text-muted-foreground bg-white/50 dark:bg-black/20 px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
                    👆 Tempkite dešinįjį indą su pelyte aukštyn ir žemyn
                </span>
            </div>
        ),
        svgContent: (
            <g>
                {/* Lankstaus vamzdelio kontūras (fonas) */}
                <path
                    d={`M 250 450 C 250 550, 550 ${550 - liftOffset}, 550 ${450 - liftOffset}`}
                    fill="none" stroke="currentColor" strokeWidth="44"
                    className="text-slate-400 dark:text-slate-600"
                />
                {/* Lankstaus vamzdelio vidus */}
                <path
                    d={`M 250 450 C 250 550, 550 ${550 - liftOffset}, 550 ${450 - liftOffset}`}
                    fill="none" stroke="url(#waterDepth)" strokeWidth="36"
                />

                {/* Kairysis (Stacionarus, žemas, su anga viršuje) */}
                <g>
                    <rect x="202" y={l3LeftWaterY} width="96" height={displayHL + 2} fill="url(#waterDepth)" />

                    {/* Išmanus balto paviršiaus atvaizdavimas, prisitaikantis prie angos */}
                    {l3HL > 0 && displayHL < 200 && (
                        <rect x="202" y={l3LeftWaterY} width="96" height="4" fill="rgba(255, 255, 255, 0.65)" />
                    )}
                    {displayHL >= 200 && (
                        <g fill="rgba(255, 255, 255, 0.65)">
                            <rect x="202" y="250" width="44" height="4" />
                            <rect x="254" y="250" width="44" height="4" />
                        </g>
                    )}

                    {/* Kairio indo kontūrai su SIAURESNE anga viduryje (X: 246 iki 254) */}
                    <path d="M 246 250 L 200 250 L 200 450 L 228 450" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />
                    <path d="M 272 450 L 300 450 L 300 250 L 254 250" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />

                    {/* Stiklo atspindys */}
                    <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" pointerEvents="none">
                        <path d="M 206 250 L 206 444" />
                    </g>

                    {/* Fontano Animacija (Realistiškesnė) */}
                    {l3FountainH > 0.05 && (
                        <g strokeLinecap="round">
                            {/* Pagrindinė srovė į viršų iš siauros angos */}
                            <path d={`M 247 250 Q 250 ${250 - l3JetHeight * 0.5} 250 ${250 - l3JetHeight}`} fill="none" stroke="url(#waterDepth)" strokeWidth="5" opacity="0.9" />
                            <path d={`M 253 250 Q 250 ${250 - l3JetHeight * 0.5} 250 ${250 - l3JetHeight}`} fill="none" stroke="url(#waterDepth)" strokeWidth="5" opacity="0.9" />
                            <line x1="250" y1="250" x2="250" y2={250 - l3JetHeight} stroke="rgba(255,255,255,0.8)" strokeWidth="4" />

                            {/* Pagrindo purslai (vidinė dalis) */}
                            <path d={`M 250 ${250 - l3JetHeight * 0.8} Q 235 ${250 - l3JetHeight * 1.05} 210 250`} fill="none" stroke="url(#waterDepth)" strokeWidth="3" strokeDasharray="3 5" className="animate-water" />
                            <path d={`M 250 ${250 - l3JetHeight * 0.8} Q 265 ${250 - l3JetHeight * 1.05} 290 250`} fill="none" stroke="url(#waterDepth)" strokeWidth="3" strokeDasharray="3 5" className="animate-water" />

                            {/* Platesni lankai */}
                            <path d={`M 250 ${250 - l3JetHeight * 0.95} Q 215 ${250 - l3JetHeight * 1.15} 190 250`} fill="none" stroke="url(#waterDepth)" strokeWidth="2.5" strokeDasharray="2 6" className="animate-water" />
                            <path d={`M 250 ${250 - l3JetHeight * 0.95} Q 285 ${250 - l3JetHeight * 1.15} 310 250`} fill="none" stroke="url(#waterDepth)" strokeWidth="2.5" strokeDasharray="2 6" className="animate-water" />

                            {/* Atsitiktiniai lašai su greita animacija */}
                            <line x1="250" y1="250" x2="250" y2={250 - l3JetHeight} stroke="rgba(255,255,255,0.5)" strokeWidth="8" strokeDasharray="4 14" className="animate-water" />

                            {/* Vandens baseinėlis ant angos */}
                            <ellipse cx="250" cy="250" rx={Math.min(46, l3FountainH * 1.5)} ry="3" fill="rgba(255, 255, 255, 0.5)" />
                        </g>
                    )}
                </g>

                {/* Dešinysis Indas (Kilnojamas pelės vilkimu, platesnis) */}
                <g transform={`translate(0, ${-liftOffset})`}>
                    <rect x="452" y={450 - l3HR} width="246" height={l3HR + 2} fill="url(#waterDepth)" />
                    {l3HR > 0 && <rect x="452" y={450 - l3HR} width="246" height="4" fill="rgba(255, 255, 255, 0.65)" />}

                    {/* Dešiniojo indo kontūrai (platesni) */}
                    <path d="M 450 150 L 450 450 L 528 450" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />
                    <path d="M 572 450 L 700 450 L 700 150" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />

                    {/* Stiklo atspindys */}
                    <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" pointerEvents="none">
                        <path d="M 456 150 L 456 444" />
                    </g>

                    {/* Rodyklės (UI Hint) */}
                    <g opacity={isDraggingL3 ? 0 : 0.6} className="pointer-events-none transition-opacity">
                        <path d="M 720 280 L 720 320 M 710 290 L 720 280 L 730 290 M 710 310 L 720 320 L 730 310" stroke="currentColor" strokeWidth="3" fill="none" className="text-muted-foreground" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* Nematoma interaktyvi sritis vilkimui */}
                    <rect
                        x="430" y="100" width="290" height="400"
                        fill="transparent"
                        style={{ cursor: isDraggingL3 ? 'grabbing' : 'grab' }}
                        onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setIsDraggingL3(true);
                            dragStart.current = { y: e.clientY, offset: liftOffset };
                        }}
                        onPointerMove={(e) => {
                            if (!isDraggingL3) return;
                            const deltaY = e.clientY - dragStart.current.y;
                            let newOffset = dragStart.current.offset - deltaY;
                            newOffset = Math.max(0, Math.min(200, newOffset));
                            setLiftOffset(newOffset);
                        }}
                        onPointerUp={(e) => {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                            setIsDraggingL3(false);
                        }}
                    />
                </g>
            </g>
        ),
    };
}
