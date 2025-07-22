import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatUnits } from 'ethers';
import styles from './TokenCard.module.css';
import { useCoinStore } from '../../store/coinStore';
import { useWitdh } from '../../hooks/useWidth';
import { getDominantColor } from '../../utils/colorTheif';
import { useTokenActivity } from '../../hooks/useTokenActivity';
import TransparentCandlestickChart from '../chart/LineChart';
// import PlotlyLineChart from '../chart/PlotlyLineChart';


interface TokenCardProps {
    coin: any;
    loadState?: boolean | null; // true = loaded, false = error, null = loading
}

export const TokenCard: React.FC<TokenCardProps> = ({ coin, loadState }) => {
    const navigate = useNavigate();
    const { setCoin } = useCoinStore();
    const width = useWitdh();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const trades = useTokenActivity(coin.tokenId.toString());

    const [tokenColor, setTokenColor] = useState('#1c67a8');

    // Handle image loading locally if no loadState is provided
    useEffect(() => {
        if (loadState !== undefined) {
            // Use the external load state
            setImageLoaded(loadState === true);
            setImageError(loadState === false);
        } else if (coin.imageUrl && coin.imageUrl !== '') {
            // Handle loading internally
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

    // Determine what to render based on load state
    const renderImageContent = () => {
        // No image URL provided
        if (!coin.imageUrl || coin.imageUrl === '') {
            return <div className={styles.imageFallback}>{coin.symbol}</div>;
        }

        // Using external load state
        if (loadState !== undefined) {
            if (loadState === null) {
                // Still loading
                return (
                    <div className={styles.imageLoading}>
                        <div className={styles.loadingSpinner}></div>
                    </div>
                );
            } else if (loadState === false) {
                // Error loading
                return <div className={styles.imageFallback}>{coin.symbol}</div>;
            } else {
                // Successfully loaded
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

        // Using internal load state
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

    useEffect(() => {
        if (!coin.imageUrl || (!imageLoaded && loadState !== true)) return;

        const img = new Image();
        img.src = coin.imageUrl;

        img.onload = async () => {
            try {
                const color = await getDominantColor(img.src);
                setTokenColor(color);
            } catch (error) {
                console.error('Error getting dominant color:', error);
            }
        };
    }, [coin.imageUrl, imageLoaded, loadState]);

    return (
        <Link
            to={`/dashboard/explore/${coin.tokenId}`}
            className={styles.coinCard}
            onClick={() => {
                setCoin(coin);
                navigate(`/dashboard/explore/${coin.tokenId}/trade`);
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
                    lineColor={tokenColor}
                />
                {/* <PlotlyLineChart
                        coin={coin}
                        trades={trades}
                        height={150}
                        width={'100%'}
                        lineColor={tokenColor}
                    /> */}
            </div>

            <div className={styles.priceSection}>
                <p>
                    <span className={styles.priceValue}>
                        {coin.price != null ? formatUnits(coin.price) : 'N/A'}
                    </span>
                </p>
            </div>
        </Link>
    );
};