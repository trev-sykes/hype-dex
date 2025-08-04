import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarLoader, FadeLoader } from 'react-spinners';
import styles from './ExploreGrid.module.css';
import Logo from '../../../components/logo/Logo';
import { useOnline } from '../../../hooks/useOnline';
import { useWidth } from '../../../hooks/useWidth';
import { TokenCard } from '../../../components/tokenCard/TokenCard';
import type { Token } from '../../../types/token';
import { ScrollToTopButton } from '../../../components/button/scrollToTop/ScrollToTopButton';

interface ExploreGridProps {
    tokens: any,
    fetchNextPage: any,
    hasNextPage: any,
    loading: any,
    fetchStaticMetadata?: any,
    fetchAllPrices?: any
}
export const ExploreGrid: React.FC<ExploreGridProps> = ({ tokens, fetchNextPage, hasNextPage, loading, fetchStaticMetadata }) => {
    // const { clearTokens } = useTokenStore();
    const isOnline = useOnline();
    const viewportWidth = useWidth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filteredCoins, setFilteredCoins] = useState<any[]>([]);
    const [loadStates, setLoadStates] = useState<Map<string, boolean | null>>(new Map());
    const [sortOption, setSortOption] = useState<'priceHighLow' | 'priceLowHigh' | 'a-z' | 'z-a'>('priceHighLow');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const COOLDOWN_TIME = 60 * 60 * 1000; // 1 hour
    const LAST_REFRESH_KEY = 'last_soft_refresh';

    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [isCooldownActive, setIsCooldownActive] = useState<boolean | null>(null);
    useEffect(() => {
        const interval = setInterval(() => {
            const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
            if (lastRefresh) {
                const timePassed = Date.now() - parseInt(lastRefresh, 10);
                const remaining = COOLDOWN_TIME - timePassed;
                if (remaining > 0) {
                    setCooldownRemaining(Math.ceil(remaining / 1000 / 60)); // convert to minutes
                    setIsCooldownActive(true);
                } else {
                    setCooldownRemaining(0);
                    setIsCooldownActive(false);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);


    // Handle image load states
    const handleLoad = useCallback((tokenId: string, status: boolean) => {
        setLoadStates(prev => {
            const newMap = new Map(prev);
            newMap.set(tokenId, status);
            return newMap;
        });
    }, []);

    // Preload images for tokens
    useEffect(() => {
        if (!tokens || !tokens.length) return;

        setLoadStates(prev => {
            const newMap = new Map(prev);
            tokens.forEach((coin: Token) => {
                const id = coin.tokenId.toString();
                if (!newMap.has(id)) {
                    newMap.set(id, null);
                    if (coin.imageUrl) {
                        const img = new Image();
                        img.src = coin.imageUrl;
                        img.onload = () => handleLoad(id, true);
                        img.onerror = () => handleLoad(id, false);
                    }
                }
            });
            return newMap;
        });
    }, [tokens, handleLoad]);




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
    }, [searchTerm, tokens]);


    const coinsToDisplay = searchTerm ? filteredCoins : tokens;
    const sortedCoins = [...coinsToDisplay].sort((a, b) => {
        switch (sortOption) {
            case 'priceHighLow':
                // Sort descending by price
                return (b.price ?? 0) - (a.price ?? 0);
            case 'priceLowHigh':
                // Sort ascending by price
                return (a.price ?? 0) - (b.price ?? 0);
            case 'a-z':
                // Sort alphabetically by name or symbol
                const nameA = a.name?.toLowerCase() || a.symbol.toLowerCase();
                const nameB = b.name?.toLowerCase() || b.symbol.toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            case 'z-a':
                // Sort reverse-alphabetically by name or symbol
                const nameAz = a.name?.toLowerCase() || a.symbol.toLowerCase();
                const nameBz = b.name?.toLowerCase() || b.symbol.toLowerCase();
                if (nameAz < nameBz) return 1;
                if (nameAz > nameBz) return -1;
                return 0;

            default:
                return 0;
        }
    });

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
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder={viewportWidth > 500 ? 'Search by name or symbol...' : 'Search'}
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
                    <Logo background={true} size={viewportWidth > 500 ? '8rem' : '6rem'} />
                </div>
            </div>


            <div className={styles.sortContainer}>
                <div className={styles.sortWrapper}>
                    <label htmlFor="sort-select" className={styles.sortLabel}>Sort by:</label>
                    <div className={styles.selectContainer}>
                        <svg
                            className={styles.sortIcon}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 4h13M3 8h9M3 12h6M3 16h3M13 16h8M13 12h8M13 8h8"
                            />
                        </svg>
                        <select
                            id="sort-select"
                            className={styles.sortSelect}
                            value={sortOption}
                            onChange={(e: any) => setSortOption(e.target.value)}
                        >
                            <option value="priceHighLow">Price: High to Low</option>
                            <option value="priceLowHigh">Price: Low to High</option>
                            <option value="a-z">A-Z</option>
                            <option value="z-a">Z-A</option>
                        </select>
                    </div>
                </div>
                <button
                    className={`${styles.refreshButton} ${isCooldownActive ? styles.disabled : ''}`}
                    disabled={isCooldownActive || isCooldownActive == null}
                    onClick={async () => {
                        if (isCooldownActive) return;
                        const now = Date.now();
                        localStorage.setItem(LAST_REFRESH_KEY, now.toString());
                        setCooldownRemaining(Math.ceil(COOLDOWN_TIME / 1000 / 60));
                        setIsCooldownActive(true);
                        await fetchStaticMetadata("Manual Refresh");
                    }}
                >
                    <svg
                        className={styles.refreshIcon}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h5M4 4l5 5m11-1v-5h-5m1 5l-5-5"
                        />
                    </svg>
                    {isCooldownActive && isCooldownActive != null ? `${cooldownRemaining}m` : 'Refresh'}
                </button>
            </div>
            {/* Grid of Coins */}
            {isSearching ? (
                <div className={styles.loadingMore}>
                    <BarLoader color="#144c7e" width={200} height={6} speedMultiplier={3.5} />
                </div>
            ) : coinsToDisplay.length > 0 && !loading ? (
                <>
                    <div className={styles.gridContainer}>
                        {sortedCoins.map((coin: Token) => (
                            <TokenCard
                                key={coin.tokenId.toString()}
                                coin={coin}
                                loadState={loadStates.get(coin.tokenId.toString()) ?? null}
                            />
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
            <ScrollToTopButton />
        </div>
    );
};