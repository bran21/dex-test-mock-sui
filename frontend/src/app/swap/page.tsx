"use client";

import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Swap } from "@/components/Swap";
import { POOL_ID as INITIAL_POOL_ID } from "@/config";
import { Suspense } from "react";

function SwapContent() {
    const searchParams = useSearchParams();
    const poolId = searchParams.get("poolId") || INITIAL_POOL_ID;

    return (
        <div className="flex flex-col items-center justify-center pt-40 pb-20 px-4 relative z-10">
            <div className="text-center mb-12 space-y-4 max-w-2xl px-4">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
                    Standard for <br />
                    <span className="text-blue-600 bg-clip-text">
                        Sui Ecosystem
                    </span>
                </h1>
                <p className="text-zinc-600 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                    Swap tokens instantly with the most refined interface on Sui.
                </p>
            </div>

            <Swap poolId={poolId} />
        </div>
    );
}

export default function SwapPage() {
    return (
        <main className="relative min-h-screen bg-[#7FFFD4] overflow-hidden selection:bg-blue-500/30 font-sans text-zinc-900">
            {/* Background Decor */}
            <div className="fixed top-[-5%] left-[-5%] w-[50%] h-[50%] bg-blue-300/40 blur-[130px] rounded-full pointer-events-none animate-pulse" />
            <div className="fixed bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-white/50 blur-[130px] rounded-full pointer-events-none" />

            <Navbar />

            <Suspense fallback={<div className="pt-40 text-center">Loading Swap...</div>}>
                <SwapContent />
            </Suspense>

            <footer className="py-10 text-center text-zinc-600 text-sm border-t border-white/5">
                <p>© 2024 SuiDEX Protocol. Built with love on Sui.</p>
            </footer>
        </main>
    );
}
