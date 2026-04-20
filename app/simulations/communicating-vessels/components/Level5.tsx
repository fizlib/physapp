"use client";

import { useState, useRef, useEffect } from 'react';
import { Droplet } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { LevelReturn } from './types';

// Vamzdžio formos kelias, naudojamas kaip kaukė (clip-path) skysčiui ir fono išpjovimui
const U_TUBE_CLIP = `M 250,100 
    L 250,160 L 180,180 L 180,220 L 250,200 
    L 250,240 L 180,260 L 180,300 L 250,280 
    L 250,320 L 180,340 L 180,380 L 250,360 
    L 250,550 L 650,550 L 650,100 L 550,100 
    L 550,450 L 350,450 L 350,100 Z`;

// Kontūrai be uždarytų galų, kad angos atrodytų atviros
const TUBE_STROKE_OUTER = `M 250,100 
    L 250,160 L 180,180 M 180,220 L 250,200 
    L 250,240 L 180,260 M 180,300 L 250,280 
    L 250,320 L 180,340 M 180,380 L 250,360 
    L 250,550 L 650,550 L 650,100`;

const TUBE_STROKE_INNER = `M 350,100 L 350,450 L 550,450 L 550,100`;

// Guminio ančiuko komponentas (kamštis)
const RubberDuck = ({ x, y, scale = 1, rotation = 0 }: { x: number; y: number; scale?: number; rotation?: number }) => (
    // scaleX=-1 atspindi ančiuką, kad jis žiūrėtų į kairę (uodega įsprausta į vamzdį)
    <g 
        style={{ transition: 'transform 0.1s linear' }}
        transform={`translate(${x}, ${y}) scale(${-scale}, ${scale}) rotate(${rotation})`}
    >
        <path d="M -20,5 C -30,-5 -25,-15 -15,-10 C -15,-10 -10,-5 -5,-5 Z" fill="#FACC15" />
        <path d="M -10,-5 C -10,-20 20,-20 25,-5 C 30,10 20,20 5,20 C -10,20 -15,10 -10,-5 Z" fill="#FACC15" />
        <circle cx="15" cy="-15" r="10" fill="#FACC15" />
        <circle cx="18" cy="-18" r="2" fill="#000" />
        <path d="M 23,-15 L 33,-13 L 25,-10 Z" fill="#F97316" />
        <path d="M 0,-2 C 10,-2 15,5 5,8 C 0,8 -5,2 0,-2 Z" fill="#EAB308" />
    </g>
);

