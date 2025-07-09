import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarLoader, FadeLoader } from 'react-spinners';
import { formatUnits } from 'ethers';
import { useCoinStore } from '../../../store/coinStore';
import styles from './ExploreGrid.module.css';
import Logo from '../../../components/logo/Logo';
import { useOnline } from '../../../hooks/useOnline';
import { useTokens } from '../../../hooks/useTokens';
import { useWitdh } from '../../../hooks/useWidth';
import { scrollToTop } from '../../../utils/scroll';

export const ExploreGrid: React.FC = () => {
    const isOnline = useOnline();
    const navigate = useNavigate();
    const { tokens, fetchNextPage, hasNextPage, loading } = useTokens();
    const { setCoin } = useCoinStore();
    const viewportWidth = useWitdh();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filteredCoins, setFilteredCoins] = useState<any[]>([]);
    const [width, setWidth] = useState(window.innerWidth);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [loadStates, setLoadStates] = useState<boolean[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Handle image load states
    const handleLoad = useCallback((index: number, status: boolean) => {
        setLoadStates(prev => {
            const copy = [...prev];
            copy[index] = status;
            return copy;
        });
    }, []);

    // Reset load states when tokens change
    useEffect(() => {
        if (tokens && tokens.length) {
            setLoadStates(Array(tokens.length).fill(null)); // null = not loaded yet
        }
    }, [tokens]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Scroll handler to show/hide scroll-to-top button & infinite load
    useEffect(() => {
        const onScroll = () => {
            setShowScrollButton(window.scrollY > 200);

            // Infinite scroll: load next page if near bottom (300px)
            if (
                window.innerHeight + window.scrollY >=
                document.body.offsetHeight - 300
            ) {
                if (hasNextPage && !loading) {
                    fetchNextPage();
                }
            }
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, [fetchNextPage, hasNextPage, loading]);

    // Search filtering with debounce
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCoins([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const handler = setTimeout(() => {
            const term = searchTerm.toLowerCase();
            const results = tokens.filter(
                (coin: any) =>
                    coin.name?.toLowerCase().includes(term) ||
                    coin.symbol?.toLowerCase().includes(term)
            );
            setFilteredCoins(results);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(handler);
    }, [tokens, searchTerm]);

    // Preload images for tokens
    useEffect(() => {
        tokens.forEach((coin, index) => {
            if (!coin.imageUrl) return;
            const img = new Image();
            img.src = coin.imageUrl;
            img.onload = () => handleLoad(index, true);
            img.onerror = () => handleLoad(index, false);
        });
    }, [tokens, handleLoad]);

    const coinsToDisplay = searchTerm ? filteredCoins : tokens;

    if (!isOnline) return <div className={styles.error}>No Internet Connection</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Explore The Hype</h1>
            </div>

            {/* Search Bar */}
            <div className={styles.searchContainer}>
                <div>
                    <svg
                        className={styles.searchIcon}
                        onClick={() => inputRef.current?.focus()}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder={viewportWidth > 500 ? "Search by name or symbol..." : "Search"}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
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
                    <Logo background={true} size={viewportWidth > 500 ? '8rem' : '6rem'} />
                </div>
            </div>

            <div className={`${styles.symbolText} ${styles.tokenCount}`}>
                {coinsToDisplay.length} Tokens
            </div>

            {/* Grid of Coins */}
            {isSearching ? (
                <div className={styles.loadingMore}>
                    <BarLoader color="#144c7e" width={200} height={6} speedMultiplier={3.5} />
                </div>
            ) : coinsToDisplay.length > 0 ? (
                <>
                    <div className={styles.gridContainer}>
                        {coinsToDisplay.map((coin, index) => (
                            <Link
                                to={`/dashboard/explore/${coin.tokenId}`}
                                key={coin.tokenId.toString()}
                                className={styles.coinCard}
                                onClick={() => {
                                    setCoin(coin);
                                    navigate(`/dashboard/trade/${coin.name}`);
                                }}
                            >
                                <div className={styles.tokenDetails}>
                                    {/* Name */}
                                    {width > 640 && <h4>{coin.name}</h4>}

                                    {/* Symbol Badge */}
                                    <div className={styles.symbolText}>
                                        {coin.symbol.length < 8 ? coin.symbol : coin.symbol.slice(0, 8)}
                                    </div>

                                    {/* Description */}
                                    {width > 640 && (
                                        <p className={styles.descriptionText}>
                                            {coin.description?.slice(0, 80) || 'No description available'}
                                        </p>
                                    )}

                                    {/* Image Container */}
                                    <div className={styles.imageContainer}>
                                        {loadStates[index] === null && (
                                            <div className={styles.imageLoadingFallback} />
                                        )}

                                        {loadStates[index] === true && coin.imageUrl && (
                                            <img
                                                loading="lazy"
                                                src={coin.imageUrl}
                                                onLoad={() => handleLoad(index, true)}
                                                onError={() => handleLoad(index, false)}
                                                alt={`${coin.name || 'Coin'}`}
                                                className={styles.coinImage}
                                            />
                                        )}

                                        {loadStates[index] === false && (
                                            <div className={styles.imageFallback}>
                                                {coin.symbol}
                                            </div>
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
                                        {/* Uncomment if you want to show percent change */}
                                        {/* {coin.percentChange != null && (
                      <p className={coin.percentChange >= 0 ? styles.percentUp : styles.percentDown}>
                        {coin.percentChange >= 0 ? '+' : ''}
                        {coin.percentChange.toFixed(2)}%
                      </p>
                    )} */}
                                    </div>

                                    {/* Trade Button */}
                                    <div className={styles.tradeContainer}>
                                        <p
                                            onClick={e => {
                                                e.preventDefault();
                                                navigate(`/dashboard/trade/${coin.tokenId}`);
                                            }}
                                        >
                                            Trade Now
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Load more button if hasNextPage */}
                    {hasNextPage && !loading && (
                        <button
                            className={styles.loadMoreButton}
                            onClick={() => fetchNextPage()}
                            aria-label="Load more tokens"
                        >
                            Load More
                        </button>
                    )}

                    {/* Loader when loading more */}
                    {loading && (
                        <div className={styles.loadingMore}>
                            <BarLoader color="#144c7e" width={200} height={6} speedMultiplier={3.5} />
                        </div>
                    )}
                </>
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
    );
};
