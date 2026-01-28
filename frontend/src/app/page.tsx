"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Swap } from "@/components/Swap";
import { Liquidity } from "@/components/Liquidity";
import { cn } from "@/lib/utils";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"swap" | "pool">("swap");

  return (
    <main className="relative min-h-screen bg-[#7FFFD4] overflow-hidden selection:bg-blue-500/30 font-sans text-zinc-900">
      {/* Background Decor */}
      <div className="fixed top-[-5%] left-[-5%] w-[50%] h-[50%] bg-blue-300/40 blur-[130px] rounded-full pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-white/50 blur-[130px] rounded-full pointer-events-none" />

      <Navbar />

      <div className="flex flex-col items-center justify-center pt-40 pb-20 px-4 relative z-10">
        <div className="text-center mb-12 space-y-4 max-w-2xl px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
            Standard for <br />
            <span className="text-blue-600 bg-clip-text">
              Sui Ecosystem
            </span>
          </h1>
          <p className="text-zinc-600 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
            Swap tokens instantly and provide liquidity with the most refined interface on Sui.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-white/40 backdrop-blur-xl rounded-[20px] border border-black/5 mb-10 shadow-xl shadow-black/5">
          <button
            onClick={() => setActiveTab('swap')}
            className={cn(
              "px-10 py-3 rounded-[14px] text-sm font-bold transition-all duration-300",
              activeTab === 'swap'
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 scale-100"
                : "text-zinc-500 hover:text-zinc-900 scale-95 opacity-70"
            )}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={cn(
              "px-10 py-3 rounded-[14px] text-sm font-bold transition-all duration-300",
              activeTab === 'pool'
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 scale-100"
                : "text-zinc-500 hover:text-zinc-900 scale-95 opacity-70"
            )}
          >
            Pool
          </button>
        </div>

        {activeTab === 'swap' ? <Swap /> : <Liquidity />}

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {[
            { label: 'Total Value Locked', value: '$12.4M' },
            { label: '24h Volume', value: '$840K' },
            { label: 'Total Users', value: '45.2K' }
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1 backdrop-blur-sm">
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-10 text-center text-zinc-600 text-sm border-t border-white/5">
        <p>© 2024 SuiDEX Protocol. Built with love on Sui.</p>
      </footer>
    </main>
  );
}
