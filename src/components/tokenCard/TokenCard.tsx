import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './TokenCard.module.css';
import { useCoinStore } from '../../store/coinStore';
import { useWidth } from '../../hooks/useWidth';
import { getDominantColor } from '../../utils/colorTheif';
import TransparentCandlestickChart from '../chart/LineChart';
import { useTokenStore } from '../../store/allTokensStore';
import { useTokenActivity } from '../../hooks/useTokenActivity';

interface TokenCardProps {
    coin: any;
    loadState?: boolean | null;
}

export const TokenCard: React.FC<TokenCardProps> = ({ coin, loadState }) => {
    const { setCoin } = useCoinStore();
    const updateToken = useTokenStore(state => state.updateToken);
    const { hasDominantColorBeenSet, markDominantColorAsSet } = useTokenStore();
    const width = useWidth();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const hasRunRef = React.useRef(false);

    useEffect(() => {
        const alreadySet = hasDominantColorBeenSet(coin.tokenId);

        if (
            !coin.dominantColor &&
            coin.imageUrl &&
            !imageError &&
            (imageLoaded || loadState === true) &&
            !alreadySet &&
            !hasRunRef.current
        ) {
            hasRunRef.current = true;

            getDominantColor(coin.imageUrl)
                .then((color) => {
                    updateToken(coin.tokenId, { dominantColor: color });
                    markDominantColorAsSet(coin.tokenId);
                })
                .catch((err) => {
                    console.error('Dominant color error:', err);
                    markDominantColorAsSet(coin.tokenId);
                });
        }
    }, [
        coin.tokenId,
        coin.imageUrl,
        coin.dominantColor,
        imageLoaded,
        loadState,
        imageError,
        hasDominantColorBeenSet,
        markDominantColorAsSet,
        updateToken
    ]);

    // Use the actual trades or empty array, but don't default to a constant
    const trades = useTokenActivity(coin.tokenId);

    // Handle image loading locally if no loadState is provided
    useEffect(() => {
        if (loadState !== undefined) {
            setImageLoaded(loadState === true);
            setImageError(loadState === false);
        } else if (coin.imageUrl && coin.imageUrl !== '') {
            setImageLoaded(false);
            setImageError(false);

            const img = new Image();
            img.src = coin.imageUrl;

            img.onload = () => {
                setImageLoaded(true);
                setImageError(false);
            };

            img.onerror = () => {
                setImageLoaded(false);
                setImageError(true);
            };
        }
    }, [coin.imageUrl, loadState]);

    const renderImageContent = () => {
        if (!coin.imageUrl || coin.imageUrl === '') {
            return <div className={styles.imageFallback}>{coin.symbol}</div>;
        }

        if (loadState !== undefined) {
            if (loadState === null) {
                return (
                    <div className={styles.imageLoading}>
                        <div className={styles.loadingSpinner}></div>
                    </div>
                );
            } else if (loadState === false) {
                return <div className={styles.imageFallback}>{coin.symbol}</div>;
            } else {
                return (
                    <img
                        loading="lazy"
                        src={coin.imageUrl}
                        alt={coin.name || 'Coin'}
                        className={styles.coinImage}
                    />
                );
            }
        }

        if (imageError) {
            return <div className={styles.imageFallback}>{coin.symbol}</div>;
        }

        if (!imageLoaded) {
            return (
                <div className={styles.imageLoading}>
                    <div className={styles.loadingSpinner}></div>
                </div>
            );
        }

        return (
            <img
                loading="lazy"
                src={coin.imageUrl}
                alt={coin.name || 'Coin'}
                className={styles.coinImage}
            />
        );
    };

    return (
        <Link
            to={`/dashboard/explore/${coin.tokenId}`}
            className={styles.coinCard}
            onClick={() => {
                setCoin(coin);
            }}
        >
            <div className={styles.imageContainer}>
                {renderImageContent()}
            </div>

            <div className={styles.tokenDetails}>
                {width > 640 && (
                    <h4>{coin.name.length > 7 ? `${coin.name.slice(0, 7)}..` : coin.name}</h4>
                )}
                <div className={styles.symbolText}>
                    {coin.symbol.length < 8 ? coin.symbol : coin.symbol.slice(0, 8)}
                </div>
            </div>

            <div className={styles.chartContainer}>
                <TransparentCandlestickChart
                    coin={coin}
                    trades={trades}
                    height={50}
                    width={'100%'}
                />
            </div>

            <div className={styles.priceSection}>
                <p>
                    <span className={styles.priceValue}>
                        {coin.price != null ? coin.price.toString() : 'N/A'}
                    </span>
                </p>
                <p>
                    {coin && coin.percentChange && coin.percentChange > 0 && < span
                        className={`${styles.percentChange} ${coin.percentChange > 0
                            ? styles.positive
                            : coin.percentChange < 0
                                ? styles.negative
                                : styles.neutral
                            }`}
                    >
                        {coin.percentChange.toFixed(0)}%
                    </span>}
                </p>
            </div>

        </Link >
    );
};