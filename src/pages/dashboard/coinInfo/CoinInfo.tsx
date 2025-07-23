import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoinStore } from '../../../store/coinStore';
import { useTokenActivity } from '../../../hooks/useTokenActivity';
import TransparentCandlestickChart from '../../../components/chart/LineChart';
import { BackButton } from '../../../components/button/back/BackButton';
import { useUserTokenBalance } from '../../../hooks/useUserBalance';
import styles from './CoinInfo.module.css';
import { useParams } from 'react-router-dom';


import { Minus, Plus } from 'lucide-react';
import { parseEther } from 'viem';
import { useAccount, useBalance, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ERC6909ABI, ERC6909Address } from '../../../services/ERC6909Metadata';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../../../services/ETHBackedTokenMinter';
import { useBurnEstimation, useMintEstimation } from '../../../hooks/useTradeEstimation';
import { useAlertStore, type ActionType } from '../../../store/alertStore';
import { useScrollDirection } from '../../../hooks/useScrollDirection';
import { useTokenStore } from '../../../store/allTokensStore';
import { MobileKeypad } from '../../../components/keypad/DecimalKeypad';
const formatEther = (wei: any) => (Number(wei) / 1e18).toFixed(4);
interface Props {
    refetch: any;
}
export const CoinInfo: React.FC<Props> = ({ refetch }) => {
    const { balanceEth, totalValueEth } = useUserTokenBalance();
    const [imageLoaded, setImageLoaded] = useState<boolean | null>(null);
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'balance' | 'insights'>('balance');
    const [showCTA, setShowCTA] = useState(true);
    const [action, setAction] = useState<'buy' | 'sell' | ''>('');
    const { address } = useAccount();
    const { setAlert } = useAlertStore();
    const { refetchBalance, tokenBalance }: any = useUserTokenBalance();
    const ethBalance = useBalance({ address });
    const { getTokenById } = useTokenStore();
    const { setCoin } = useCoinStore();
    const [amount, setAmount] = useState<string>("");
    const [debouncedAmount, setDebouncedAmount] = useState(amount);
    const { tokenId }: any = useParams<{ tokenId: string }>();
    const coin: any = getTokenById(tokenId);
    const trades = useTokenActivity(tokenId);
    const txTypeRef = useRef<ActionType | null>(null);
    const amountRef = useRef<any>(null);
    const actionTypeRef = useRef<any>(null);
    const [showKeypad, setShowKeypad] = useState(false);


    const mintEstimation = useMintEstimation(tokenId, debouncedAmount);
    const burnEstimation = useBurnEstimation(tokenId, debouncedAmount);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const isScrollingUp = useScrollDirection();
    useEffect(() => {
        if (tokenId) {
            const token: any = getTokenById(tokenId); // however your app stores them
            setCoin(token);
        }
    }, [tokenId]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                const nearBottom = entry.isIntersecting;
                const scrolledDownFar = window.scrollY > 100;

                // Show CTA if near bottom or scrolling up and not near top
                const shouldShow = nearBottom || (isScrollingUp && scrolledDownFar);

                setShowCTA(shouldShow);
            },
            {
                root: null,
                threshold: 0.1,
            }
        );

        if (bottomRef.current) observer.observe(bottomRef.current);

        return () => {
            if (bottomRef.current) observer.unobserve(bottomRef.current);
        };
    }, [isScrollingUp]);

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
            <BackButton />

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
                    className={`${styles.tradeButton} ${!showCTA ? styles.ctaHidden : ''}`}
                    onClick={() => setShowTradeModal(true)}
                >
                    Buy & Sell
                </button>
                <Link
                    to={`/dashboard/explore/${coin.tokenId}/trade`}
                    className={`${styles.tradeButton} ${!showCTA ? styles.ctaHidden : ''}`}
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

                            <button
                                className={styles.modalInputButton}
                                onClick={() => setShowKeypad(true)}
                            >
                                {amount || (action == 'buy' ? "Enter ETH amount" : `Enter ${coin.symbol} amount`)}
                            </button>
                            {showKeypad && (
                                <MobileKeypad
                                    value={amount}
                                    onChange={setAmount}
                                    onClose={() => setShowKeypad(false)}
                                />
                            )}


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
            <div ref={bottomRef} style={{ height: '1px' }} />
        </div>
    );
};