export function useLevel5(active: boolean): LevelReturn {
    // Vandens kiekis nuo 0 (tuščia vertikalė, tik dugne) iki 100 (pilna iki paviršiaus)
    const [waterAmount, setWaterAmount] = useState(0);
    const [isPouring, setIsPouring] = useState(false);
    const pourIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Vandens lygio Y koordinatė (nuo 450 iki 100)
    const currentY = 450 - (waterAmount / 100) * 350;

    const startPour = () => {
        if (waterAmount >= 100) return;
        setIsPouring(true);
        if (pourIntervalRef.current) return;
        pourIntervalRef.current = setInterval(() => {
            setWaterAmount(prev => {
                const next = prev + 1.5;
                if (next >= 100) {
                    stopPour();
                    return 100;
                }
                return next;
            });
        }, 50);
    };

    const stopPour = () => {
        setIsPouring(false);
        if (pourIntervalRef.current) {
            clearInterval(pourIntervalRef.current);
            pourIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (pourIntervalRef.current) clearInterval(pourIntervalRef.current);
        };
    }, []);

    const getDuckProps = (initialY: number, targetX: number, targetRot: number, yOffset: number) => {
        const detachY = initialY;
        
        if (currentY > detachY) {
            return { x: 180, y: initialY, rotation: 15 };
        }
        
        const range = 40;
        let progress = (detachY - currentY) / range;
        if (progress > 1) progress = 1;

        const x = 180 + (targetX - 180) * progress;
        const y = currentY + (yOffset * progress);
        
        let rotation = 15 + (targetRot - 15) * progress;
        if (progress > 0 && progress < 1) {
            rotation += Math.sin(progress * Math.PI * 2) * -10;
        }

        return { x, y, rotation };
    };

    const duck1 = getDuckProps(200, 275, 5, -2);
    const duck2 = getDuckProps(280, 300, 0, 2);
    const duck3 = getDuckProps(360, 325, -5, 1);

    return {
        canProceed: waterAmount >= 100,
        reset: () => {
            setWaterAmount(0);
            stopPour();
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">5 lygis:</span> U-vamzdelis su atviromis atšakomis. Pildykite vandenį laikydami mygtuką ir stebėkite ančiukus!
            </p>
        ),
        controls: (
            <Button
                draggable={false}
                onPointerDown={startPour}
                onPointerUp={stopPour}
                onPointerLeave={stopPour}
                onPointerCancel={stopPour}
                disabled={waterAmount >= 100}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold select-none cursor-pointer"
            >
                <Droplet className="w-4 h-4 mr-2" /> Įpilti vandens
            </Button>
        ),
        svgContent: (
            <g>
                <defs>
                    <clipPath id="l5-clip">
                        <path d={U_TUBE_CLIP} />
                    </clipPath>

                    {/* Vandens gradientas */}
                    <linearGradient id="waterGradient" x1="0" y1={currentY} x2="0" y2="600" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#4facfe" />
                        <stop offset="100%" stopColor="#0082c8" />
                    </linearGradient>

                    {/* Žemės tekstūra */}
                    <pattern id="soil" width="100" height="100" patternUnits="userSpaceOnUse">
                        <rect width="100" height="100" fill="#8B5A2B" />
                        <path d="M 10,10 Q 20,5 30,10 T 50,10" stroke="#704214" fill="none" strokeWidth="2" opacity="0.6" />
                        <circle cx="80" cy="30" r="4" fill="#5C4033" opacity="0.8" />
                        <circle cx="20" cy="70" r="3" fill="#5C4033" opacity="0.8" />
                        <circle cx="60" cy="80" r="2" fill="#3E2723" opacity="0.5" />
                        <path d="M 60,80 Q 70,85 80,80" stroke="#A0522D" fill="none" strokeWidth="2" opacity="0.7" />
                    </pattern>
                </defs>

                {/* Dangus / Fonas */}
                <rect x="0" y="0" width="800" height="600" fill="#E0F2FE" />

                {/* Žemė ir Žolė */}
                <rect x="0" y="100" width="800" height="500" fill="url(#soil)" />
                <rect x="0" y="100" width="800" height="12" fill="#4ADE80" />
                <rect x="0" y="112" width="800" height="6" fill="#22C55E" />

                {/* Vamzdžio ertmė (atidengia dangaus spalvą per žemę) */}
                <path d={U_TUBE_CLIP} fill="#E0F2FE" />
                <path d={U_TUBE_CLIP} fill="rgba(0,0,0,0.04)" /> {/* Švelnus vidinis šešėlis gyliui */}

                {/* Vandens srovė (Pylimo efektas) */}
                {isPouring && (
                    <rect
                        x="585"
                        y="0"
                        width="30"
                        height={currentY + 20}
                        fill="#4facfe"
                        opacity="0.6"
                        className="animate-pulse"
                        rx="15"
                    />
                )}

                {/* Pagrindinis Vanduo */}
                <g clipPath="url(#l5-clip)">
                    {/* Pagrindinis Vanduo */}
                    <rect
                        x="250"
                        y={currentY}
                        width="550"
                        height={600 - currentY}
                        fill="url(#waterGradient)"
                    />
                    
                    {/* 3-iosios (apatinės) atšakos vanduo */}
                    {currentY <= 360 && (
                        <rect x="180" y={Math.max(currentY, 320)} width="75" height={380 - Math.max(currentY, 320)} fill="url(#waterGradient)" />
                    )}
                    {currentY <= 360 && currentY >= 320 && (
                        <line x1="180" y1={currentY} x2="252" y2={currentY} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
                    )}

                    {/* 2-osios (vidurinės) atšakos vanduo */}
                    {currentY <= 280 && (
                        <rect x="180" y={Math.max(currentY, 240)} width="75" height={300 - Math.max(currentY, 240)} fill="url(#waterGradient)" />
                    )}
                    {currentY <= 280 && currentY >= 240 && (
                        <line x1="180" y1={currentY} x2="252" y2={currentY} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
                    )}

                    {/* 1-osios (viršutinės) atšakos vanduo */}
                    {currentY <= 200 && (
                        <rect x="180" y={Math.max(currentY, 160)} width="75" height={220 - Math.max(currentY, 160)} fill="url(#waterGradient)" />
                    )}
                    {currentY <= 200 && currentY >= 160 && (
                        <line x1="180" y1={currentY} x2="252" y2={currentY} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
                    )}

                    {/* Pagrindinės dalies vandens paviršiaus linija */}
                    <line
                        x1="250"
                        y1={currentY}
                        x2="800"
                        y2={currentY}
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="4"
                    />
                </g>

                {/* Vamzdžio stiklo kontūrai */}
                <path
                    d={TUBE_STROKE_OUTER}
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-slate-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d={TUBE_STROKE_INNER}
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-slate-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Guminiai ančiukai, užkemšantys atšakas */}
                <RubberDuck x={duck1.x} y={duck1.y} scale={0.8} rotation={duck1.rotation} />
                <RubberDuck x={duck2.x} y={duck2.y} scale={0.8} rotation={duck2.rotation} />
                <RubberDuck x={duck3.x} y={duck3.y} scale={0.8} rotation={duck3.rotation} />
            </g>
        ),
    };
}