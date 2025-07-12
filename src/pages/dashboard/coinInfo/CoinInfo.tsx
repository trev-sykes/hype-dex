import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoinStore } from '../../../store/coinStore';
import { useTokenActivity } from '../../../hooks/useTokenActivity';
import TransparentCandlestickChart from '../../../components/chart/TransparentCandlestickChart';
import { ExploreButton } from '../../../components/button/backToExplore/ExploreButton';
import { useUserTokenBalance } from '../../../hooks/useUserBalance';
import styles from './CoinInfo.module.css';
import { Minus, Plus } from 'lucide-react';
import { BuySell } from './BuySell';

const formatEther = (wei: any) => (Number(wei) / 1e18).toFixed(4);

export const CoinInfo: React.FC = () => {
    const { coin } = useCoinStore();
    const { balanceEth, totalValueEth } = useUserTokenBalance();
    const trades = useTokenActivity(coin?.tokenId?.toString());
    const [imageLoaded, setImageLoaded] = useState<boolean | null>(null);
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'balance' | 'insights'>('balance');
    const [showCTA, setShowCTA] = useState(true);
    const [visibleButtons, setVisibleButtons] = useState([false, false]);
    const [action, setAction] = useState<'buy' | 'sell' | ''>('');


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
    const totalSupply = Number(coin.totalSupply);
    const currentPriceEth = Number(formatEther(coin.price));  // converts from wei to ETH

    const marketCapEth = totalSupply * currentPriceEth;


    return (
        <div className={styles.container}>
            <ExploreButton />

            <div className={styles.chartWrapper}>
                <TransparentCandlestickChart trades={trades} interval={300} tokenId={coin.tokenId} />
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
                                <p className={styles.ethValue}>≈ {totalValueEth} ETH</p>
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
                        <BuySell
                            tradeStep={action}
                            onConfirm={(amount: any, action: any) => {
                                alert(`Confirmed ${action} with amount ${amount}`);
                                setAction('');
                            }}
                            onCancel={() => setAction('')}
                        />
                    </div>
                </div>
            )}


        </div>
    );
};
