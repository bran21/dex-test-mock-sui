"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Liquidity } from "@/components/Liquidity";

export default function PoolPage() {
    const router = useRouter();

    const handlePoolCreated = (newPoolId: string) => {
        router.push(`/swap?poolId=${newPoolId}`);
    };

    return (
        <main className="relative min-h-screen bg-[#7FFFD4] overflow-hidden selection:bg-blue-500/30 font-sans text-zinc-900">
            {/* Background Decor */}
            <div className="fixed top-[-5%] left-[-5%] w-[50%] h-[50%] bg-blue-300/40 blur-[130px] rounded-full pointer-events-none animate-pulse" />
            <div className="fixed bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-white/50 blur-[130px] rounded-full pointer-events-none" />

            <Navbar />

            <div className="flex flex-col items-center justify-center pt-40 pb-20 px-4 relative z-10">
                <div className="text-center mb-12 space-y-4 max-w-2xl px-4">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
                        Provide <br />
                        <span className="text-blue-600 bg-clip-text">
                            Liquidity
                        </span>
                    </h1>
                    <p className="text-zinc-600 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                        Earn fees by providing liquidity to the protocol.
                    </p>
                </div>

                <Liquidity onPoolCreated={handlePoolCreated} />
            </div>

            <footer className="py-10 text-center text-zinc-600 text-sm border-t border-white/5">
                <p>© 2024 SuiDEX Protocol. Built with love on Sui.</p>
            </footer>
        </main>
    );
}
