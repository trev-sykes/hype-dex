import { useTradeStore } from '../../../store/tradeStore';
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
                                        <td>{trade.type === 'mint' ? 'Mint' : 'Burn'}</td>
                                        <td>{trade.amount?.toString?.() ?? '-'}</td>
                                        <td>{formatEth(trade.cost)}</td>
                                        <td>{Number(trade.price).toFixed(4)}</td>
                                        <td>{new Date(trade.timestamp * 1000).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
};

function formatEth(wei: bigint | number | undefined): string {
    if (!wei) return '-';
    const eth = typeof wei === 'bigint' ? Number(wei) / 1e18 : wei / 1e18;
    return `${eth.toFixed(5)}`;
}
