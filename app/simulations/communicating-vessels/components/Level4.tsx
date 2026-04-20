"use client";

import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { LevelReturn } from './types';

export function useLevel4(active: boolean): LevelReturn {
    // Kairiojo kanalo paviršius: Y=350
    // Dešiniojo kanalo paviršius: Y=150
    const [chamberLevel, setChamberLevel] = useState(150);
    const [shipX, setShipX] = useState(100);

    // Valdiklių būsenos
    const [v1Open, setV1Open] = useState(false);
    const [v2Open, setV2Open] = useState(false);
    const [gate1Open, setGate1Open] = useState(false);
    const [gate2Open, setGate2Open] = useState(false);
    const [shake1, setShake1] = useState(false);
    const [shake2, setShake2] = useState(false);

    // Fizikos ir laivo judėjimo ciklas
    useEffect(() => {
        if (!active) return;
        let animationFrameId: number;

        const loop = () => {
            // 1. Vandens tekėjimo logika
            setChamberLevel(prev => {
                if (gate1Open && gate2Open) return prev; // Jei abu atviri (nors taip neturėtų būti), vengiame klaidų
                if (gate1Open) return prev + (350 - prev) * 0.1;
                if (gate2Open) return prev + (150 - prev) * 0.1;

                let next = prev;
                if (v1Open) next += (350 - prev) * 0.03;
                if (v2Open) next += (150 - prev) * 0.03;
                return next;
            });

            // 2. Automatinis laivo judėjimas
            setShipX(prev => {
                let target = prev;
                if (prev <= 245) {
                    // Laivas kairiajame kanale
                    if (gate1Open || prev > 240) target = 400; // Plaukti į kamerą
                } else if (prev >= 545) {
                    // Laivas dešiniajame kanale
                    target = 700; // Nuplaukti tolyn
                } else {
                    // Laivas šliuzo kameroje
                    if (gate2Open || prev > 540) target = 700; // Plaukti į dešinį kanalą
                    else target = 400; // Likti kameros centre
                }

                // Sklandus pozicijos artėjimas link tikslo
                if (Math.abs(target - prev) > 0.5) {
                    return prev + Math.sign(target - prev) * 1.5;
                }
                return prev;
            });

            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [active, v1Open, v2Open, gate1Open, gate2Open]);

    // Apsaugos mechanizmas: Vartų atidaryti negalima, jei lygiai nesutampa
    const disableG1 = !gate1Open && Math.abs(chamberLevel - 350) > 1;
    const disableG2 = !gate2Open && Math.abs(chamberLevel - 150) > 1;

    const handleG1Click = () => {
        if (disableG1) {
            setShake1(true);
            setTimeout(() => setShake1(false), 400); // clear after animation
        } else {
            setGate1Open(!gate1Open);
        }
    };

    const handleG2Click = () => {
        if (disableG2) {
            setShake2(true);
            setTimeout(() => setShake2(false), 400); // clear after animation
        } else {
            setGate2Open(!gate2Open);
        }
    };

    // Animacijų rodymo logika
    const isFlowing1 = v1Open && Math.abs(chamberLevel - 350) > 0.5;
    const isFlowing2 = v2Open && Math.abs(chamberLevel - 150) > 0.5;

    // Laivo Y pozicija
    const getShipY = () => {
        if (shipX <= 240) return 350;
        if (shipX >= 550) return 150;
        return chamberLevel;
    };

    return {
        canProceed: shipX >= 690,
        reset: () => {
            setChamberLevel(150);
            setShipX(100);
            setV1Open(false);
            setV2Open(false);
            setGate1Open(false);
            setGate2Open(false);
            setShake1(false);
            setShake2(false);
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">4 lygis:</span> Padėkite laivui praplaukti šliuzą. Valdykite sklendes, kad susisiekiančiuose induose (šliuzo kameroje) išlygintumėte vandens lygius, ir tuomet atidarykite reikiamus vartus.
            </p>
        ),
        controls: (
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium w-full max-w-2xl">
                <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-xl bg-secondary/50 border border-border/50">
                    <button
                        onClick={() => setV1Open(!v1Open)}
                        className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${v1Open ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-background hover:bg-muted'}`}
                    >
                        {v1Open ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Sklendė 1
                    </button>
                    <button
                        onClick={handleG1Click}
                        className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${gate1Open ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/50' : 'bg-background'} ${disableG1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted hover:shadow-sm'} ${shake1 ? 'animate-shake text-destructive' : ''}`}
                        title={disableG1 ? "Vandens lygiai nelygūs - vartų atidaryti negalima!" : ""}
                        aria-disabled={disableG1}
                    >
                        Žemutiniai vartai
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-xl bg-secondary/50 border border-border/50">
                    <button
                        onClick={() => setV2Open(!v2Open)}
                        className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${v2Open ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-background hover:bg-muted'}`}
                    >
                        {v2Open ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Sklendė 2
                    </button>
                    <button
                        onClick={handleG2Click}
                        className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${gate2Open ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/50' : 'bg-background'} ${disableG2 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted hover:shadow-sm'} ${shake2 ? 'animate-shake text-destructive' : ''}`}
                        title={disableG2 ? "Vandens lygiai nelygūs - vartų atidaryti negalima!" : ""}
                        aria-disabled={disableG2}
                    >
                        Aukštutiniai vartai
                    </button>
                </div>
            </div>
        ),
        svgContent: (
            <g>
                {/* Vanduo - blokai dabar persidengia keliais pikseliais (251 ir 249, 551 ir 549), kad nebūtų baltų siūlių */}
                {/* Kairysis kanalas */}
                <rect x="0" y="350" width="251" height="100" fill="url(#waterDepth)" />
                {/* Vidurinė kamera */}
                <rect x="249" y={chamberLevel} width="302" height={550 - chamberLevel} fill="url(#waterDepth)" />
                {/* Dešinysis kanalas */}
                <rect x="549" y="150" width="251" height="150" fill="url(#waterDepth)" />

                {/* Žemė / Betonas */}
                <path d="M 0,450 L 250,450 L 250,550 L 550,550 L 550,300 L 800,300 L 800,600 L 0,600 Z" fill="#78716c" />

                {/* Kairysis vamzdis - perpieštas iš dešinės į kairę, kad srautas rodytų teisingą ištuštinimo kryptį */}
                <path d="M 255,500 L 150,500 L 150,450" fill="none" stroke="#44403c" strokeWidth="16" />
                <path d="M 255,500 L 150,500 L 150,450" fill="none" stroke="#a8a29e" strokeWidth="12" />
                <path d="M 255,500 L 150,500 L 150,450" fill="none" stroke="#38bdf8" strokeWidth="8" strokeDasharray="10 10" className={isFlowing1 ? 'animate-water' : ''} opacity={isFlowing1 ? 1 : 0} />

                {/* Dešinysis vamzdis - perpieštas iš dešinės į kairę, kad srautas rodytų teisingą pripildymo kryptį */}
                <path d="M 650,300 L 650,420 L 535,420" fill="none" stroke="#44403c" strokeWidth="16" />
                <path d="M 650,300 L 650,420 L 535,420" fill="none" stroke="#a8a29e" strokeWidth="12" />
                <path d="M 650,300 L 650,420 L 535,420" fill="none" stroke="#38bdf8" strokeWidth="8" strokeDasharray="10 10" className={isFlowing2 ? 'animate-water' : ''} opacity={isFlowing2 ? 1 : 0} />

                {/* Kairioji Sklendė 1 */}
                <g transform="translate(200, 500)" cursor="pointer" onClick={() => setV1Open(!v1Open)} className="hover:opacity-80 transition-opacity">
                    <circle cx="0" cy="0" r="15" fill="#334155" />
                    <rect x="-10" y="-4" width="20" height="8" fill={v1Open ? "#16a34a" : "#dc2626"} transform={v1Open ? "rotate(90)" : ""} style={{ transition: 'transform 0.3s, fill 0.3s' }} />
                    <text x="0" y="26" fontSize="13" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">1</text>
                </g>

                {/* Dešinioji Sklendė 2 */}
                <g transform="translate(595, 420)" cursor="pointer" onClick={() => setV2Open(!v2Open)} className="hover:opacity-80 transition-opacity">
                    <circle cx="0" cy="0" r="15" fill="#334155" />
                    <rect x="-10" y="-4" width="20" height="8" fill={v2Open ? "#16a34a" : "#dc2626"} transform={v2Open ? "rotate(90)" : ""} style={{ transition: 'transform 0.3s, fill 0.3s' }} />
                    <text x="0" y="26" fontSize="13" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">2</text>
                </g>

                {/* Vartai (piešiami po vandens, todėl dengia vandens persidengimus) */}
                <g 
                    cursor={disableG1 ? "not-allowed" : "pointer"} 
                    onClick={handleG1Click}
                    className={`${shake1 ? "animate-shake" : ""} ${!disableG1 ? "hover:opacity-80 transition-opacity" : ""}`}
                >
                    <title>{disableG1 ? "Vandens lygiai nelygūs - vartų atidaryti negalima!" : "Žemutiniai vartai"}</title>
                    <rect x="240" y={gate1Open ? -60 : 140} width="10" height="310" fill="#334155" style={{ transition: 'y 1s ease-in-out' }} />
                    <rect x="235" y={gate1Open ? -60 : 140} width="20" height="10" fill="#1e293b" style={{ transition: 'y 1s ease-in-out' }} />
                    <rect x="220" y={gate1Open ? -60 : 140} width="50" height="310" fill="transparent" />
                </g>

                <g 
                    cursor={disableG2 ? "not-allowed" : "pointer"} 
                    onClick={handleG2Click}
                    className={`${shake2 ? "animate-shake" : ""} ${!disableG2 ? "hover:opacity-80 transition-opacity" : ""}`}
                >
                    <title>{disableG2 ? "Vandens lygiai nelygūs - vartų atidaryti negalima!" : "Aukštutiniai vartai"}</title>
                    <rect x="540" y={gate2Open ? -310 : 140} width="10" height="410" fill="#334155" style={{ transition: 'y 1.5s ease-in-out' }} />
                    <rect x="535" y={gate2Open ? -310 : 140} width="20" height="10" fill="#1e293b" style={{ transition: 'y 1.5s ease-in-out' }} />
                    <rect x="520" y={gate2Open ? -310 : 140} width="50" height="410" fill="transparent" />
                </g>

                {/* Vartų stulpai */}
                <path d="M 230,140 L 260,140 L 255,20 L 235,20 Z" fill="#94a3b8" opacity="0.8" />
                <path d="M 530,140 L 560,140 L 555,20 L 535,20 Z" fill="#94a3b8" opacity="0.8" />

                {/* Tekstai */}
                <text x="180" y="80" fill="#64748b" fontSize="14" textAnchor="end" className="select-none font-medium">Žemutiniai vartai</text>
                <text x="610" y="80" fill="#64748b" fontSize="14" textAnchor="start" className="select-none font-medium">Aukštutiniai vartai</text>

                {/* Laivas */}
                <g transform={`translate(${shipX}, ${getShipY()})`}>
                    <path d="M -40,-15 L 30,-15 L 45,0 L -35,0 Z" fill="#dc2626" />
                    <path d="M -35,0 L 45,0 L 35,15 L -25,15 Z" fill="#991b1b" />
                    <rect x="-30" y="-35" width="20" height="20" fill="#f8fafc" rx="2" />
                    <rect x="-25" y="-30" width="10" height="10" fill="#38bdf8" />
                    <rect x="-5" y="-45" width="8" height="30" fill="#334155" />
                    <polygon points="10,-15 15,-25 25,-25 30,-15" fill="#d97706" />

                    {/* Vandens raibuliavimas (rodomas tik kai laivas plaukia) */}
                    {(Math.abs(shipX - 100) > 1 && Math.abs(shipX - 700) > 1) && (
                        <path d="M 40,0 Q 50,5 60,0" fill="none" stroke="#fff" strokeWidth="2" opacity="0.6" className="animate-pulse" />
                    )}
                </g>
            </g>
        ),
    };
}