"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, ArrowRight, ChevronDown, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react';
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

const GRID_COLS = 20;
const GRID_ROWS = 20;
const CELL_SIZE = 40;
const SVG_WIDTH = 810;
const SVG_HEIGHT = 810;

const BLOCK_COLORS: Record<number, string> = {
    1: 'hsl(221, 83%, 53%)',  // Blue for 1 kg
    2: 'hsl(142, 71%, 45%)',  // Green for 2 kg
};

const BLOCK_STROKE_COLORS: Record<number, string> = {
    1: 'hsl(221, 83%, 40%)',
    2: 'hsl(142, 71%, 32%)',
};

export default function CenterOfMassSimulation() {
    // blocks now stores mass value (1 or 2) instead of boolean
    const [blocks, setBlocks] = useState<Record<string, number>>({});
    const [level, setLevel] = useState(1);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isTeacher, setIsTeacher] = useState(false);
    const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
    const [selectedWeight, setSelectedWeight] = useState(1);
    const [zoom, setZoom] = useState(1);

    const MAX_LEVEL = 4;
    const PIN_POS = { x: 10, y: 3 };

    const [isDragging, setIsDragging] = useState(false);
    const [dragAction, setDragAction] = useState<'adding' | 'removing'>('adding');

    // Level 4 state
    const [shapePos, setShapePos] = useState({ x: 8, y: 8 });
    const [shapeAngle, setShapeAngle] = useState(0);
    const [attachedHole, setAttachedHole] = useState<number | null>(null);
    const shapeDragOffsetRef = useRef({ x: 0, y: 0 });

    const [usedHoles, setUsedHoles] = useState<Set<number>>(new Set());
    const [savedPlumbLines, setSavedPlumbLines] = useState<{ holeId: number; angle: number }[]>([]);
    const [showCompletionDialog, setShowCompletionDialog] = useState(false);

    const LEVEL_4_SHAPE_BLOCKS = useMemo(() => [
        // Top section
        { x: 3, y: 0, m: 2 }, { x: 4, y: 0, m: 1 }, { x: 5, y: 0, m: 1 },
        { x: 3, y: 1, m: 1 }, { x: 4, y: 1, m: 1 }, { x: 5, y: 1, m: 2 },
        // Middle wide section
        { x: 0, y: 2, m: 1 }, { x: 1, y: 2, m: 1 }, { x: 2, y: 2, m: 1 }, { x: 3, y: 2, m: 1 }, { x: 4, y: 2, m: 1 }, { x: 5, y: 2, m: 1 }, { x: 6, y: 2, m: 1 },
        { x: 0, y: 3, m: 1 }, { x: 1, y: 3, m: 2 }, { x: 2, y: 3, m: 1 }, { x: 3, y: 3, m: 1 }, { x: 4, y: 3, m: 1 }, { x: 5, y: 3, m: 1 }, { x: 6, y: 3, m: 1 },
        // Bottom extension
        { x: 2, y: 4, m: 1 }, { x: 3, y: 4, m: 1 }, { x: 4, y: 4, m: 2 },
        { x: 2, y: 5, m: 1 }, { x: 3, y: 5, m: 1 }, { x: 4, y: 5, m: 1 },
        { x: 2, y: 6, m: 2 }, { x: 3, y: 6, m: 1 }, { x: 4, y: 6, m: 1 },
    ], []);

    const LEVEL_4_HOLES = useMemo(() => [
        { id: 0, x: 5.5, y: 0.5 }, // Top right
        { id: 1, x: 0.5, y: 2.5 }, // Mid left
        { id: 2, x: 6.5, y: 3.5 }, // Mid right
        { id: 3, x: 2.5, y: 6.5 }, // Bottom left
    ], []);

    const LEVEL_4_COM = useMemo(() => {
        let cx = 0, cy = 0, totalM = 0;
        LEVEL_4_SHAPE_BLOCKS.forEach(b => {
            cx += (b.x + 0.5) * b.m; // block centers are at x+0.5, y+0.5
            cy += (b.y + 0.5) * b.m;
            totalM += b.m;
        });
        return { x: cx / totalM, y: cy / totalM };
    }, [LEVEL_4_SHAPE_BLOCKS]);

    const svgRef = useRef<SVGSVGElement>(null);
    const gridGroupRef = useRef<SVGGElement>(null);

    // Reset selected weight when changing levels
    const hasWeightSelector = level === 3;

    // Compute Center of Mass (weighted)
    const { comX, comY, totalMass } = useMemo(() => {
        let cx = 0;
        let cy = 0;
        let m = 0;
        for (const key in blocks) {
            const w = blocks[key];
            if (w) {
                const [x, y] = key.split(',').map(Number);
                cx += x * w;
                cy += y * w;
                m += w;
            }
        }
        if (m > 0) {
            cx /= m;
            cy /= m;
        }
        return { comX: cx, comY: cy, totalMass: m };
    }, [blocks]);

    // Check if Center of Mass is at least 0.5 grid units away from every block
    const isComOutside = useMemo(() => {
        if (totalMass === 0) return false;
        const MIN_DIST = 0.5;
        for (const key in blocks) {
            if (!blocks[key]) continue;
            const [bx, by] = key.split(',').map(Number);
            const dx = Math.max(bx - comX, 0, comX - (bx + 1));
            const dy = Math.max(by - comY, 0, comY - (by + 1));
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MIN_DIST) return false;
        }
        return true;
    }, [blocks, comX, comY, totalMass]);

    const getCoordinates = (e: React.PointerEvent) => {
        if (!svgRef.current || !gridGroupRef.current) return null;

        let pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        const ctm = gridGroupRef.current.getScreenCTM();
        if (!ctm) return null;

        const localPt = pt.matrixTransform(ctm.inverse());
        const x = Math.floor(localPt.x / CELL_SIZE);
        const y = Math.floor(localPt.y / CELL_SIZE);

        if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
            return { x, y };
        }
        return null;
    };

    const handleShapePointerDown = (e: React.PointerEvent) => {
        if (level !== 4) return;
        e.stopPropagation();
        e.preventDefault();

        if (!svgRef.current || !gridGroupRef.current) return;

        let pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = gridGroupRef.current.getScreenCTM();
        if (!ctm) return;
        const localPt = pt.matrixTransform(ctm.inverse());

        const rawX = localPt.x / CELL_SIZE;
        const rawY = localPt.y / CELL_SIZE;

        setIsDragging(true);
        setAttachedHole(null);
        setShapeAngle(0);

        shapeDragOffsetRef.current = {
            x: rawX - shapePos.x,
            y: rawY - shapePos.y
        };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (level === 4) return;
        const coords = getCoordinates(e);
        if (!coords) return;

        e.preventDefault();
        setIsDragging(true);
        const key = `${coords.x},${coords.y}`;
        const isRemoving = !!blocks[key];
        setDragAction(isRemoving ? 'removing' : 'adding');
        setBlocks(prev => {
            const next = { ...prev };
            if (isRemoving) delete next[key];
            else next[key] = selectedWeight;
            return next;
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;

        if (level === 4) {
            if (!svgRef.current || !gridGroupRef.current) return;
            let pt = svgRef.current.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const ctm = gridGroupRef.current.getScreenCTM();
            if (!ctm) return;
            const localPt = pt.matrixTransform(ctm.inverse());

            const rawX = localPt.x / CELL_SIZE;
            const rawY = localPt.y / CELL_SIZE;

            setShapePos({
                x: rawX - shapeDragOffsetRef.current.x,
                y: rawY - shapeDragOffsetRef.current.y
            });
            return;
        }

        const coords = getCoordinates(e);
        if (!coords) return;

        const key = `${coords.x},${coords.y}`;
        setBlocks(prev => {
            if (dragAction === 'removing' && prev[key]) {
                const next = { ...prev };
                delete next[key];
                return next;
            } else if (dragAction === 'adding' && !prev[key]) {
                const next = { ...prev };
                next[key] = selectedWeight;
                return next;
            }
            return prev;
        });
    };

    const handlePointerUp = () => setIsDragging(false);

    const prevDragging = useRef(isDragging);
    useEffect(() => {
        if (prevDragging.current && !isDragging && level === 4) {
            let closestHole: { id: number; x: number; y: number } | null = null;
            let minDistance = Infinity;

            for (const hole of LEVEL_4_HOLES) {
                const hx = shapePos.x + hole.x;
                const hy = shapePos.y + hole.y;
                const dist = Math.sqrt(Math.pow(hx - PIN_POS.x, 2) + Math.pow(hy - PIN_POS.y, 2));
                if (dist < 2.0) { // Snapping distance
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestHole = hole;
                    }
                }
            }

            if (closestHole) {
                setAttachedHole(closestHole.id);
                const newShapeX = PIN_POS.x - closestHole.x;
                const newShapeY = PIN_POS.y - closestHole.y;
                setShapePos({ x: newShapeX, y: newShapeY });

                const dx = LEVEL_4_COM.x - closestHole.x;
                const dy = LEVEL_4_COM.y - closestHole.y;

                const vecAngle = Math.atan2(dy, dx);
                let targetAngleDeg = ((Math.PI / 2 - vecAngle) * 180) / Math.PI;
                setShapeAngle(targetAngleDeg);

                // Record the used hole and plumb line relative to the shape
                setUsedHoles(prev => new Set(prev).add(closestHole!.id));
                setSavedPlumbLines(prev => {
                    if (prev.some(pl => pl.holeId === closestHole!.id)) return prev;
                    // The plumb line goes straight down from the hole. In the shape's local coordinates,
                    // "straight down" corresponds to an angle of -targetAngleDeg + 90 degrees
                    return [...prev, { holeId: closestHole!.id, angle: -targetAngleDeg + 90 }];
                });
            }
        }
        prevDragging.current = isDragging;
    }, [isDragging, level, shapePos, LEVEL_4_HOLES, LEVEL_4_COM]);

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('pointerup', handleGlobalMouseUp);
        return () => window.removeEventListener('pointerup', handleGlobalMouseUp);
    }, []);

    // Prevent scrolling while dragging on the grid
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) e.preventDefault();
        };
        svg.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => svg.removeEventListener('touchmove', handleTouchMove);
    }, [isDragging]);

    // Check if user is a teacher
    useEffect(() => {
        const checkRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profile?.role === 'teacher') setIsTeacher(true);
        };
        checkRole();
    }, []);

    const clearAll = () => {
        if (level === 4) {
            setShapePos({ x: 8, y: 8 });
            setShapeAngle(0);
            setAttachedHole(null);
            setUsedHoles(new Set());
            setSavedPlumbLines([]);
        } else {
            setBlocks({});
        }
    };

    const hasBothWeights = useMemo(() => {
        const weights = new Set(Object.values(blocks));
        return weights.has(1) && weights.has(2);
    }, [blocks]);

    const canProceed = level === 4 ? usedHoles.size === LEVEL_4_HOLES.length : totalMass > 0 && (level !== 2 || isComOutside) && (level !== 3 || hasBothWeights);

    return (
        <div className="flex flex-col h-screen min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20">

            {/* Legend Bar */}
            <div className="flex-none bg-card/80 backdrop-blur-sm px-4 py-3 border-b border-border/50 z-10">
                <div className="max-w-4xl mx-auto flex items-center gap-6">
                    {!hasWeightSelector && (
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm shadow-sm" style={{ backgroundColor: BLOCK_COLORS[1], border: `2px solid ${BLOCK_STROKE_COLORS[1]}` }} />
                            <span className="text-sm font-medium text-foreground">= 1 kg</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="8" fill="var(--destructive)" />
                            <circle cx="12" cy="12" r="4" fill="var(--background)" />
                            <line x1="4" y1="12" x2="20" y2="12" stroke="var(--destructive)" strokeWidth="2" />
                            <line x1="12" y1="4" x2="12" y2="20" stroke="var(--destructive)" strokeWidth="2" />
                        </svg>
                        <span className="text-sm font-medium text-foreground">= Masės centras</span>
                    </div>

                    {/* Teacher Level Switcher */}
                    {isTeacher && (
                        <div className="ml-auto relative">
                            <button
                                onClick={() => setLevelDropdownOpen(prev => !prev)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-sm font-medium text-foreground hover:bg-secondary transition duration-150"
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
                                                setBlocks({});
                                                if (i + 1 === 4) {
                                                    setShapePos({ x: 8, y: 8 });
                                                    setShapeAngle(0);
                                                    setAttachedHole(null);
                                                    setUsedHoles(new Set());
                                                    setSavedPlumbLines([]);
                                                }
                                                setFeedback(null);
                                                setSelectedWeight(1);
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

            {/* Level Task Description */}
            <div className="flex-none text-center py-2 px-4 bg-secondary/40 border-b border-border/30">
                {level === 1 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">1 lygis:</span> nupieškite bet kokią figūrą naudodami 1 kg blokus
                    </p>
                )}
                {level === 2 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">2 lygis:</span> nupieškite figūrą, kurios masės centras yra <span className="font-semibold text-destructive">už objekto ribų</span>
                    </p>
                )}
                {level === 3 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">3 lygis:</span> nupieškite bet kokią figūrą naudodami tiek 1 kg, tiek 2 kg blokus
                    </p>
                )}
                {level === 4 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">4 lygis:</span> vilkite figūrą ir pakabinkite ją ant visų {LEVEL_4_HOLES.length} skylių, kad tiksliai rastumėte jos masės centrą
                    </p>
                )}
                {feedback && (
                    <p className="text-sm text-destructive font-medium mt-1 animate-pulse">{feedback}</p>
                )}
            </div>

            {/* Block Weight Selector (Level 3+) */}
            {hasWeightSelector && (
                <div className="flex-none flex justify-center gap-2 py-2 px-4 bg-secondary/20 border-b border-border/20">
                    <button
                        onClick={() => setSelectedWeight(1)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition duration-150 ${selectedWeight === 1
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'border-border/50 text-muted-foreground hover:bg-secondary/40'
                            }`}
                    >
                        <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[1] }} />
                        1 kg
                    </button>
                    <button
                        onClick={() => setSelectedWeight(2)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition duration-150 ${selectedWeight === 2
                            ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 shadow-sm'
                            : 'border-border/50 text-muted-foreground hover:bg-secondary/40'
                            }`}
                    >
                        <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[2] }} />
                        2 kg
                    </button>
                </div>
            )}

            {/* Canvas Area */}
            <div className="flex-1 min-h-0 relative bg-secondary/30 w-full overflow-hidden flex items-center justify-center shadow-inner">
                <svg
                    ref={svgRef}
                    viewBox={`${(SVG_WIDTH - SVG_WIDTH / zoom) / 2} ${(SVG_HEIGHT - SVG_HEIGHT / zoom) / 2} ${SVG_WIDTH / zoom} ${SVG_HEIGHT / zoom}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full cursor-crosshair select-none max-w-[800px]"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ userSelect: 'none' }}
                >
                    <defs>
                        <pattern id="grid" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
                            <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50" />
                        </pattern>
                        <filter id="shadow">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.25" />
                        </filter>
                    </defs>

                    {/* Object Layer */}
                    <g ref={gridGroupRef} style={{ transform: `translate(5px, 5px) scale(1)` }}>

                        {/* Grid Background */}
                        {level !== 4 && (
                            <rect width={GRID_COLS * CELL_SIZE} height={GRID_ROWS * CELL_SIZE} fill="url(#grid)" />
                        )}

                        {/* Level 4 Pinboard Background */}
                        {level === 4 && (
                            <g>
                                {/* Wooden Frame */}
                                <rect
                                    x="-12" y="-12"
                                    width={GRID_COLS * CELL_SIZE + 24}
                                    height={GRID_ROWS * CELL_SIZE + 24}
                                    fill="#8B5A2B"
                                    rx="10"
                                    filter="url(#shadow)"
                                />
                                {/* Cork Area */}
                                <rect
                                    width={GRID_COLS * CELL_SIZE}
                                    height={GRID_ROWS * CELL_SIZE}
                                    fill="#D4A373"
                                    rx="4"
                                />
                                {/* Inner depth border */}
                                <rect
                                    x="4" y="4"
                                    width={GRID_COLS * CELL_SIZE - 8}
                                    height={GRID_ROWS * CELL_SIZE - 8}
                                    fill="none"
                                    stroke="#C18B56"
                                    strokeWidth="2"
                                    rx="2"
                                />
                            </g>
                        )}

                        {/* Plumb Line and Empty Pin in Level 4 */}
                        {level === 4 && (
                            <g>
                                {/* Empty Pin on the board (when NOT attached) */}
                                {attachedHole === null && (
                                    <g transform={`translate(${PIN_POS.x * CELL_SIZE}, ${PIN_POS.y * CELL_SIZE})`}>
                                        <circle cx="1.5" cy="2.5" r="7" fill="rgba(0,0,0,0.3)" filter="url(#shadow)" />
                                        <circle cx="0" cy="0" r="8" fill="#E63946" stroke="#9B2226" strokeWidth="1" />
                                        <circle cx="-2.5" cy="-2.5" r="2.5" fill="rgba(255,255,255,0.6)" />
                                        <circle cx="0" cy="0" r="3.5" fill="#C1121F" />
                                    </g>
                                )}
                            </g>
                        )}

                        {/* Level 4 Preset Shape */}
                        {level === 4 && (
                            <g
                                transform={`translate(${shapePos.x * CELL_SIZE}, ${shapePos.y * CELL_SIZE})`}
                                onPointerDown={handleShapePointerDown}
                                className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                            >
                                <g style={{
                                    transformOrigin: attachedHole !== null
                                        ? `${LEVEL_4_HOLES[attachedHole].x * CELL_SIZE}px ${LEVEL_4_HOLES[attachedHole].y * CELL_SIZE}px`
                                        : 'center',
                                    transform: `rotate(${shapeAngle}deg)`,
                                    transition: (isDragging || attachedHole === null) ? 'none' : 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}>
                                    {LEVEL_4_SHAPE_BLOCKS.map((b, i) => (
                                        <rect
                                            key={`l4-${i}`}
                                            x={b.x * CELL_SIZE}
                                            y={b.y * CELL_SIZE}
                                            width={CELL_SIZE}
                                            height={CELL_SIZE}
                                            style={{
                                                fill: BLOCK_COLORS[b.m],
                                                stroke: 'var(--background)'
                                            }}
                                            strokeWidth="2"
                                            filter="url(#shadow)"
                                        />
                                    ))}

                                    {/* Holes */}
                                    {LEVEL_4_HOLES.map((hole) => (
                                        <circle
                                            key={`hole-${hole.id}`}
                                            cx={hole.x * CELL_SIZE}
                                            cy={hole.y * CELL_SIZE}
                                            r={7}
                                            fill="#D4A373"
                                            stroke="var(--foreground)"
                                            strokeWidth="1.5"
                                            strokeOpacity="0.5"
                                        />
                                    ))}

                                    {/* Plumb Lines (drawn over shape) */}
                                    {savedPlumbLines.map(({ holeId, angle }) => {
                                        const hole = LEVEL_4_HOLES.find(h => h.id === holeId)!;
                                        // Draw a long line starting from the hole
                                        const length = 20 * CELL_SIZE;
                                        const rad = (angle * Math.PI) / 180;
                                        const endX = hole.x * CELL_SIZE + Math.cos(rad) * length;
                                        const endY = hole.y * CELL_SIZE + Math.sin(rad) * length;

                                        return (
                                            <line
                                                key={`plumb-${holeId}`}
                                                x1={hole.x * CELL_SIZE}
                                                y1={hole.y * CELL_SIZE}
                                                x2={endX}
                                                y2={endY}
                                                stroke="var(--foreground)"
                                                strokeWidth={2}
                                                strokeDasharray="6,6"
                                                className="opacity-80"
                                            />
                                        );
                                    })}

                                    {/* CoM Indicator (only visible when attached and ALL holes used) */}
                                    {usedHoles.size === LEVEL_4_HOLES.length && !isDragging && (
                                        <g transform={`translate(${LEVEL_4_COM.x * CELL_SIZE}, ${LEVEL_4_COM.y * CELL_SIZE})`}>
                                            <circle r="12" fill="var(--destructive)" />
                                            <circle r="6" fill="var(--background)" />
                                            <line x1="-20" y1="0" x2="20" y2="0" stroke="var(--destructive)" strokeWidth="3" />
                                            <line x1="0" y1="-20" x2="0" y2="20" stroke="var(--destructive)" strokeWidth="3" />
                                        </g>
                                    )}
                                </g>
                            </g>
                        )}

                        {/* Inserted Pin (when attached) drawn on top of everything */}
                        {level === 4 && attachedHole !== null && (
                            <g transform={`translate(${PIN_POS.x * CELL_SIZE}, ${PIN_POS.y * CELL_SIZE})`} style={{ pointerEvents: 'none' }}>
                                <circle cx="0.5" cy="1.5" r="7" fill="rgba(0,0,0,0.3)" />
                                <circle cx="0" cy="0" r="8" fill="#E63946" stroke="#9B2226" strokeWidth="1" />
                                <circle cx="-2.5" cy="-2.5" r="2.5" fill="rgba(255,255,255,0.6)" />
                                <circle cx="0" cy="0" r="3.5" fill="#C1121F" />
                            </g>
                        )}

                        {/* Draw blocks (levels 1-3) */}
                        {level !== 4 && Array.from({ length: GRID_ROWS }).map((_, y) => (
                            Array.from({ length: GRID_COLS }).map((_, x) => {
                                const blockMass = blocks[`${x},${y}`];
                                const isSolid = !!blockMass;
                                return (
                                    <rect
                                        key={`${x}-${y}`}
                                        x={x * CELL_SIZE}
                                        y={y * CELL_SIZE}
                                        width={CELL_SIZE}
                                        height={CELL_SIZE}
                                        style={{
                                            fill: isSolid ? BLOCK_COLORS[blockMass] : 'transparent',
                                            stroke: isSolid ? 'var(--background)' : 'transparent',
                                        }}
                                        strokeWidth="2"
                                        className={`transition-colors duration-200 hover:fill-primary/20`}
                                        filter={isSolid ? "url(#shadow)" : ""}
                                    />
                                );
                            })
                        ))}

                        {/* Always show Center of Mass when blocks exist */}
                        {level !== 4 && totalMass > 0 && (
                            <g transform={`translate(${comX * CELL_SIZE + CELL_SIZE / 2}, ${comY * CELL_SIZE + CELL_SIZE / 2})`}>
                                <circle r="12" fill="var(--destructive)" />
                                <circle r="6" fill="var(--background)" />
                                <line x1="-20" y1="0" x2="20" y2="0" stroke="var(--destructive)" strokeWidth="3" />
                                <line x1="0" y1="-20" x2="0" y2="20" stroke="var(--destructive)" strokeWidth="3" />
                            </g>
                        )}
                    </g>
                </svg>

                {/* Zoom Controls */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                    <button
                        onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-card/90 border border-border shadow-md hover:bg-card transition duration-150"
                        title="Padidinti"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-card/90 border border-border shadow-md hover:bg-card transition duration-150"
                        title="Sumažinti"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar Area */}
            <div className="flex-none sticky bottom-0 bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 pb-4 md:pb-6">
                <div className="max-w-4xl mx-auto flex items-center gap-3 p-4">
                    <button
                        onClick={clearAll}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition duration-200 font-medium"
                        title="Išvalyti viską"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Išvalyti viską</span>
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={() => {
                            if (level === MAX_LEVEL) {
                                setShowCompletionDialog(true);
                                return;
                            }
                            setFeedback(null);
                            setBlocks({});
                            if (level + 1 === 4) {
                                setShapePos({ x: 8, y: 8 });
                                setShapeAngle(0);
                                setAttachedHole(null);
                                setUsedHoles(new Set());
                                setSavedPlumbLines([]);
                            }
                            setSelectedWeight(1);
                            setLevel(prev => prev + 1);
                        }}
                        disabled={!canProceed}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition duration-200 ${canProceed ? 'bg-primary text-primary-foreground shadow-md hover:opacity-90' : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'}`}
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
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                            Simuliacija baigta!
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Puiku! Jūs sėkmingai atlikote visas užduotis ir radote objekto masės centrą.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-muted-foreground">
                        Dabar galite uždaryti šį skirtuką ir grįžti į platformą tęsti kitų darbų.
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