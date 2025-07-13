import { parseEther } from 'viem';
import { useCoinStore } from "../../../store/coinStore";
import styles from "./BuySell.module.css";
import { Plus, Minus } from "lucide-react";
import { useEffect, useRef, useState } from 'react';
import { useAccount, useBalance, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ERC6909ABI, ERC6909Address } from '../../../services/ERC6909Metadata';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../../../services/ETHBackedTokenMinter';
import { useBurnEstimation, useMintEstimation } from '../../../hooks/useTradeEstimation';
import { useAlertStore, type ActionType } from '../../../store/alertStore';
import { useUserTokenBalance } from '../../../hooks/useUserBalance';

import { useTokens } from '../../../hooks/useTokens';
import { useTokenPriceData } from '../../../hooks/useTokenPriceData';


interface BuySellProps {
    tradeStep: "buy" | "sell";
    onConfirm: any;
    onCancel: any;
}
export const BuySell: React.FC<BuySellProps> = ({ tradeStep, onCancel }) => {
    const { coin } = useCoinStore();
    const { address } = useAccount();
    const { refetch } = useTokens();
    const { setAlert } = useAlertStore();
    const { refetchBalance, tokenBalance }: any = useUserTokenBalance();
    const { refetchAll } = useTokenPriceData();
    const ethBalance = useBalance({ address });

    const isBuy = tradeStep === "buy";

    const [amount, setAmount] = useState<string>("");

    const txTypeRef = useRef<ActionType | null>(null);
    const amountRef = useRef<any>(null);
    const actionTypeRef = useRef<any>(null);

    const tokenId = coin?.tokenId ? BigInt(coin.tokenId) : undefined;

    const mintEstimation = useMintEstimation(tokenId, amount);
    const burnEstimation = useBurnEstimation(tokenId, amount);

    const { data: isOperator } = useReadContract({
        address: ERC6909Address,
        abi: ERC6909ABI,
        functionName: 'isOperator',
        args: [address, ETHBackedTokenMinterAddress],
    });

    const {
        data: hash,
        writeContract,
        // isPending,
        error: contractError
    } = useWriteContract();

    const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isTxLoading) {
            setAlert({
                action: txTypeRef.current,
                type: 'pending',
                message: `${txTypeRef.current}ing ${amountRef.current} ${actionTypeRef.current?.slice(0, 6) ?? ''}`
            });
        }
    }, [isTxLoading]);

    useEffect(() => {
        if (isTxSuccess) {
            setAlert({
                action: txTypeRef.current,
                type: 'success',
                message: `You ${txTypeRef.current}ed ${amountRef.current} ${actionTypeRef.current?.slice(0, 6) ?? ''}!`
            });

            refetchBalance();
            refetchAll();
            refetch();
        }
    }, [isTxSuccess]);

    const handleMint = async () => {
        if (!tokenId || !amount || parseFloat(amount) <= 0) return;

        txTypeRef.current = 'mint';
        actionTypeRef.current = coin?.symbol;
        amountRef.current = mintEstimation?.tokensToMint ?? 0;

        try {
            await writeContract({
                address: ETHBackedTokenMinterAddress,
                abi: ETHBackedTokenMinterABI,
                functionName: 'mint',
                args: [tokenId],
                value: parseEther(amount),
            });
            setAmount("");
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setAlert({
                action: txTypeRef.current,
                type: 'error',
                message: contractError ? contractError.toString() : message
            });
            txTypeRef.current = null;
            actionTypeRef.current = null;
            amountRef.current = null;
            setAmount("");
        }
    };

    const handleBurn = async () => {
        if (!tokenId || !amount || parseFloat(amount) <= 0) return;

        txTypeRef.current = 'burn';
        actionTypeRef.current = coin?.symbol;
        amountRef.current = burnEstimation?.burnAmount ?? 0;

        try {
            if (!isOperator) {
                await writeContract({
                    address: ERC6909Address,
                    abi: ERC6909ABI,
                    functionName: 'setOperator',
                    args: [ETHBackedTokenMinterAddress, true],
                });
            }
            await writeContract({
                address: ETHBackedTokenMinterAddress,
                abi: ETHBackedTokenMinterABI,
                functionName: 'burn',
                args: [tokenId, BigInt(amount)],
            });
            setAmount("");
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setAlert({
                action: txTypeRef.current,
                type: 'error',
                message: contractError ? contractError.toString() : message
            });
            txTypeRef.current = null;
            actionTypeRef.current = null;
            amountRef.current = null;
            setAmount("");
        }
    };

    const handleConfirm = async () => {
        if (isBuy) {
            await handleMint();
        } else {
            await handleBurn();
        }
    };

    if (!coin) return null;

    return (
        <div className={styles.container}>
            <h2 className={styles.header}>
                {isBuy ? (
                    <>
                        <Plus size={20} className={styles.iconBuy} /> Buy {coin.symbol}
                    </>
                ) : (
                    <>
                        <Minus size={20} className={styles.iconSell} /> Sell {coin.symbol}
                    </>
                )}
            </h2>

            <input
                type="number"
                className={styles.input}
                placeholder={isBuy ? "Amount in ETH" : `Amount in ${coin.symbol}`}
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />

            <div className={styles.actions}>
                {/* Buttons */}
                <button
                    className={styles.confirmButton}
                    disabled={Number(amount) <= 0 || amount.trim() === ""}
                    onClick={handleConfirm}
                >
                    Confirm {isBuy ? "Buy" : "Sell"}
                </button>
                <button
                    className={styles.cancelButton}
                    onClick={() => {
                        setAmount("");
                        onCancel("");
                    }}
                >
                    Cancel
                </button>

                {/* Estimations & Errors */}
                <div className={styles.calculationPreview}>
                    {isBuy ? (
                        <>
                            <p>Your ETH Balance: <strong>{Number(ethBalance.data?.formatted || 0).toFixed(4)} ETH</strong></p>
                            {amount !== "" && parseEther(amount) > (ethBalance.data?.value ?? 0n) ? (
                                <p className={styles.errorText}>Insufficient ETH for this purchase</p>
                            ) : mintEstimation ? (
                                <>
                                    <p>You will receive: <strong>{mintEstimation.tokensToMint}</strong> tokens</p>
                                    <p>Total cost: <strong>{mintEstimation.totalCostETH.toFixed(6)}</strong> ETH</p>
                                    <p>Refund: <strong>{mintEstimation.refundETH.toFixed(6)}</strong> ETH</p>
                                </>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <p>Your Token Balance: <strong>{tokenBalance} {coin?.symbol}</strong></p>
                            {amount !== "" && Number(amount) > tokenBalance ? (
                                <p className={styles.errorText}>Insufficient balance to sell that many tokens</p>
                            ) : burnEstimation ? (
                                <>
                                    <p>You will receive: <strong>{burnEstimation.ethToReceive.toFixed(6)}</strong> ETH</p>
                                    <p>Tokens to burn: <strong>{burnEstimation.burnAmount}</strong></p>
                                </>
                            ) : null}
                        </>
                    )}
                </div>
            </div>

        </div>
    );
};
