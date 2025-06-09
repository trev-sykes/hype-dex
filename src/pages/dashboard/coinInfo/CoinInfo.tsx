import { Link } from 'react-router-dom';
import { useCoinStore } from '../../../store/coinStore';
import styles from './CoinInfo.module.css';
import { MoveLeftIcon } from 'lucide-react';

const formatEther = (wei: any) => (Number(wei) / 1e18).toFixed(4);
export const CoinInfo: React.FC = () => {
    const { coin } = useCoinStore();
    return (
        <div className={styles.container}>
            {coin ? (
                <>
                    {/* Back Button */}
                    <div className={styles.exploreButtonContainer}>
                        <Link className={styles.exploreButton} to={"/dashboard/explore"}>
                            <MoveLeftIcon />
                            <span>Back to Explore</span>
                        </Link>
                    </div>

                    {/* Header Section */}
                    <div className={styles.headerSection}>
                        <div className={styles.imageContainer}>
                            <img
                                src={coin.imageUrl}
                                alt={coin.name}
                                className={styles.image}
                                onError={(e) => (e.currentTarget.src = '/favicon-light.png')}
                            />
                        </div>

                        <h1 className={styles.title}>{coin.name}</h1>
                        <span className={styles.symbol}>{coin.symbol}</span>

                        {coin.description && (
                            <p className={styles.description}>{coin.description}</p>
                        )}
                    </div>

                    {/* Meta Information Grid */}
                    <div className={styles.meta}>
                        <div className={styles.metaCard}>
                            <span className={styles.label}>Current Price</span>
                            <span className={`${styles.value} ${styles.priceValue}`}>
                                {formatEther(coin.price)} ETH
                            </span>
                        </div>

                        <div className={styles.metaCard}>
                            <span className={styles.label}>Base Price</span>
                            <span className={styles.value}>
                                {formatEther(coin.basePrice)} ETH
                            </span>
                        </div>

                        <div className={styles.metaCard}>
                            <span className={styles.label}>Slope</span>
                            <span className={styles.value}>
                                {formatEther(coin.slope)} ETH
                            </span>
                        </div>

                        <div className={styles.metaCard}>
                            <span className={styles.label}>Total Supply</span>
                            <span className={styles.value}>
                                {coin.totalSupply.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            </span>
                        </div>

                        <div className={styles.metaCard}>
                            <span className={styles.label}>Reserve</span>
                            <span className={styles.value}>
                                {formatEther(coin.reserve)} ETH
                            </span>
                        </div>

                        <div className={styles.metaCard}>
                            <span className={styles.label}>Token ID</span>
                            <span className={styles.value} title={coin.tokenId.toString()}>
                                {coin.tokenId.toString().slice(0, 12)}...
                            </span>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className={styles.ctaContainer}>
                        <Link
                            to={`/dashboard/trade/${coin.name}`}
                            className={styles.ctaButton}
                        >
                            Trade Now
                        </Link>
                    </div>
                </>
            ) : (
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading coin information...</p>
                </div>
            )}
        </div>
    );
};
