import React, { useState } from 'react';
import type { Token } from '../../../types/token';
import { useUserTokenBalances } from '../../../hooks/useUserBalances';
import { useBalanceStore } from '../../../store/balancesStore';
import { PortfolioBalanceCard } from '../../../components/portfolioBalanceCard/PortfolioBalanceCard';
import styles from "./Portfolio.module.css";

interface MyPortfolioProps {
    tokens: Token[];
}

export const Portfolio: React.FC<MyPortfolioProps> = ({ tokens }) => {
    const [sortBy, setSortBy] = useState<'value' | 'balance' | 'name'>('value');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const tokenIds = tokens.map((t) => t.tokenId);
    const { balances, loading, error, refetch } = useUserTokenBalances(tokens, tokenIds);
    const hydrated = useBalanceStore((s) => s.hydrated);

    // Filter and sort tokens
    const portfolioTokens = balances
        .filter((b) => b.balance && b.balance > 0)
        .map((b) => {
            const tokenMeta = tokens.find((t) => t.tokenId.toString() === b.tokenId.toString());
            return { ...b, ...tokenMeta };
        })
        .filter((t) => t)
        .sort((a, b) => {
            switch (sortBy) {
                case 'value':
                    return (b.totalValueUsd ?? b.totalValueEth ?? 0) - (a.totalValueUsd ?? a.totalValueEth ?? 0);
                case 'balance':
                    return parseFloat(b.formatted || '0') - parseFloat(a.formatted || '0');
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                default:
                    return 0;
            }
        });

    const totalValue = portfolioTokens.reduce((acc, token) => acc + (token.totalValueEth ?? 0), 0);
    const totalUsd = balances.reduce((sum, b) => sum + (b.totalValueUsd ?? 0), 0);

    if (!hydrated || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading your portfolio...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <h3>Error loading balances</h3>
                    <p>{error.message}</p>
                    <button className={styles.retryButton} onClick={refetch}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Dashboard Header */}
            <div className={styles.dashboardHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.title}>Portfolio Dashboard</h1>
                        <p className={styles.subtitle}>Track your token holdings and performance</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.refreshButton} onClick={refetch}>
                            <span className={styles.refreshIcon}>↻</span>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Portfolio Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Total Portfolio Value</div>
                    <div className={styles.summaryValue}>
                        {totalUsd > 0 ? (
                            <>
                                <span className={styles.primaryAmount}>
                                    ${totalUsd.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </span>
                                <span className={styles.secondaryAmount}>
                                    Ξ {totalValue.toFixed(4)}
                                </span>
                            </>
                        ) : (
                            <span className={styles.primaryAmount}>Ξ {totalValue.toFixed(4)}</span>
                        )}
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Total Assets</div>
                    <div className={styles.summaryValue}>
                        <span className={styles.primaryAmount}>{portfolioTokens.length}</span>
                        <span className={styles.secondaryAmount}>Tokens</span>
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>24h Change</div>
                    <div className={styles.summaryValue}>
                        <span className={`${styles.primaryAmount} ${styles.positive}`}>+2.34%</span>
                        <span className={styles.secondaryAmount}>+$234.56</span>
                    </div>
                </div>
            </div>

            {/* Portfolio Controls */}
            <div className={styles.portfolioControls}>
                <div className={styles.controlsLeft}>
                    <div className={styles.sortControls}>
                        <label className={styles.controlLabel}>Sort by:</label>
                        <select
                            className={styles.sortSelect}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                        >
                            <option value="value">Value</option>
                            <option value="balance">Balance</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                <div className={styles.controlsRight}>
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            ⊞ Grid
                        </button>
                        <button
                            className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            ☰ List
                        </button>
                    </div>
                </div>
            </div>

            {/* Portfolio Assets */}
            {portfolioTokens.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h3>No tokens in portfolio</h3>
                    <p>Start building your portfolio by exploring available tokens</p>
                </div>
            ) : (
                <div className={`${styles.portfolioGrid} ${styles[viewMode]}`}>
                    {portfolioTokens.map((token: any) => (
                        <PortfolioBalanceCard
                            key={token.tokenId}
                            tokenId={token.tokenId}
                            name={token.name}
                            symbol={token.symbol}
                            imageUrl={token.imageUrl}
                            balance={token.formatted}
                            totalValueEth={token.totalValueEth}
                            totalValueUsd={token.totalValueUsd}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};