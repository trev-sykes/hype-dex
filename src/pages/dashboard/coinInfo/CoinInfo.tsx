import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoinStore } from '../../../store/coinStore';
import { useTokenActivity } from '../../../hooks/useTokenActivity';
import TransparentCandlestickChart from '../../../components/chart/TransparentCandlestickChart';
import { ExploreButton } from '../../../components/button/backToExplore/ExploreButton';
import { useUserTokenBalance } from '../../../hooks/useUserBalance';
import styles from './CoinInfo.module.css';

import { Minus, Plus } from 'lucide-react';
import { parseEther } from 'viem';
import { useAccount, useBalance, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ERC6909ABI, ERC6909Address } from '../../../services/ERC6909Metadata';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../../../services/ETHBackedTokenMinter';
import { useBurnEstimation, useMintEstimation } from '../../../hooks/useTradeEstimation';
import { useAlertStore, type ActionType } from '../../../store/alertStore';
import { useTokenPriceData } from '../../../hooks/useTokenPriceData';
const formatEther = (wei: any) => (Number(wei) / 1e18).toFixed(4);
interface Props {
    refetch: any;
}
export const CoinInfo: React.FC<Props> = ({ refetch }) => {
    const { coin } = useCoinStore();
    const { balanceEth, totalValueEth } = useUserTokenBalance();
    const trades = useTokenActivity(coin?.tokenId?.toString());
    const [imageLoaded, setImageLoaded] = useState<boolean | null>(null);
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'balance' | 'insights'>('balance');
    const [showCTA, setShowCTA] = useState(true);
    const [visibleButtons, setVisibleButtons] = useState([false, false]);
    const [action, setAction] = useState<'buy' | 'sell' | ''>('');
    const { address } = useAccount();
    const { setAlert } = useAlertStore();
    const { refetchBalance, tokenBalance }: any = useUserTokenBalance();
    const { refetchAll } = useTokenPriceData();
    const ethBalance = useBalance({ address });

    const [amount, setAmount] = useState<string>("");
    const [debouncedAmount, setDebouncedAmount] = useState(amount);


    const txTypeRef = useRef<ActionType | null>(null);
    const amountRef = useRef<any>(null);
    const actionTypeRef = useRef<any>(null);

    const tokenId = coin?.tokenId ? BigInt(coin.tokenId) : undefined;

    const mintEstimation = useMintEstimation(tokenId, debouncedAmount);
    const burnEstimation = useBurnEstimation(tokenId, debouncedAmount);

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
        if (action == 'buy') {
            setAction('')
            await handleMint();
        } else {
            setAction('')
            await handleBurn();
        }
    };



    useEffect(() => {
        let lastScrollY = window.scrollY;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleScroll = () => {
            if (timeoutId) clearTimeout(timeoutId);

            const currentScrollY = window.scrollY;
            // const isScrollingDown = currentScrollY > lastScrollY;
            const isScrollingUp = currentScrollY < lastScrollY;
            lastScrollY = currentScrollY;

            timeoutId = setTimeout(() => {
                const scrollPosition = window.innerHeight + currentScrollY;
                const pageHeight = document.documentElement.scrollHeight;

                const isAtBottom = scrollPosition >= pageHeight - 20;
                const isNearTop = currentScrollY <= 100;

                let shouldShow = false;
                if (!isNearTop && (isScrollingUp || isAtBottom)) {
                    shouldShow = true;
                }

                setShowCTA(shouldShow);
            }, 50);
        };


        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);
    useEffect(() => {
        if (showCTA) {
            // Show buttons one by one with 150ms delay
            visibleButtons.forEach((_, i) => {
                setTimeout(() => {
                    setVisibleButtons(prev => {
                        const newState = [...prev];
                        newState[i] = true;
                        return newState;
                    });
                }, i * 50);
            });
        } else {
            // Hide all buttons immediately
            setVisibleButtons([false, false]);
        }
    }, [showCTA]);

    if (!coin) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading coin data...</p>
            </div>
        );
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedAmount(amount);
        }, 600); // debounce delay in ms

        return () => {
            clearTimeout(handler);
        };
    }, [amount]);

    const totalSupply = Number(coin.totalSupply);
    const currentPriceEth = Number(formatEther(coin.price));  // converts from wei to ETH

    const marketCapEth = totalSupply * currentPriceEth;


    return (
        <div className={styles.container}>
            <ExploreButton />

            <div className={styles.chartWrapper}>
                <TransparentCandlestickChart coin={coin} trades={trades} interval={300} tokenId={coin.tokenId} />
            </div>

            <div className={styles.tabBar}>
                <button
                    className={`${styles.tab} ${activeTab === 'balance' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('balance')}
                >
                    Balance
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'insights' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('insights')}
                >
                    Insights
                </button>
            </div>

            <div className={styles.content}>
                {activeTab === 'balance' && (
                    <div className={styles.balanceTab}>
                        <div className={styles.balanceRow}>
                            {imageLoaded === null && <div className={styles.imagePlaceholder}></div>}
                            {imageLoaded === false && (
                                <div className={styles.imageFallback}>{coin.symbol}</div>
                            )}
                            <img
                                src={coin.imageUrl}
                                alt={coin.symbol}
                                className={`${styles.tokenImage} ${imageLoaded !== true ? styles.hidden : ''}`}
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageLoaded(false)}
                            />
                            <div className={styles.balanceInfo}>
                                <p className={styles.balanceAmount}>{balanceEth} {coin.symbol}</p>
                                <p className={styles.ethValue}>≈ {totalValueEth?.toFixed(4)} ETH</p>
                            </div>
                        </div>
                    </div>

                )}

                {activeTab === 'insights' && (
                    <div className={styles.insightsTab}>
                        <div className={styles.tokenHeader}>
                            <div className={styles.tokenIdentity}>
                                About {coin.name}
                            </div>
                            <div className={styles.tokenTitle}>Description</div>
                            {coin.description && (
                                <p className={styles.description}>{coin.description}</p>
                            )}
                        </div>
                        <div className={styles.metaGrid}>
                            <div className={styles.tokenIdentity}>Stats</div>
                            <div>
                                <label>Current Price</label>
                                <span>{formatEther(coin.price)} ETH</span>
                            </div>
                            <div>
                                <label>Market Cap</label>
                                <span>{marketCapEth.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH</span>
                            </div>
                            <div>
                                <label>Total Supply</label>
                                <span>{coin.totalSupply.toLocaleString()}</span>
                            </div>
                        </div>

                    </div>
                )}
            </div>
            <div className={styles.ctaWrapper}>
                <button
                    className={`${styles.tradeButton} ${!visibleButtons[0] ? styles.ctaHidden : ''}`}
                    onClick={() => setShowTradeModal(true)}
                >
                    Buy & Sell
                </button>
                <Link
                    to={`/dashboard/explore/${coin.tokenId}/trade`}
                    className={`${styles.tradeButton} ${!visibleButtons[1] ? styles.ctaHidden : ''}`}
                >
                    Trade
                </Link>
            </div>

            {showTradeModal && (
                <div className={styles.modalBackdrop} onClick={() => setShowTradeModal(false)}>
                    <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
                        <h2>Trade {coin.symbol}</h2>
                        <div className={styles.modalActions}>
                            <button onClick={() => {
                                setShowTradeModal(false);
                                setAction('buy');
                            }} className={styles.buyButton} type="button">
                                <Plus size={20} className={styles.iconBuy} />
                                Buy
                            </button>
                            <button onClick={() => {
                                setShowTradeModal(false);
                                setAction('sell');
                            }} className={styles.sellButton} type="button">
                                <Minus size={20} className={styles.iconBurn} />
                                Sell
                            </button>
                        </div>

                    </div>
                </div>
            )}
            {action !== '' && (
                <div className={styles.modalBackdrop} onClick={() => setAction('')}>
                    <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalContainer}>
                            <h2 className={styles.modalHeader}>
                                {action == 'buy' ? (
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
                                className={styles.modalInput}
                                placeholder={action == 'buy' ? "Amount in ETH" : `Amount in ${coin.symbol}`}
                                min="0"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />

                            <div className={styles.modalActions}>
                                {/* Buttons */}
                                <button
                                    className={styles.modalConfirmButton}
                                    disabled={
                                        Number(amount) <= 0 ||
                                        amount.trim() === "" ||
                                        (action == 'buy' && amount !== "" && parseEther(amount) > (ethBalance.data?.value ?? 0n)) ||
                                        (action == 'sell' && amount !== "" && Number(amount) > tokenBalance)
                                    }
                                    onClick={handleConfirm}
                                >
                                    Confirm {action == 'buy' ? "Buy" : "Sell"}
                                </button>

                                <button
                                    className={styles.modalCancelButton}
                                    onClick={() => {
                                        setAmount("");
                                    }}
                                >
                                    Cancel
                                </button>

                                {/* Estimations & Errors */}
                                <div className={styles.modalCalculationPreview}>
                                    {action == 'buy' ? (
                                        <>
                                            <p>Your ETH Balance: <strong>{Number(ethBalance.data?.formatted || 0).toFixed(4)} ETH</strong></p>
                                            {debouncedAmount !== "" && parseEther(debouncedAmount) < coin.price && (
                                                <p className={styles.modalErrorText}>Entered amount is too low.</p>
                                            )}

                                            {debouncedAmount !== "" && parseEther(debouncedAmount) > (ethBalance.data?.value ?? 0n) ? (
                                                <p className={styles.modalErrorText}>Insufficient ETH for this purchase</p>
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
                                            {debouncedAmount !== "" && Number(debouncedAmount) > tokenBalance ? (
                                                <p className={styles.modalErrorText}>Insufficient balance to sell that many tokens</p>
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
                    </div>
                </div>
            )}
        </div>
    );
};
