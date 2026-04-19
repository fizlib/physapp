"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, ArrowRight, ChevronDown, CheckCircle2, Droplet, RotateCcw, Lock, Unlock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SVG_WIDTH = 800;
const SVG_HEIGHT = 600;
const MAX_LEVEL = 5; // Padidintas lygių skaičius

export default function CommunicatingVesselsSimulation() {
    const [level, setLevel] = useState(1);
    const [isTeacher, setIsTeacher] = useState(false);
    const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
    const [showCompletionDialog, setShowCompletionDialog] = useState(false);

    // --- Lygis 1 ---
    const [fillLevel, setFillLevel] = useState(0);
    const [isTapOpen, setIsTapOpen] = useState(false);

    // --- Lygis 2 ---
    const [tilt, setTilt] = useState(0);
    const [tiltedLeft, setTiltedLeft] = useState(false);
    const [tiltedRight, setTiltedRight] = useState(false);

    // --- Lygis 3 (Naujas: Fontanas) ---
    const [liftOffset, setLiftOffset] = useState(0); // 0 iki 100

    // --- Lygis 4 (Senas 3) ---
    const [oilAmount, setOilAmount] = useState(0);

    // --- Lygis 5 (Senas 4) ---
    const [tanks, setTanks] = useState([300, 0, 150]);
    const [v1Open, setV1Open] = useState(false);
    const [v2Open, setV2Open] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role === 'teacher') setIsTeacher(true);
            } catch (e) {
                // Ignore
            }
        };
        checkRole();
    }, []);

    // 1 Lygio animacija
    useEffect(() => {
        if (level !== 1 || !isTapOpen) return;
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
    }, [level, isTapOpen]);

    // 2 Lygis
    useEffect(() => {
        if (level === 2) {
            if (tilt <= -20) setTiltedLeft(true);
            if (tilt >= 20) setTiltedRight(true);
        }
    }, [tilt, level]);

    // 5 Lygio fizika (Senas 4)
    useEffect(() => {
        if (level !== 5) return;
        let animationFrameId: number;
        const K = 0.05;
        const AREAS = [1.0, 1.5, 0.8];

        const loop = () => {
            setTanks(prev => {
                const [t1, t2, t3] = prev;
                if (!v1Open && !v2Open) return prev;

                const flow12 = v1Open ? (t1 - t2) * K : 0;
                const flow23 = v2Open ? (t2 - t3) * K : 0;

                if (Math.abs(flow12) < 0.05 && Math.abs(flow23) < 0.05) {
                    return prev;
                }

                return [
                    t1 - flow12 / AREAS[0],
                    t2 + flow12 / AREAS[1] - flow23 / AREAS[1],
                    t3 + flow23 / AREAS[2]
                ];
            });
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [level, v1Open, v2Open]);

    const canProceed = useMemo(() => {
        if (level === 1) return fillLevel >= 50;
        if (level === 2) return tiltedLeft && tiltedRight;
        if (level === 3) return liftOffset >= 80;
        if (level === 4) return oilAmount >= 80;
        if (level === 5) {
            const [t1, t2, t3] = tanks;
            return v1Open && v2Open && Math.abs(t1 - t2) < 1 && Math.abs(t2 - t3) < 1;
        }
        return false;
    }, [level, fillLevel, tiltedLeft, tiltedRight, liftOffset, oilAmount, tanks, v1Open, v2Open]);

    const clearAll = () => {
        if (level === 1) {
            setFillLevel(0);
            setIsTapOpen(false);
        }
        if (level === 2) {
            setTilt(0);
            setTiltedLeft(false);
            setTiltedRight(false);
        }
        if (level === 3) setLiftOffset(0);
        if (level === 4) setOilAmount(0);
        if (level === 5) {
            setTanks([300, 0, 150]);
            setV1Open(false);
            setV2Open(false);
        }
    };

    // Geometriniai matmenys kintamiems objektams
    const l1WaterY = 480 - (fillLevel / 100) * 380;
    const l2WaterY = 480 - 0.6 * 380;

    // 3 Lygio matmenys ir fizika
    const l3Offset = (liftOffset / 100) * 200; // kiek pikselių pakeltas indas
    const l3RawHL = 130 + l3Offset / 2; // skysčio aukštis matuojant nuo kairio indo dugno
    const l3HL = Math.min(l3RawHL, 200); // 200px maksimali talpa, nes anga yra ties Y=250 (450 - 250 = 200)
    const l3HR = 260 - l3RawHL; // skysčio aukštis dešiniajame inde
    const l3LeftWaterY = 450 - l3HL;
    const l3FountainH = Math.max(0, l3RawHL - 200);
    const l3JetHeight = l3FountainH * 3;

    // 4 Lygio matmenys (U vamzdelis)
    const dx = 0.4 * oilAmount;
    const waterLeftY = 250 + dx;
    const waterRightY = 250 - dx;
    const oilTopY = waterLeftY - oilAmount;

    // --- KONTŪRAI ---
    const VESSELS_CLIP_PATH = "M 120,100 L 120,480 L 680,480 Q 800,290 680,100 L 600,100 Q 720,290 600,420 L 420,420 L 340,260 L 420,100 L 340,100 L 260,260 L 340,420 L 200,420 L 200,100 Z";
    const GLASS_PATH_OUTER = "M 120,100 L 120,480 L 680,480 Q 800,290 680,100";
    const GLASS_PATH_INNER_R = "M 600,100 Q 720,290 600,420 L 420,420 L 340,260 L 420,100";
    const GLASS_PATH_INNER_L = "M 340,100 L 260,260 L 340,420 L 200,420 L 200,100";

    const L4_CLIP_PATH = "M 250,100 L 250,450 L 550,450 L 480,250 L 550,100 L 500,100 L 430,250 L 500,400 L 300,400 L 300,100 Z";

    return (
        <div className="flex flex-col h-screen min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20">

            <div className="flex-none bg-card/80 backdrop-blur-sm px-4 py-3 border-b border-border/50 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold tracking-tight">Susisiekiančiųjų indų dėsniai</span>
                    </div>

                    {isTeacher && (
                        <div className="relative">
                            <button
                                onClick={() => setLevelDropdownOpen(prev => !prev)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-sm font-medium hover:bg-secondary transition duration-150"
                            >
                                {level} lygis
                                <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${levelDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {levelDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[120px] py-1">
                                    {Array.from({ length: MAX_LEVEL }).map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => {
                                                setLevel(i + 1);
                                                clearAll();
                                                setLevelDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition duration-150 ${level === i + 1
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-foreground hover:bg-secondary/60'
                                                }`}
                                        >
                                            {i + 1} lygis
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-none text-center py-2.5 px-4 bg-secondary/40 border-b border-border/30 shadow-sm">
                {level === 1 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">1 lygis:</span> Atidarykite čiaupą, įpilkite vandens ir stebėkite vandens lygį inde.
                    </p>
                )}
                {level === 2 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">2 lygis:</span> Pakreipkite indų sistemą į kairę ir į dešinę (&gt;20°). Stebėkite skysčio paviršiaus horizontalumą nepriklausomai nuo indo formos.
                    </p>
                )}
                {level === 3 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">3 lygis:</span> Kelkite dešinįjį indą su vandeniu. Kadangi lygiai bando susivienodinti, vanduo galiausiai ištrykš pro kairiojo indo angą!
                    </p>
                )}
                {level === 4 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">4 lygis:</span> U-vamzdelis su pasvirusia dešine šaka. Įpilkite aliejaus ir stebėkite skirtingų tankių (aliejus $\rho$=0.8, vanduo $\rho$=1.0) lygių skirtumus.
                    </p>
                )}
                {level === 5 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">5 lygis:</span> Atidarykite sklendes. Atkreipkite dėmesį, kad indai yra skirtingo pločio – stebėkite skysčių susibalansavimo greitį!
                    </p>
                )}
            </div>

            <div className="flex-none flex justify-center gap-4 py-3 px-4 bg-secondary/10 border-b border-border/20 min-h-[60px]">
                {level === 1 && (
                    <Button
                        onClick={() => setIsTapOpen(prev => !prev)}
                        disabled={fillLevel >= 100 && !isTapOpen}
                        className={`transition-colors duration-300 w-48 ${isTapOpen ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        <Droplet className="w-4 h-4 mr-2" />
                        {isTapOpen ? 'Uždaryti čiaupą' : 'Atidaryti čiaupą'}
                    </Button>
                )}
                {level === 2 && (
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
                )}
                {level === 3 && (
                    <div className="flex items-center gap-4 w-full max-w-sm">
                        <span className="text-sm font-medium w-max text-right text-muted-foreground whitespace-nowrap">Kėlimo aukštis:</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={liftOffset}
                            onChange={(e) => setLiftOffset(Number(e.target.value))}
                            className="flex-1 cursor-pointer accent-primary"
                        />
                    </div>
                )}
                {level === 4 && (
                    <Button
                        onClick={() => setOilAmount(prev => Math.min(prev + 20, 120))}
                        disabled={oilAmount >= 120}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                    >
                        <Droplet className="w-4 h-4 mr-2" /> Įpilti aliejaus
                    </Button>
                )}
                {level === 5 && (
                    <div className="flex items-center gap-6 text-sm font-medium">
                        <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer ${v1Open ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`} onClick={() => setV1Open(!v1Open)}>
                            {v1Open ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Sklendė 1
                        </div>
                        <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer ${v2Open ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`} onClick={() => setV2Open(!v2Open)}>
                            {v2Open ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Sklendė 2
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 relative w-full overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                <svg
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full max-w-[800px] select-none drop-shadow-sm"
                >
                    <defs>
                        <clipPath id="vessels-clip">
                            <path d={VESSELS_CLIP_PATH} />
                        </clipPath>
                        <clipPath id="l4-clip">
                            <path d={L4_CLIP_PATH} />
                        </clipPath>

                        <linearGradient id="waterDepth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                            <stop offset="30%" stopColor="#2563eb" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
                        </linearGradient>

                        <linearGradient id="oilDepth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.95" />
                        </linearGradient>

                        <linearGradient id="tubeHighlight" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                            <stop offset="25%" stopColor="rgba(255,255,255,0.0)" />
                            <stop offset="80%" stopColor="rgba(255,255,255,0.0)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                        </linearGradient>

                        <style>
                            {`
                            @keyframes flowDown {
                                from { stroke-dashoffset: 20; }
                                to { stroke-dashoffset: 0; }
                            }
                            .animate-water {
                                animation: flowDown 0.4s linear infinite;
                            }
                            @keyframes bubbleFloat {
                                0% { transform: translateY(0px) scale(0.8); opacity: 0; }
                                20% { opacity: 0.7; }
                                80% { opacity: 0.5; }
                                100% { transform: translateY(-150px) scale(1.5); opacity: 0; }
                            }
                            .bubble {
                                animation: bubbleFloat linear infinite;
                            }
                            `}
                        </style>
                    </defs>

                    {/* Level 1 & 2: Dinaminių formų indai */}
                    {(level === 1 || level === 2) && (
                        <g transform={level === 2 ? `rotate(${tilt}, 400, 450)` : undefined} className="transition-transform duration-75 ease-linear">

                            {level === 1 && (
                                <g>
                                    <line x1="80" y1="280" x2="720" y2="280" stroke="var(--destructive)" strokeWidth="2" strokeDasharray="8,8" opacity="0.6" />
                                    <text x="90" y="270" fill="var(--destructive)" fontSize="14" fontWeight="bold">Tikslas (50%)</text>
                                </g>
                            )}

                            <g clipPath="url(#vessels-clip)">
                                <rect
                                    x="-500"
                                    y={level === 1 ? l1WaterY : l2WaterY}
                                    width="2000"
                                    height="1000"
                                    fill="url(#waterDepth)"
                                    transform={level === 2 ? `rotate(${-tilt}, 400, ${l2WaterY})` : undefined}
                                />
                                <rect
                                    x="-500"
                                    y={level === 1 ? l1WaterY : l2WaterY}
                                    width="2000"
                                    height="6"
                                    fill="rgba(255, 255, 255, 0.65)"
                                    transform={level === 2 ? `rotate(${-tilt}, 400, ${l2WaterY})` : undefined}
                                />

                                {level === 1 && isTapOpen && (
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

                            {/* Dinaminiai stiklo atspindžiai atkartojantys indo formą */}
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
                    )}

                    {/* Čiaupas (Level 1) */}
                    {level === 1 && (
                        <g className="tap-system">
                            {isTapOpen && (
                                <g>
                                    <rect x="152" y="80" width="16" height={Math.max(0, l1WaterY - 80)} fill="#38bdf8" opacity="0.8" />
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
                    )}

                    {/* Lygis 3: Laisvas fontanas iš uždaro indo */}
                    {level === 3 && (
                        <g>
                            {/* Lankstaus vamzdelio kontūras (fonas) */}
                            <path
                                d={`M 250 450 C 250 550, 550 ${550 - l3Offset}, 550 ${450 - l3Offset}`}
                                fill="none" stroke="currentColor" strokeWidth="44"
                                className="text-slate-400 dark:text-slate-600"
                            />
                            {/* Lankstaus vamzdelio vidus (vanduo) */}
                            <path
                                d={`M 250 450 C 250 550, 550 ${550 - l3Offset}, 550 ${450 - l3Offset}`}
                                fill="none" stroke="url(#waterDepth)" strokeWidth="36"
                            />

                            {/* Kairysis (Stacionarus, žemas, su anga viršuje) */}
                            <g>
                                <rect x="202" y={l3LeftWaterY} width="96" height={450 - l3LeftWaterY} fill="url(#waterDepth)" />
                                {l3HL > 0 && <rect x="202" y={l3LeftWaterY} width="96" height="4" fill="rgba(255, 255, 255, 0.65)" />}

                                {/* Kairio indo kontūrai (Turi viršutinį stogą, palikta maža skylutė ties 250, taip pat apačioje skylė vamzdžiui) */}
                                <path d="M 240 250 L 200 250 L 200 450 L 228 450" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />
                                <path d="M 272 450 L 300 450 L 300 250 L 260 250" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />

                                {/* Stiklo atspindys */}
                                <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" pointerEvents="none">
                                    <path d="M 206 250 L 206 444" />
                                </g>

                                {/* Fontano Animacija (Pasiekiama, kai spaudimas tampa per didelis) */}
                                {l3FountainH > 0 && (
                                    <g strokeLinecap="round">
                                        {/* Pagrindinė srovė į viršų */}
                                        <line x1="250" y1="250" x2="250" y2={250 - l3JetHeight} stroke="url(#waterDepth)" strokeWidth="8" opacity="0.9" />
                                        <line x1="250" y1="250" x2="250" y2={250 - l3JetHeight} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />

                                        {/* Krintančios srovės lankai */}
                                        <path d={`M 250 ${250 - l3JetHeight * 0.8} Q 220 ${250 - l3JetHeight * 1.2} 180 ${250 - l3JetHeight * 0.1}`} fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4" className="animate-water" />
                                        <path d={`M 250 ${250 - l3JetHeight * 0.8} Q 280 ${250 - l3JetHeight * 1.2} 320 ${250 - l3JetHeight * 0.1}`} fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4" className="animate-water" />
                                    </g>
                                )}
                            </g>

                            {/* Dešinysis Indas (Kilnojamas) */}
                            <g transform={`translate(0, ${-l3Offset})`}>
                                <rect x="502" y={450 - l3HR} width="96" height={l3HR} fill="url(#waterDepth)" />
                                {l3HR > 0 && <rect x="502" y={450 - l3HR} width="96" height="4" fill="rgba(255, 255, 255, 0.65)" />}

                                {/* Dešiniojo indo kontūrai (Anga tik apačioje vamzdžiui) */}
                                <path d="M 500 150 L 500 450 L 528 450" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />
                                <path d="M 572 450 L 600 450 L 600 150" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" strokeLinejoin="round" />

                                {/* Stiklo atspindys */}
                                <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" pointerEvents="none">
                                    <path d="M 506 150 L 506 444" />
                                </g>
                            </g>
                        </g>
                    )}

                    {/* Level 4: U-vamzdelis (Buvęs 3 lygis) */}
                    {level === 4 && (
                        <g>
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
                    )}

                    {/* Level 5: 3 Skirtingo dydžio rezervuarai (Buvęs 4 lygis) */}
                    {level === 5 && (
                        <g>
                            <g>
                                <rect x="120" y={450 - tanks[0]} width="100" height={tanks[0]} fill="url(#waterDepth)" />
                                <rect x="300" y={450 - tanks[1]} width="150" height={tanks[1]} fill="url(#waterDepth)" />
                                <rect x="530" y={450 - tanks[2]} width="80" height={tanks[2]} fill="url(#waterDepth)" />

                                {tanks[0] > 0 && <rect x="120" y={450 - tanks[0]} width="100" height="4" fill="rgba(255, 255, 255, 0.65)" />}
                                {tanks[1] > 0 && <rect x="300" y={450 - tanks[1]} width="150" height="4" fill="rgba(255, 255, 255, 0.65)" />}
                                {tanks[2] > 0 && <rect x="530" y={450 - tanks[2]} width="80" height="4" fill="rgba(255, 255, 255, 0.65)" />}

                                <rect x="220" y="400" width="80" height="50" fill="url(#waterDepth)" />
                                <rect x="450" y="400" width="80" height="50" fill="url(#waterDepth)" />

                                <rect x="120" y="100" width="100" height="350" fill="url(#tubeHighlight)" pointerEvents="none" />
                                <rect x="300" y="100" width="150" height="350" fill="url(#tubeHighlight)" pointerEvents="none" />
                                <rect x="530" y="100" width="80" height="350" fill="url(#tubeHighlight)" pointerEvents="none" />
                            </g>

                            <path d="M 120,100 L 120,450 L 610,450 L 610,100" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" />
                            <path d="M 220,100 L 220,400 L 300,400 L 300,100" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" />
                            <path d="M 450,100 L 450,400 L 530,400 L 530,100" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400 dark:text-slate-600" />

                            <g onClick={() => setV1Open(!v1Open)} className="cursor-pointer hover:opacity-80 transition-opacity">
                                <rect
                                    x="250" y={v1Open ? "320" : "380"}
                                    width="20" height={v1Open ? "60" : "80"}
                                    fill={v1Open ? "#16a34a" : "#dc2626"}
                                    rx="4" style={{ transition: 'all 0.3s' }}
                                />
                                <circle cx="260" cy={v1Open ? "330" : "390"} r="15" fill="#334155" style={{ transition: 'all 0.3s' }} />
                                <text x="260" y={v1Open ? "335" : "395"} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" style={{ transition: 'all 0.3s' }}>1</text>
                            </g>

                            <g onClick={() => setV2Open(!v2Open)} className="cursor-pointer hover:opacity-80 transition-opacity">
                                <rect
                                    x="480" y={v2Open ? "320" : "380"}
                                    width="20" height={v2Open ? "60" : "80"}
                                    fill={v2Open ? "#16a34a" : "#dc2626"}
                                    rx="4" style={{ transition: 'all 0.3s' }}
                                />
                                <circle cx="490" cy={v2Open ? "330" : "390"} r="15" fill="#334155" style={{ transition: 'all 0.3s' }} />
                                <text x="490" y={v2Open ? "335" : "395"} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" style={{ transition: 'all 0.3s' }}>2</text>
                            </g>
                        </g>
                    )}
                </svg>
            </div>

            <div className="flex-none sticky bottom-0 bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 pb-4 md:pb-6">
                <div className="max-w-4xl mx-auto flex items-center gap-3 p-4">
                    <button
                        onClick={clearAll}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition duration-200 font-medium"
                        title="Išvalyti viską"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Grąžinti pradinę būseną</span>
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={() => {
                            if (level === MAX_LEVEL) {
                                setShowCompletionDialog(true);
                                return;
                            }
                            clearAll();
                            setLevel(prev => prev + 1);
                        }}
                        disabled={!canProceed}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition duration-200 ${canProceed ? 'bg-primary text-primary-foreground shadow-md hover:opacity-90 hover:-translate-y-0.5' : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'}`}
                    >
                        {level === MAX_LEVEL ? 'Baigta' : 'Kitas lygis'}
                        {level !== MAX_LEVEL && <ArrowRight className="w-4 h-4" />}
                        {level === MAX_LEVEL && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            Simuliacija baigta!
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Puikiai padirbėta! Sėkmingai išnagrinėjote susisiekiančiųjų indų savybes skirtingose situacijose, atradote skysčių paviršiaus horizontalumo ir nevienodų tankių balansavimo principus.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-muted-foreground">
                        Galite uždaryti šį skirtuką ir tęsti tolimesnes užduotis platformoje.
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => setShowCompletionDialog(false)}
                            className="w-full sm:w-auto"
                        >
                            Supratau
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}