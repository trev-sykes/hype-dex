// PortfolioBalanceCard.tsx - Enhanced card component
import React from 'react';
import styles from './portfolioBalanceCard.module.css';
import { Link, useNavigate } from 'react-router-dom';

interface PortfolioBalanceCardProps {
    tokenId: string;
    name: string;
    symbol: string;
    imageUrl?: string;
    balance: string;
    totalValueEth: number;
    totalValueUsd: number | null;
}

export const PortfolioBalanceCard: React.FC<PortfolioBalanceCardProps> = ({
    tokenId, name, symbol, imageUrl, balance, totalValueEth, totalValueUsd
}) => {
    const navigate = useNavigate();

    // Calculate percentage change (mock data - replace with real data)
    const priceChange = Math.random() * 20 - 10; // -10% to +10%
    const isPositive = priceChange >= 0;

    return (
        <Link
            to={`/dashboard/explore/${tokenId}`}
            className={styles.balanceCard}
            onClick={() => navigate(`/dashboard/explore/${tokenId}/`)}
        >
            <div className={styles.cardHeader}>
                <div className={styles.tokenInfo}>
                    <div className={styles.imageContainer}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={name} className={styles.coinImage} />
                        ) : (
                            <div className={styles.imageFallback}>{symbol}</div>
                        )}
                    </div>
                    <div className={styles.tokenMeta}>
                        <div className={styles.tokenSymbol}>{symbol}</div>
                        <div className={styles.tokenName}>{name}</div>
                    </div>
                </div>
                <div className={`${styles.priceChange} ${isPositive ? styles.positive : styles.negative}`}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </div>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.balanceSection}>
                    <div className={styles.balanceLabel}>Balance</div>
                    <div className={styles.balanceAmount}>
                        {parseFloat(balance).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        })}
                    </div>
                </div>

                <div className={styles.valueSection}>
                    <div className={styles.primaryValue}>
                        {totalValueUsd != null ? (
                            <div className={styles.usdValue}>
                                ${totalValueUsd.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </div>
                        ) : (
                            <div className={styles.ethValue}>Ξ {totalValueEth.toFixed(4)}</div>
                        )}
                    </div>
                    <div className={styles.secondaryValue}>
                        {totalValueUsd != null && (
                            <div className={styles.ethValue}>Ξ {totalValueEth.toFixed(4)}</div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.cardFooter}>
                <div className={styles.viewDetails}>View Details →</div>
            </div>
        </Link>
    );
};
