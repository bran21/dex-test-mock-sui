"use client";

import { useState } from "react";
import { useWallet, ConnectButton } from "@suiet/wallet-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Plus, Settings, Info, Droplets } from "lucide-react";
import { PACKAGE_ID, MODULE_NAME, SUI_TYPE, CUSTOM_TOKEN_TYPE, POOL_ID } from "../config";

export function Liquidity() {
    const { connected, account, signAndExecuteTransaction } = useWallet();
    const client = useSuiClient();
    const [amountA, setAmountA] = useState("");
    const [amountB, setAmountB] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreatePool = async () => {
        if (!connected || !amountA || !amountB || !account) return;

        try {
            setIsCreating(true);
            const tx = new Transaction();

            const amtA = BigInt(Math.floor(parseFloat(amountA) * 1e9));
            const amtB = BigInt(Math.floor(parseFloat(amountB) * 1e9));

            // Split SUI for amount A
            const [coinA] = tx.splitCoins(tx.gas, [amtA]);

            // Fetch real CUSTOM token coins
            const { data: coins } = await client.getCoins({
                owner: account.address,
                coinType: CUSTOM_TOKEN_TYPE,
            });

            if (coins.length === 0) {
                throw new Error("No CUSTOM token coins found in wallet");
            }

            const sourceCoin = coins.find(c => BigInt(c.balance) >= amtB);
            if (!sourceCoin) {
                throw new Error("Insignificant CUSTOM token balance for pool creation");
            }

            const [coinB] = tx.splitCoins(tx.object(sourceCoin.coinObjectId), [amtB]);

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::create_pool`,
                typeArguments: [SUI_TYPE, CUSTOM_TOKEN_TYPE],
                arguments: [coinA, coinB],
            });

            const res = await signAndExecuteTransaction({
                transaction: tx,
            });
            console.log("Pool created:", res);
            alert("Pool created successfully! Please find the Pool ID in the transaction results and update config.ts");
        } catch (error) {
            console.error("Failed to create pool:", error);
            alert("Failed to create pool: " + (error as Error).message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddLiquidity = async () => {
        if (!connected || !amountA || !amountB || !account || !POOL_ID) return;

        try {
            setIsAdding(true);
            const tx = new Transaction();

            const amtA = BigInt(Math.floor(parseFloat(amountA) * 1e9));
            const amtB = BigInt(Math.floor(parseFloat(amountB) * 1e9));

            // Split SUI for amount A
            const [coinA] = tx.splitCoins(tx.gas, [amtA]);

            // Fetch real CUSTOM token coins
            const { data: coins } = await client.getCoins({
                owner: account.address,
                coinType: CUSTOM_TOKEN_TYPE,
            });

            if (coins.length === 0) {
                throw new Error("No CUSTOM token coins found in wallet");
            }

            const sourceCoin = coins.find(c => BigInt(c.balance) >= amtB);
            if (!sourceCoin) {
                throw new Error("Insignificant CUSTOM token balance to add liquidity");
            }

            const [coinB] = tx.splitCoins(tx.object(sourceCoin.coinObjectId), [amtB]);

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::add_liquidity`,
                typeArguments: [SUI_TYPE, CUSTOM_TOKEN_TYPE],
                arguments: [tx.object(POOL_ID), coinA, coinB],
            });

            const res = await signAndExecuteTransaction({
                transaction: tx,
            });
            console.log("Liquidity added:", res);
            alert("Liquidity added successfully!");
        } catch (error) {
            console.error("Failed to add liquidity:", error);
            alert("Failed to add liquidity: " + (error as Error).message);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="w-full max-w-[480px] p-1.5 rounded-[38px] bg-gradient-to-b from-white/30 to-white/10 border border-white/40 shadow-2xl backdrop-blur-2xl">
            <div className="bg-white/40 backdrop-blur-md rounded-[32px] p-6 space-y-5 border border-white/20">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Droplets className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Add Liquidity</h2>
                    </div>
                    <Settings className="w-5 h-5 cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors" />
                </div>

                <p className="text-sm font-medium text-zinc-500 px-1 leading-relaxed">
                    Earn 0.3% of all trades on this pair proportional to your share of the pool.
                </p>

                <div className="space-y-2">
                    <div className="bg-white/50 rounded-2xl p-5 border border-black/5 hover:border-blue-500/30 transition-all group shadow-sm">
                        <div className="flex items-center justify-between">
                            <input
                                type="number"
                                placeholder="0"
                                value={amountA}
                                onChange={(e) => setAmountA(e.target.value)}
                                className="bg-transparent text-4xl font-semibold outline-none w-full placeholder:text-zinc-400 text-zinc-900"
                            />
                            <button className="flex items-center gap-2 bg-zinc-900 hover:bg-black px-4 py-2 rounded-2xl shadow-lg transition-all active:scale-95">
                                <div className="w-5 h-5 bg-blue-500 rounded-full border border-white/20" />
                                <span className="font-bold text-white text-sm">SUI</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center -my-5 relative z-10">
                        <div className="bg-zinc-900 border-[6px] border-[#7FFFD4] p-3 rounded-2xl text-white shadow-xl">
                            <Plus className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white/50 rounded-2xl p-5 border border-black/5 hover:border-blue-500/30 transition-all group shadow-sm">
                        <div className="flex items-center justify-between">
                            <input
                                type="number"
                                placeholder="0"
                                value={amountB}
                                onChange={(e) => setAmountB(e.target.value)}
                                className="bg-transparent text-4xl font-semibold outline-none w-full placeholder:text-zinc-400 text-zinc-900"
                            />
                            <button
                                className="flex items-center gap-2 bg-zinc-900 hover:bg-black px-4 py-2 rounded-2xl shadow-lg transition-all active:scale-95 group relative"
                                title="0x1739953b042e122df0ca3811c2983d94a7d442f28514970e8095903791934935"
                            >
                                <div className="w-5 h-5 bg-purple-500 rounded-full border border-white/20" />
                                <span className="font-bold text-white text-sm">CUSTOM</span>
                            </button>
                        </div>
                    </div>
                </div>

                {connected ? (
                    <div className="space-y-3">
                        <button
                            onClick={handleCreatePool}
                            disabled={isCreating || !amountA || !amountB}
                            className="w-full py-4.5 bg-zinc-900 hover:bg-black text-white font-black text-lg rounded-[22px] shadow-2xl active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isCreating ? "Creating..." : "Create New Pool"}
                        </button>
                        <button
                            onClick={handleAddLiquidity}
                            disabled={isAdding || !amountA || !amountB}
                            className="w-full py-4.5 bg-white border-2 border-zinc-900 hover:bg-zinc-50 text-zinc-900 font-black text-lg rounded-[22px] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isAdding ? "Adding..." : "Supply Liquidity"}
                        </button>
                    </div>
                ) : (
                    <ConnectButton className="!w-full !rounded-[22px] !py-5 !bg-zinc-900 !hover:bg-black !text-white !font-black !text-lg !shadow-2xl" />
                )}

                <div className="pt-2">
                    <div className="bg-black/5 rounded-2xl p-4 space-y-3 border border-black/5 backdrop-blur-sm">
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-500 uppercase tracking-tight">SUI per CUSTOM</span>
                            <span className="text-zinc-900">0.80</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-500 uppercase tracking-tight">CUSTOM per SUI</span>
                            <span className="text-zinc-900">1.25</span>
                        </div>
                        <div className="pt-2 border-t border-black/5 flex justify-between text-xs font-bold text-blue-600">
                            <span>Share of Pool</span>
                            <span>0%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
