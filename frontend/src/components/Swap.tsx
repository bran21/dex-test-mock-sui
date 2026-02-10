"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, ConnectButton } from "@suiet/wallet-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { ArrowDown, Settings, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACKAGE_ID, MODULE_NAME, SUI_TYPE, CUSTOM_TOKEN_TYPE, SUI_DECIMALS, CUSTOM_TOKEN_DECIMALS } from "../config";

export function Swap({ poolId }: { poolId: string }) {
    const { connected, account, signAndExecuteTransaction } = useWallet();
    const client = useSuiClient();
    const [fromAmount, setFromAmount] = useState("");
    const [toAmount, setToAmount] = useState("");
    const [isSwapping, setIsSwapping] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    const [suiBalance, setSuiBalance] = useState("0");
    const [customBalance, setCustomBalance] = useState("0");
    const [poolReserveA, setPoolReserveA] = useState("0");
    const [poolReserveB, setPoolReserveB] = useState("0");

    const fetchBalances = useCallback(async () => {
        if (!account?.address) return;
        try {
            const [sui, custom] = await Promise.all([
                client.getBalance({ owner: account.address, coinType: SUI_TYPE }),
                client.getBalance({ owner: account.address, coinType: CUSTOM_TOKEN_TYPE }),
            ]);
            setSuiBalance((Number(sui.totalBalance) / Math.pow(10, SUI_DECIMALS)).toFixed(3));
            setCustomBalance((Number(custom.totalBalance) / Math.pow(10, CUSTOM_TOKEN_DECIMALS)).toFixed(3));
        } catch (error) {
            console.error("Error fetching balances:", error);
        }
    }, [account?.address, client]);

    const fetchPoolReserves = useCallback(async () => {
        if (!poolId) return;
        try {
            const poolObject = await client.getObject({
                id: poolId,
                options: { showContent: true },
            });

            if (poolObject.data?.content && 'fields' in poolObject.data.content) {
                const fields = poolObject.data.content.fields as any;
                const reserveA = fields.coin_a || "0";
                const reserveB = fields.coin_b || "0";
                setPoolReserveA((Number(reserveA) / Math.pow(10, SUI_DECIMALS)).toFixed(3));
                setPoolReserveB((Number(reserveB) / Math.pow(10, CUSTOM_TOKEN_DECIMALS)).toFixed(3));
                console.log("Pool Reserves - SUI:", reserveA, "CUSTOM:", reserveB);
            }
        } catch (error) {
            console.error("Error fetching pool reserves:", error);
        }
    }, [client, poolId]);

    useEffect(() => {
        fetchBalances();
        fetchPoolReserves();
        const interval = setInterval(() => {
            fetchBalances();
            fetchPoolReserves();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchBalances, fetchPoolReserves]);

    const toggleFlip = () => {
        setIsFlipped(!isFlipped);
        setFromAmount("");
        setToAmount("");
    };

    const handleSwap = async () => {
        if (!connected || !fromAmount || !poolId || !account) return;

        try {
            setIsSwapping(true);

            // Validate pool has liquidity before attempting swap
            if (parseFloat(poolReserveA) === 0 || parseFloat(poolReserveB) === 0) {
                throw new Error("Pool has no liquidity. Please add liquidity first.");
            }

            const tx = new Transaction();
            tx.setSender(account.address);

            const decimals = !isFlipped ? SUI_DECIMALS : CUSTOM_TOKEN_DECIMALS;
            const amount = BigInt(Math.floor(parseFloat(fromAmount) * Math.pow(10, decimals)));

            if (amount <= 0) {
                throw new Error("Amount must be greater than 0");
            }

            if (!isFlipped) {
                // SUI -> CUSTOM (swap_a_to_b)
                // Validate pool has enough CUSTOM tokens
                if (parseFloat(poolReserveB) === 0) {
                    throw new Error("Pool has no CUSTOM tokens available for swap");
                }

                const [coin] = tx.splitCoins(tx.gas, [amount]);
                tx.moveCall({
                    target: `${PACKAGE_ID}::${MODULE_NAME}::swap_a_to_b`,
                    typeArguments: [SUI_TYPE, CUSTOM_TOKEN_TYPE],
                    arguments: [tx.object(poolId), coin],
                });
            } else {
                // CUSTOM -> SUI (swap_b_to_a)
                // Validate pool has enough SUI tokens
                if (parseFloat(poolReserveA) === 0) {
                    throw new Error("Pool has no SUI tokens available for swap");
                }

                // Fetch coins of type CUSTOM_TOKEN_TYPE
                const { data: coins } = await client.getCoins({
                    owner: account.address,
                    coinType: CUSTOM_TOKEN_TYPE,
                });

                if (coins.length === 0) {
                    throw new Error("No CUSTOM token coins found in wallet");
                }

                // For simplicity, we split from the first coin or use it directly
                // Logic: split the amount from the first coin that has enough
                const sourceCoin = coins.find(c => BigInt(c.balance) >= amount);
                if (!sourceCoin) {
                    throw new Error("Insufficient CUSTOM token balance");
                }

                const [coin] = tx.splitCoins(tx.object(sourceCoin.coinObjectId), [amount]);
                tx.moveCall({
                    target: `${PACKAGE_ID}::${MODULE_NAME}::swap_b_to_a`,
                    typeArguments: [SUI_TYPE, CUSTOM_TOKEN_TYPE],
                    arguments: [tx.object(poolId), coin],
                });
            }

            // Set gas budget explicitly
            tx.setGasBudget(100000000); // 0.1 SUI

            const res = await signAndExecuteTransaction({
                transaction: tx,
            });
            console.log("Swap successful:", res);
            alert("Swap successful!");
            fetchBalances();
            fetchPoolReserves();
        } catch (error) {
            console.error("Swap failed:", error);
            alert("Swap failed: " + (error as Error).message);
        } finally {
            setIsSwapping(false);
        }
    };

    return (
        <div className="w-full max-w-[480px] p-1.5 rounded-[38px] bg-gradient-to-b from-white/30 to-white/10 border border-white/40 shadow-2xl backdrop-blur-2xl">
            <div className="bg-white/40 backdrop-blur-md rounded-[32px] p-6 space-y-5 border border-white/20">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Swap</h2>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Low Slippage</span>
                        </div>
                        <Settings className="w-5 h-5 cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="bg-white/50 rounded-2xl p-5 border border-black/5 hover:border-blue-500/30 transition-all group shadow-sm">
                        <div className="flex items-center justify-between">
                            <input
                                type="number"
                                placeholder="0"
                                value={fromAmount}
                                onChange={(e) => setFromAmount(e.target.value)}
                                className="bg-transparent text-4xl font-semibold outline-none w-full placeholder:text-zinc-400 text-zinc-900"
                            />
                            <button
                                onClick={toggleFlip}
                                className="flex items-center gap-2 bg-zinc-900 hover:bg-black px-4 py-2 rounded-2xl shadow-lg transition-all active:scale-95"
                            >
                                <div className={cn("w-6 h-6 rounded-full border-2 border-white/20", !isFlipped ? "bg-blue-500" : "bg-purple-500")} />
                                <span className="font-bold text-white text-sm">{!isFlipped ? "SUI" : "CUSTOM"}</span>
                            </button>
                        </div>
                        <div className="mt-3 text-[13px] font-medium text-zinc-500 flex justify-between">
                            <span>$0.00</span>
                            <span className="text-zinc-400">Balance: <span className="text-zinc-900">{!isFlipped ? suiBalance : customBalance}</span></span>
                        </div>
                    </div>

                    <div className="flex justify-center -my-5 relative z-10">
                        <button
                            onClick={toggleFlip}
                            className="bg-zinc-900 border-[6px] border-[#7FFFD4] p-3 rounded-2xl hover:scale-110 active:scale-95 transition-all text-white shadow-xl group"
                        >
                            <ArrowDown className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>

                    <div className="bg-white/50 rounded-2xl p-5 border border-black/5 hover:border-blue-500/30 transition-all group shadow-sm">
                        <div className="flex items-center justify-between">
                            <input
                                type="number"
                                placeholder="0"
                                value={toAmount}
                                readOnly
                                className="bg-transparent text-4xl font-semibold outline-none w-full placeholder:text-zinc-400 cursor-default text-zinc-900"
                            />
                            <button
                                onClick={toggleFlip}
                                className="flex items-center gap-2 bg-zinc-900 hover:bg-black px-4 py-2 rounded-2xl shadow-lg transition-all active:scale-95"
                            >
                                <div className={cn("w-6 h-6 rounded-full border-2 border-white/20", isFlipped ? "bg-blue-500" : "bg-purple-500")} />
                                <span className="font-bold text-white text-sm">{isFlipped ? "SUI" : "CUSTOM"}</span>
                            </button>
                        </div>
                        <div className="mt-3 text-[13px] font-medium text-zinc-500 flex justify-between">
                            <span>$0.00</span>
                            <span className="text-zinc-400">Balance: <span className="text-zinc-900">{isFlipped ? suiBalance : customBalance}</span></span>
                        </div>
                    </div>
                </div>

                {connected ? (
                    <button
                        onClick={handleSwap}
                        disabled={isSwapping || !fromAmount}
                        className="w-full py-5 bg-zinc-900 hover:bg-black text-white font-black text-lg rounded-[22px] shadow-2xl shadow-zinc-900/30 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span className="relative z-10">{isSwapping ? "Executing Transaction..." : "Confirm Swap"}</span>
                    </button>
                ) : (
                    <ConnectButton className="!w-full !rounded-[22px] !py-5 !bg-zinc-900 !hover:bg-black !text-white !font-black !text-lg !shadow-2xl !shadow-zinc-900/30 !transition-all active:!scale-[0.97]" />
                )}

                <div className="pt-1 space-y-2">
                    <div className="bg-black/5 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold text-zinc-600 border border-black/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <span>1 SUI = 1.25 CUSTOM</span>
                            <Info className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>0.3% Fee</span>
                        </div>
                    </div>

                    <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/10 backdrop-blur-sm">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Pool Reserves</div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500 font-medium">SUI Reserve:</span>
                                <span className="text-zinc-900 font-bold">{poolReserveA}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500 font-medium">CUSTOM Reserve:</span>
                                <span className="text-zinc-900 font-bold">{poolReserveB}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
