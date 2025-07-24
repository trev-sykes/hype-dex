import React, { useEffect, useRef, useState } from 'react';
import { MobileKeypad } from '../../../components/keypad/DecimalKeypad';
import styles from './BuySell.module.css';
import { ArrowUpDown } from 'lucide-react';
import { BackButton } from '../../../components/button/back/BackButton';
import { useParams } from 'react-router-dom';
import { useTokenStore } from '../../../store/allTokensStore';
import { formatEther, parseEther } from 'viem';
import { useUserTokenBalance } from '../../../hooks/useUserBalance';
import { useAlertStore, type ActionType } from '../../../store/alertStore';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ERC6909ABI, ERC6909Address } from '../../../services/ERC6909Metadata';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../../../services/ETHBackedTokenMinter';
import { useBurnEstimation } from '../../../hooks/useTradeEstimation';

type Currency = 'ETH' | 'TOKEN';
type TradeMode = 'BUY' | 'SELL';

interface Props {
    balance: any;
    refetch: any;
}

export const BuySell: React.FC<Props> = ({ balance, refetch }) => {
    const { tokenId }: any = useParams<{ tokenId: string }>();
    const { address } = useAccount();
    const { setAlert } = useAlertStore();
    const { refetchBalance }: any = useUserTokenBalance();
    const { getTokenById } = useTokenStore();
    const coin: any = getTokenById(tokenId);
    const ethBalance = balance?.data ? parseFloat(formatEther(balance.data.value)) : 0;
    const { balanceEth } = useUserTokenBalance();
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('ETH');
    const [mode, setMode] = useState<TradeMode>('BUY');
    const [estimate, setEstimate] = useState('0');
    const [maxValue, setMaxValue] = useState();
    const [restrict, setRestrict] = useState(false);
    const amountRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const txTypeRef = useRef<ActionType | null>(null);
    const actionTypeRef = useRef<any>(null);
    // const mintEstimation = useMintEstimation(tokenId, amount);
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
            refetch();
        }
    }, [isTxSuccess]);

    const handleMint = async () => {
        if (!tokenId || !amount || parseFloat(amount) <= 0) return;

        txTypeRef.current = 'mint';
        actionTypeRef.current = coin?.symbol;

        const val = parseFloat(amount || '0');
        if (!val) return `0 ${currency === 'ETH' ? coin.symbol : 'ETH'}`;
        const coinPriceInEth = Number(formatEther(coin.price));
        const finalAmount = (val * coinPriceInEth).toFixed(6);
        const sentAmount: any = currency == "ETH" ? parseEther(amount) : parseEther(finalAmount)
        const tokensToMint = currency === 'ETH'
            ? Math.floor(val / coinPriceInEth)
            : val;

        amountRef.current = tokensToMint;

        try {
            await writeContract({
                address: ETHBackedTokenMinterAddress,
                abi: ETHBackedTokenMinterABI,
                functionName: 'mint',
                args: [tokenId],
                value: sentAmount,
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

        const val = parseFloat(amount || '0');
        if (!val) return;
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
                args: [tokenId, val],
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




    const switchCurrency = () => {
        if (mode === 'SELL') {
            setCurrency(coin.symbol);
            return;
        }

        const coinPriceInEth = Number(formatEther(coin.price));
        const val = parseFloat(amount || '0');
        if (!val) {
            setCurrency(prev => (prev === 'ETH' ? coin.symbol : 'ETH'));
            return;
        }

        if (currency === 'ETH') {
            const tokenAmount = Math.floor(val / coinPriceInEth);
            setAmount(tokenAmount.toString());
            setCurrency(coin.symbol);
        } else {
            const ethAmount = val * coinPriceInEth;
            setAmount(ethAmount.toFixed(6));
            setCurrency('ETH');
        }
    };
    const resetAmount = () => {
        setAmount('')
    }
    const getDisplayConversion = () => {
        const val = parseFloat(amount || '0');
        if (!val) return `0 ${currency === 'ETH' ? coin.symbol : 'ETH'}`;
        const coinPriceInEth = Number(formatEther(coin.price));

        if (currency === 'ETH') {
            // ETH → token
            return `${Math.floor(val / coinPriceInEth)} ${coin.symbol}`;
        } else {
            // token → ETH
            return `${(val * coinPriceInEth).toFixed(6)} ETH`;
        }

    };

    // Shows the actual final result the user will get when submitting (e.g. "You get ≈ 0.001 ETH")
    const getFinalEstimate = () => {
        const val = parseFloat(amount || '0');
        if (!val) return '0';
        const coinPriceInEth = Number(formatEther(coin.price));

        if (mode === 'BUY') {
            if (currency === 'ETH') {
                // ETH → token amount
                return Math.floor(val / coinPriceInEth).toString();
            } else {
                // token → token
                return val.toString();
            }
        } else {
            if (currency === coin.symbol) {
                // token → ETH
                return (val * coinPriceInEth).toFixed(6);
            } else {
                // ETH → ETH
                return val.toString();
            }
        }

    };

    // Update "You get" estimate whenever amount, currency, or mode changes
    useEffect(() => {
        const newEstimate = getFinalEstimate();
        setEstimate(newEstimate);

    }, [amount, mode]);
    useEffect(() => {
        switchCurrency();
    }, [mode])
    // Input scaling animation
    useEffect(() => {
        const baseLength = 3;
        const maxLength = 11;
        const length = (amount || '0').length;

        if (length <= baseLength) {
            setScale(1);
        } else {
            const shrinkFactor = Math.min(length - baseLength, maxLength - baseLength);
            const scaleValue = 1 - shrinkFactor * 0.12;
            setScale(Math.max(scaleValue, 0.6));
        }
    }, [amount]);


    // Limit input based on current currency
    useEffect(() => {
        let maxValue: any = undefined;
        let restrict = false;

        if (currency === 'ETH' && mode == "BUY") {
            maxValue = ethBalance;
            restrict = true;
            setMaxValue(maxValue)
            setRestrict(restrict)
        } else if (currency === coin.symbol && mode == "BUY") {
            const coinPriceInEth = Number(formatEther(coin.price));

            maxValue = ethBalance / coinPriceInEth;
            restrict = true;
            setMaxValue(maxValue)
            setRestrict(restrict)
        } else if (mode == 'SELL') {
            maxValue = balanceEth;
            restrict = true;
            setMaxValue(maxValue)
            setRestrict(restrict)
        }
    }, [mode, currency]);

    return (
        <>
            <div className={styles.tradePage}>
                <div className={styles.backButtonContainer}>
                    <BackButton />
                </div>

                <div className={styles.modeToggle}>
                    <button
                        className={mode === 'BUY' ? styles.active : ''}
                        onClick={() => {
                            setMode('BUY');
                            resetAmount();
                        }}
                    >
                        Buy
                    </button>
                    <button
                        className={mode === 'SELL' ? styles.active : ''}
                        onClick={() => {
                            setMode('SELL')
                            resetAmount()
                        }}
                    >
                        Sell
                    </button>
                </div>

                <div className={styles.inputSection} ref={containerRef}>
                    <div
                        className={styles.scalingWrapper}
                        style={{ transform: `scale(${scale})` }}
                    >
                        <div className={styles.amountWrapper} ref={amountRef}>
                            <span className={styles.amount}>{amount || '0'}</span>
                            <span className={styles.cursor}></span>
                        </div>
                        <div className={styles.currencyToggle}>
                            {currency}
                        </div>
                    </div>
                </div>

                <div
                    className={styles.conversion}
                    onClick={(e) => {
                        e.stopPropagation();
                        switchCurrency();
                    }}
                >
                    {mode == "BUY" && <ArrowUpDown size={10} />} ≈ {getDisplayConversion()}
                </div>

                <div className={styles.previewSection}>
                    <div className={styles.balanceRow}>
                        Balance: {mode == "BUY" ? balance.data ? Number(formatEther(balance.data.value)).toFixed(4) : '0' : balanceEth} {mode === "BUY" ? "ETH" : `${coin.symbol}`}
                    </div>
                    <div className={styles.previewRow}>
                        You get ≈ {estimate} {mode === 'BUY' ? coin.symbol : 'ETH'}
                    </div>
                </div>

                <button
                    onClick={mode == "BUY" ? handleMint : handleBurn}
                    className={styles.actionButton}>
                    {mode}
                </button>
            </div>

            <div className={styles.keypad}>
                <MobileKeypad
                    value={amount}
                    onChange={setAmount}
                    allowDecimals={currency === 'ETH'}
                    maxValue={maxValue}
                    restrict={restrict}
                />
            </div>
        </>
    );
};
