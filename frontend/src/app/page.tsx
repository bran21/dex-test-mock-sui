"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/swap");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#7FFFD4] flex items-center justify-center">
      <div className="text-zinc-900 font-bold animate-pulse">sabar ... nyeduh kopi sana</div>
    </main>
  );
}

