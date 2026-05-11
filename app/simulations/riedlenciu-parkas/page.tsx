import type { Metadata } from "next";

const PHET_SIMULATION_SRC = "/vendor/phet/energy-skate-park/energy-skate-park_en.html";

export const metadata: Metadata = {
    title: "Riedlenčių parkas | Protus",
};

export default function RiedlenciuParkasSimulationPage() {
    return (
        <main className="h-screen min-h-[100dvh] w-full overflow-hidden bg-background">
            <iframe
                src={PHET_SIMULATION_SRC}
                title="Riedlenčių parkas"
                className="h-full w-full border-0"
                allow="fullscreen; autoplay"
                allowFullScreen
            />
        </main>
    );
}
