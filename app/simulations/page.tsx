"use client";

import React from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Target,
    Zap,
    Waves,
    Wind,
    Atom,
    CircleDot,
    Lightbulb
} from 'lucide-react';

const SIMULATIONS = [
    {
        id: 'center-of-mass',
        title: 'Masės centras',
        description: 'Tyrinėkite masės pasiskirstymą ir jo įtaką objekto svorio centrui bei pusiausvyrai.',
        icon: <Target className="w-8 h-8 text-blue-500" />,
        href: '/simulations/center-of-mass',
        gradient: 'from-blue-500/20 to-indigo-500/20',
        borderColor: 'group-hover:border-blue-500/50',
        available: true
    }
];

export default function SimulationsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 md:py-24">
                {/* Header Section */}
                <div className="max-w-3xl mb-16 animate-fade-in-up">
                    <h1 className="text-4xl md:text-6xl font-bold font-serif mb-6 tracking-tight">
                        Interaktyvios <span className="text-primary">Simuliacijos</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                        Mokykitės fizikos per praktiką. Tyrinėkite sudėtingus reiškinius intuityvioje virtualioje aplinkoje.
                    </p>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {SIMULATIONS.map((sim, index) => (
                        <Link
                            key={sim.id}
                            href={sim.available ? sim.href : '#'}
                            className={`group relative flex flex-col h-full bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 ${sim.borderColor} ${!sim.available ? 'cursor-not-allowed opacity-70 grayscale-[0.5]' : ''} animate-fade-in-up`}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Internal Glow Effect */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${sim.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />

                            <div className="relative flex flex-col h-full">
                                <div className="mb-6 p-3 bg-background/50 rounded-xl w-fit border border-border/50 shadow-sm transition-transform duration-300 group-hover:scale-110">
                                    {sim.icon}
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <h2 className="text-2xl font-bold tracking-tight">
                                        {sim.title}
                                    </h2>
                                    {!sim.available && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                                            Netrukus
                                        </span>
                                    )}
                                </div>

                                <p className="text-muted-foreground leading-relaxed mb-8 flex-1">
                                    {sim.description}
                                </p>

                                <div className="flex items-center text-sm font-semibold text-primary">
                                    <span>{sim.available ? 'Pradėti bandymą' : 'Vykdoma'}</span>
                                    {sim.available && (
                                        <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Additional "More Coming" Card */}
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-2xl bg-secondary/10 animate-fade-in-up"
                        style={{ animationDelay: '400ms' }}>
                        <div className="p-4 rounded-full bg-secondary/50 mb-4 text-muted-foreground">
                            <CircleDot className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground text-center">
                            Daugiau simuliacijų kuriama nuolatos...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
