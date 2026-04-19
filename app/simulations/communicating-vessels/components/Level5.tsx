"use client";

import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { LevelReturn } from './types';

export function useLevel5(active: boolean): LevelReturn {
    const [tanks, setTanks] = useState([300, 0, 150]);
    const [v1Open, setV1Open] = useState(false);
    const [v2Open, setV2Open] = useState(false);

    // 5 Lygio fizika
    useEffect(() => {
        if (!active) return;
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
    }, [active, v1Open, v2Open]);

    return {
        canProceed: v1Open && v2Open && Math.abs(tanks[0] - tanks[1]) < 1 && Math.abs(tanks[1] - tanks[2]) < 1,
        reset: () => {
            setTanks([300, 0, 150]);
            setV1Open(false);
            setV2Open(false);
        },
        description: (
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">5 lygis:</span> Atidarykite sklendes. Atkreipkite dėmesį, kad indai yra skirtingo pločio – stebėkite skysčių susibalansavimo greitį!
            </p>
        ),
        controls: (
            <div className="flex items-center gap-6 text-sm font-medium">
                <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer ${v1Open ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`} onClick={() => setV1Open(!v1Open)}>
                    {v1Open ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Sklendė 1
                </div>
                <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer ${v2Open ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`} onClick={() => setV2Open(!v2Open)}>
                    {v2Open ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Sklendė 2
                </div>
            </div>
        ),
        svgContent: (
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
        ),
    };
}
