import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarLoader, FadeLoader } from 'react-spinners';
import styles from './ExploreGrid.module.css';
import Logo from '../../../components/logo/Logo';
import { useOnline } from '../../../hooks/useOnline';
import { useWitdh } from '../../../hooks/useWidth';
import { scrollToTop } from '../../../utils/scroll';
import { TokenCard } from '../../../components/tokenCard/TokenCard';
import type { Token } from '../../../types/token';
// import { useTokenStore } from '../../../store/allTokensStore';
interface ExploreGridProps {
    tokens: any,
    fetchNextPage: any,
    hasNextPage: any,
    loading: any
}
export const ExploreGrid: React.FC<ExploreGridProps> = ({ tokens, fetchNextPage, hasNextPage, loading }) => {
    // const { clearTokens } = useTokenStore();
    const isOnline = useOnline();
    const viewportWidth = useWitdh();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filteredCoins, setFilteredCoins] = useState<any[]>([]);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [loadStates, setLoadStates] = useState<Map<string, boolean | null>>(new Map());
    const inputRef = useRef<HTMLInputElement | null>(null);


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


    // Scroll handler to show/hide scroll-to-top button & infinite load
    useEffect(() => {
        const onScroll = () => {
            setShowScrollButton(window.scrollY > 200);

            // Infinite scroll: load next page if near bottom (300px)
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 300
            ) {
                // if (hasNextPage && !loading) {
                //     fetchNextPage();
                // }
            }
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);


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

            <div className={`${styles.symbolText} ${styles.tokenCount}`}>
                {coinsToDisplay.length} Tokens
            </div>
            {/* <button
                onClick={() => {
                    clearTokens()
                }}
            >
                Refresh
            </button> */}
            {/* Grid of Coins */}
            {isSearching ? (
                <div className={styles.loadingMore}>
                    <BarLoader color="#144c7e" width={200} height={6} speedMultiplier={3.5} />
                </div>
            ) : coinsToDisplay.length > 0 ? (
                <>
                    <div className={styles.gridContainer}>
                        {coinsToDisplay.map((coin: Token) => (
                            <TokenCard
                                key={coin.tokenId.toString()}
                                coin={coin}
                                loadState={loadStates.get(coin.tokenId.toString()) ?? null} // ✅ safe fallback
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