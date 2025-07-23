import React, { useState } from 'react';
import type { Token } from '../../../types/token';
import { useUserTokenBalances } from '../../../hooks/useUserBalances';
import { useBalanceStore } from '../../../store/balancesStore';
import { PortfolioBalanceCard } from '../../../components/portfolioBalanceCard/PortfolioBalanceCard';
import styles from './Portfolio.module.css';
import { useWitdh } from '../../../hooks/useWidth';
import { ScrollToTopButton } from '../../../components/button/scrollToTop/ScrollToTopButton';

interface MyPortfolioProps {
    tokens: Token[];
}

export const Portfolio: React.FC<MyPortfolioProps> = ({ tokens }) => {
    const [sortBy, setSortBy] = useState<'value' | 'balance' | 'name'>('value');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const width = useWitdh();
    const tokenIds = tokens.map((t) => t.tokenId);
    const { balances, loading, error, refetch } = useUserTokenBalances(tokens, tokenIds);
    const hydrated = useBalanceStore((s) => s.hydrated);

    const portfolioTokens = balances
        .filter((b) => b.balance && b.balance > 0)
        .map((b) => ({ ...b, ...tokens.find((t) => t.tokenId === b.tokenId) }))
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

    const totalEth = portfolioTokens.reduce((acc, t) => acc + (t.totalValueEth ?? 0), 0);
    const totalUsd = portfolioTokens.reduce((acc, t) => acc + (t.totalValueUsd ?? 0), 0);

    if (!hydrated || loading) {
        return (
            <div className={styles.centeredBox}>
                <div className={styles.spinner}></div>
                <p>Loading portfolio...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.centeredBox}>
                <h3>Error</h3>
                <p>{error.message}</p>
                <button onClick={refetch} className={styles.retryBtn}>Try Again</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>

            <div className={styles.totalBalanceBox}>
                <div className={styles.balanceValue}>
                    {totalUsd > 0
                        ? `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : `Ξ ${totalEth.toFixed(4)}`
                    }
                </div>
                {totalUsd > 0 && (
                    <div className={styles.ethValue}>Ξ {totalEth.toFixed(4)}</div>
                )}
            </div>

            <div className={styles.portfolioControls}>
                <div className={styles.controlsGroup}>
                    <label>Sort</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                        <option value="value">Value</option>
                        <option value="balance">Balance</option>
                        <option value="name">Name</option>
                    </select>
                </div>
                {width > 600 &&
                    <div className={styles.controlsGroup}>
                        <button
                            className={viewMode === 'grid' ? styles.activeView : ''}
                            onClick={() => setViewMode('grid')}
                        >⊞</button>
                        <button
                            className={viewMode === 'list' ? styles.activeView : ''}
                            onClick={() => setViewMode('list')}
                        >☰</button>
                    </div>
                }
                <button className={styles.refreshBtn} onClick={refetch}>↻</button>
            </div>

            {portfolioTokens.length === 0 ? (
                <div className={styles.centeredBox}>
                    <p>No tokens in your portfolio yet.</p>
                </div>
            ) : (
                <div className={`${styles.portfolioGrid} ${styles[viewMode]}`}>
                    {portfolioTokens.map((token: any) => {
                        console.log("TOKEN PASSED TO PORTFOLIO: ", token);
                        return (
                            <PortfolioBalanceCard
                                coin={token}
                                key={token.tokenId}
                                tokenId={token.tokenId}
                                name={token.name}
                                symbol={token.symbol}
                                balance={token.formatted}
                                totalValueEth={token.totalValueEth}
                                totalValueUsd={token.totalValueUsd}
                            />
                        )
                    })}
                </div>
            )}
            <ScrollToTopButton />
        </div>
    );
};
