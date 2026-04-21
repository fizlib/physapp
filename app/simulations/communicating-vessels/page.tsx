"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ChevronDown, CheckCircle2, Droplet, RotateCcw } from 'lucide-react';
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

import { useLevel1 } from './components/Level1';
import { useLevel2 } from './components/Level2';
import { useLevel3 } from './components/Level3';
import { useLevel4 } from './components/Level4';

const SVG_WIDTH = 800;
const SVG_HEIGHT = 600;
const MAX_LEVEL = 4;

export default function CommunicatingVesselsSimulation() {
    const [level, setLevel] = useState(1);
    const [isTeacher, setIsTeacher] = useState(false);
    const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
    const [showCompletionDialog, setShowCompletionDialog] = useState(false);

    // All level hooks are called unconditionally (React rules of hooks).
    // Each hook receives an `active` flag to guard its effects.
    const l1 = useLevel1(level === 1);
    const l2 = useLevel2(level === 2);
    const l3 = useLevel3(level === 3);
    const l4 = useLevel4(level === 4);

    const levels = useMemo(() => [l1, l2, l3, l4], [l1, l2, l3, l4]);
    const current = levels[level - 1];

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
                                                current.reset();
                                                setLevel(i + 1);
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
                {current.description}
            </div>

            <div className="flex-none flex justify-center gap-4 py-3 px-4 bg-secondary/10 border-b border-border/20 min-h-[60px]">
                {current.controls}
            </div>

            <div className="flex-1 relative w-full overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                <svg
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full max-w-[800px] select-none drop-shadow-sm touch-none"
                >
                    <defs>
                        {/* Šviesesnis ir vizualiai malonesnis vandens gradientas */}
                        <linearGradient id="waterDepth" x1="0" y1="0" x2="0" y2="500" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="1" />
                            <stop offset="30%" stopColor="#38bdf8" stopOpacity="1" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="1" />
                        </linearGradient>

                        <linearGradient id="oilDepth" x1="0" y1="0" x2="0" y2="500" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
                            <stop offset="100%" stopColor="#ca8a04" stopOpacity="1" />
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

                    {current.svgContent}
                </svg>
            </div>

            <div className="flex-none sticky bottom-0 bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 pb-4 md:pb-6">
                <div className="max-w-4xl mx-auto flex items-center gap-3 p-4">
                    <button
                        onClick={() => current.reset()}
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
                            current.reset();
                            setLevel(prev => prev + 1);
                        }}
                        disabled={!current.canProceed}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition duration-200 ${current.canProceed ? 'bg-primary text-primary-foreground shadow-md hover:opacity-90 hover:-translate-y-0.5' : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'}`}
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
                            Puikiai padirbėta! Sėkmingai išnagrinėjote susisiekiančiųjų indų savybes skirtingose situacijose.
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