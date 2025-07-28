import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoinStore } from '../../../store/coinStore';
import { useTokenActivity } from '../../../hooks/useTokenActivity';
import TransparentCandlestickChart from '../../../components/chart/LineChart';
import { BackButton } from '../../../components/button/back/BackButton';
import { useUserTokenBalance } from '../../../hooks/useUserBalance';
import styles from './CoinInfo.module.css';
import { useParams } from 'react-router-dom';
import { useScrollDirection } from '../../../hooks/useScrollDirection';
import { useTokenStore } from '../../../store/allTokensStore';
const formatEther = (wei: any) => (Number(wei) / 1e18).toFixed(4);

export const CoinInfo: React.FC = () => {
    const { balanceEth, totalValueEth } = useUserTokenBalance();
    const [imageLoaded, setImageLoaded] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<'balance' | 'insights'>('balance');
    const [showCTA, setShowCTA] = useState(true);
    const [isImageToggled, setIsImageToggled] = useState<boolean>(false);
    // const [action, setAction] = useState<'buy' | 'sell' | ''>('');
    const { getTokenById } = useTokenStore();
    const { setCoin } = useCoinStore();
    // const [amount, setAmount] = useState<string>("");
    const { tokenId }: any = useParams<{ tokenId: string }>();
    const coin: any = getTokenById(tokenId);
    const trades = useTokenActivity(tokenId);
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
    if (!coin) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading coin data...</p>
            </div>
        );
    }
    const handleImageToggle = () => {
        console.log("Image Toggle State", isImageToggled)
        setIsImageToggled(prev => !prev);
    }
    // useEffect(() => {
    //     const handler = setTimeout(() => {
    //         setDebouncedAmount(amount);
    //     }, 600); // debounce delay in ms

    //     return () => {
    //         clearTimeout(handler);
    //     };
    // }, [amount]);
    useEffect(() => {
        if (isImageToggled) {
            // Disable scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Re-enable scroll
            document.body.style.overflow = '';
        }

        // Clean up on unmount (in case component unmounts while fullscreen)
        return () => {
            document.body.style.overflow = '';
        };
    }, [isImageToggled]);

    const totalSupply = Number(coin.totalSupply);
    const currentPriceEth = Number(formatEther(coin.price));  // converts from wei to ETH

    const marketCapEth = totalSupply * currentPriceEth;

    return (
        <div className={styles.container}>
            {isImageToggled && (
                <div className={styles.fullScreen} onClick={handleImageToggle}>
                    <div className={styles.circleWrapper}>
                        <img
                            src={coin.imageUrl}
                            alt={coin.symbol}
                            className={styles.fullScreenImage}
                        />
                    </div>
                </div>
            )}
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
                            <div className={`${styles.imageContainer}`}>
                                <img
                                    src={coin.imageUrl}
                                    alt={coin.symbol}
                                    className={`${styles.tokenImage} ${imageLoaded !== true ? styles.hidden : ''}`}
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageLoaded(false)}
                                    onClick={() => { handleImageToggle() }}
                                />
                            </div>
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
                <Link
                    to={`/dashboard/trade/${coin.tokenId}`}
                    className={`${styles.tradeButton} ${!showCTA ? styles.ctaHidden : ''}`}
                >
                    Buy & Sell
                </Link>
                <Link
                    to={`/dashboard/explore/${coin.tokenId}/trade`}
                    className={`${styles.tradeButton} ${!showCTA ? styles.ctaHidden : ''}`}
                >
                    Trade
                </Link>
            </div>
            {/* {action !== '' && (

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
            )} */}

            <div ref={bottomRef} style={{ height: '1px' }} />
        </div>
    );
};
