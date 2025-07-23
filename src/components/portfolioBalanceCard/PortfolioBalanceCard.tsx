import React from 'react';
import styles from './PortfolioBalanceCard.module.css';
import { Link } from 'react-router-dom';

interface PortfolioBalanceCardProps {
    coin: any;
    tokenId: string;
    name: string;
    symbol: string;
    balance: string;
    totalValueEth: number;
    totalValueUsd: number | null;
}

export const PortfolioBalanceCard: React.FC<PortfolioBalanceCardProps> = ({
    coin, name, symbol, balance, totalValueEth, totalValueUsd
}) => {
    const priceChange = Math.random() * 20 - 10;
    const isPositive = priceChange >= 0;

    return (
        <Link
            to={`/dashboard/explore/${coin.tokenId}`}
            className={styles.balanceCard}
        >
            <div className={styles.cardContent}>
                <div className={styles.tokenInfo}>
                    <div className={styles.imageContainer}>
                        <div className={styles.imageFallback}>{symbol}</div>
                    </div>
                    <div className={styles.tokenMeta}>
                        <div className={styles.tokenSymbol}>{symbol}</div>
                        <div className={styles.tokenName}>{name}</div>
                    </div>
                </div>

                <div className={styles.balanceBlock}>
                    <div className={styles.balanceAmount}>
                        {parseFloat(balance).toLocaleString(undefined, {
                            maximumFractionDigits: 0
                        })}
                    </div>
                    <div className={styles.balanceLabel}>Balance</div>
                </div>

                <div className={styles.valueBlock}>
                    {totalValueUsd != null ? (
                        <div className={styles.usdValue}>
                            ${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    ) : (
                        <div className={styles.ethValue}>Ξ {totalValueEth.toFixed(4)}</div>
                    )}
                    {totalValueUsd != null && (
                        <div className={styles.ethValueSecondary}>Ξ {totalValueEth.toFixed(4)}</div>
                    )}
                </div>

                <div className={`${styles.priceChange} ${isPositive ? styles.positive : styles.negative}`}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </div>

                <div className={styles.viewDetails}>→</div>
            </div>
        </Link>
    );
};
