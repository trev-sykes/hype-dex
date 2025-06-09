import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import styles from './ExploreGrid.module.css';
import { scrollToTop } from '../../../utils/scroll';
import { BarLoader, FadeLoader } from 'react-spinners';
import { formatUnits } from 'ethers';
import { Link, useNavigate } from 'react-router-dom';
import { useCoinStore } from '../../../store/coinStore';
import { useOnline } from '../../../hooks/useOnline';
import { WifiOffIcon } from 'lucide-react';
import { useTokens } from '../../../hooks/useTokens';
import Logo from '../../../components/logo/Logo';
const ITEMS_PER_PAGE = 25;

export const ExploreGrid: React.FC = () => {
    const isOnline = useOnline();
    const navigate = useNavigate();
    const { tokens } = useTokens();
    const error = null;

    const { setCoin } = useCoinStore();
    const [page, setPage] = useState(0);
    const [visibleCoins, setVisibleCoins] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filteredCoins, setFilteredCoins] = useState<any[]>([]);
    const [width, setWidth] = useState(window.innerWidth);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isLoadingPage, setIsLoadingPage] = useState(false);

    const { ref, inView } = useInView({
        triggerOnce: false,
        threshold: 0.2,
    });

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleScroll = () => setShowScrollButton(window.scrollY > 200);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    // Pagination loading when user scrolls
    useEffect(() => {
        if (inView && tokens && !searchTerm && !isLoadingPage) {
            setIsLoadingPage(true);
            setPage((prev) => prev + 1);
        }
    }, [inView, tokens, searchTerm, isLoadingPage]);

    // Load visible coins based on current page
    useEffect(() => {
        if (!tokens || searchTerm) return;

        const start = page * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const nextCoins = tokens.slice(start, end);

        setVisibleCoins((prev) => [...prev, ...nextCoins]);
        setIsLoadingPage(false);
    }, [tokens, searchTerm]);

    // Filter coins
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCoins([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        const handler = setTimeout(() => {
            const term = searchTerm.toLowerCase();
            const results = tokens?.filter((coin: any) =>
                coin.name?.toLowerCase().includes(term) ||
                coin.symbol?.toLowerCase().includes(term)
            );

            setFilteredCoins(results || []);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(handler);
    }, [tokens, searchTerm]);


    const coinsToDisplay = searchTerm ? filteredCoins : visibleCoins;

    if (isOnline && error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <div className={styles.coinsContainer}>
            <div className={styles.coinsHeader}>
                <h1 className={styles.title}>Explore The Hype</h1>
            </div>

            {/* Search Bar */}
            {isOnline ? (
                <div>
                    <div className={styles.searchContainer}>
                        <div>
                            <svg
                                className={styles.searchIcon}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search by name or symbol..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    className={styles.searchClear}
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className={styles.logoContainer}>
                            <Logo background={true} size={'8rem'} />
                        </div>
                    </div>
                    {/* Grid of Coins */}
                    {isSearching ? (
                        <div className={styles.loadingMore}>
                            <BarLoader />
                        </div>
                    ) : coinsToDisplay.length > 0 ? (
                        <div className={styles.gridContainer}>
                            {coinsToDisplay.map((coin, index) => {
                                const isLast = index === coinsToDisplay.length - 1;
                                return (
                                    <Link
                                        to={`/dashboard/explore/${coin.tokenId}`}
                                        key={coin.tokenId.toString()}
                                        className={styles.coinCard}
                                        onClick={() => {
                                            setCoin(coin);
                                            navigate(`/dashboard/trade/${coin.name}`);
                                        }}
                                        ref={!searchTerm && isLast ? ref : null}
                                    >
                                        <div className={styles.tokenDetails}>
                                            {/* Name - Always show on larger screens */}
                                            {width > 640 && (
                                                <h4>{coin.name}</h4>
                                            )}

                                            {/* Symbol Badge */}
                                            <div className={styles.symbolText}>
                                                {coin.symbol.length < 8 ? coin.symbol : coin.symbol.slice(0, 8)}
                                            </div>

                                            {/* Description - Responsive */}
                                            {width > 640 && (
                                                <p className={styles.descriptionText}>
                                                    {coin.description?.slice(0, 80) || 'No description available'}
                                                </p>
                                            )}

                                            {/* Image Container */}
                                            <div className={styles.imageContainer}>
                                                {coin.uri && (
                                                    <img
                                                        src={coin.imageUrl}
                                                        onError={(e) => (e.currentTarget.src = '/favicon-light.png')}
                                                        alt={`${coin.name || 'Coin'} icon`}
                                                        className={styles.coinImage}
                                                        loading="lazy"
                                                    />
                                                )}
                                            </div>

                                            {/* Price Section */}
                                            <div className={styles.priceSection}>
                                                <p>
                                                    <strong>Price</strong>
                                                    <span className={styles.priceValue}>
                                                        {coin.price != null ? formatUnits(coin.price) : 'N/A'}
                                                    </span>
                                                </p>
                                                {coin.percentChange != null && (
                                                    <p
                                                        className={
                                                            coin.percentChange >= 0 ? styles.percentUp : styles.percentDown
                                                        }
                                                    >
                                                        {coin.percentChange >= 0 ? '+' : ''}
                                                        {coin.percentChange.toFixed(2)}%
                                                    </p>
                                                )}

                                            </div>

                                            {/* Trade Button */}
                                            <div className={styles.tradeContainer}>
                                                <p
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        navigate(`/dashboard/trade/${coin.tokenId}`);
                                                    }}
                                                >
                                                    Trade Now
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            {searchTerm ? (
                                <>No coins found matching "{searchTerm}"</>
                            ) : (
                                <>
                                    <div className={styles.loading}>Loading coins</div>
                                    <div className={styles.coinsContainer}>
                                        <div className={styles.loaderContainer}>
                                            <FadeLoader width={10} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Scroll to Top */}
                    <button
                        className={`${styles.scrollToTopButton} ${showScrollButton ? styles.show : ''}`}
                        onClick={scrollToTop}
                        aria-label="Scroll to top"
                    >
                        ↑
                    </button>
                </div>
            ) : (
                <div className={styles.offlineContainer}>
                    <h3>No Internet Connection</h3>
                    <WifiOffIcon />
                </div>
            )}
        </div>
    );

};
