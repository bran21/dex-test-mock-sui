"use client";

import { ConnectButton } from "@suiet/wallet-kit";
import { Layers } from "lucide-react";

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/40 backdrop-blur-xl border-b border-black/5 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-blue-600 to-emerald-600 rounded-xl shadow-lg shadow-blue-500/20">
                    <Layers className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-zinc-900 tracking-tight">
                    SuiDEX
                </span>
            </div>

            <div className="flex items-center gap-8">
                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-600">
                    <a href="#" className="hover:text-zinc-900 transition-colors">Swap</a>
                    <a href="#" className="hover:text-zinc-900 transition-colors">Pools</a>
                    <a href="#" className="hover:text-zinc-900 transition-colors">Stake</a>
                </div>

                <ConnectButton className="!bg-white !text-zinc-900 !rounded-full !px-6 !py-2.5 !font-bold hover:!bg-zinc-50 active:!scale-95 transition-all shadow-xl shadow-black/10 border border-black/5" />
            </div>
        </nav>
    );
}
