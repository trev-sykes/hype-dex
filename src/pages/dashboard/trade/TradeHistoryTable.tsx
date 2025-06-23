import { useTradeStore } from '../../../store/tradeStore';
import { timeAgo } from '../../../utils/formatTimeAgo';
import styles from './TradeHistoryTable.module.css';

interface TradeHistoryTableProps {
    coin: any;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ coin }) => {
    const { trades } = useTradeStore();
    const coinTrades = trades?.[String(coin.tokenId)] || [];

    const sortedTrades = [...coinTrades].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <>
            {sortedTrades.length > 0 && (
                <div className={styles.bentoWrapper}>
                    <div className={styles.scrollArea}>
                        <table className={styles.tradeTable}>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Cost (ETH)</th>
                                    <th>Price</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTrades.map((trade, i) => (
                                    <tr key={i}>
                                        <td className={`${trade.type === 'mint' ? styles.mint : styles.burn}`}>{trade.type === 'mint' ? 'BUY' : 'SELL'}</td>
                                        <td className={`${trade.type === 'mint' ? styles.mint : styles.burn}`}>{trade.amount?.toString?.() ?? '-'}</td>
                                        <td>{formatEth(trade.cost)}</td>
                                        <td className={`${trade.type === 'mint' ? styles.mint : styles.burn}`}>{Number(trade.price).toFixed(4)}</td>
                                        <td>{timeAgo(trade.timestamp)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div >
            )}
        </>
    );
};

function formatEth(wei: bigint | number | undefined): string {
    if (!wei) return '-';
    const eth = typeof wei === 'bigint' ? Number(wei) / 1e18 : wei / 1e18;
    return `${eth.toFixed(5)}`;
}
