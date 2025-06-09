import { useTradeStore } from '../../../store/tradeStore';
import styles from './TradeHistoryBento.module.css';

interface TradeHistoryBentoProps {
    coin: any;
}

export const TradeHistoryBento: React.FC<TradeHistoryBentoProps> = ({ coin }) => {
    const { trades } = useTradeStore();
    const coinTrades = trades && trades[String(coin.tokenId)] || [];

    // Sort all trades by timestamp descending
    const sortedTrades = [...coinTrades].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <>
            {
                coinTrades.length > 0 && (
                    < div className={styles.bentoWrapper} >

                        <div className={styles.scrollArea}>
                            {sortedTrades.map((trade, i) => (
                                <div
                                    key={i}
                                    className={`${styles.tradeItem} ${trade.type === 'mint' ? styles.leftAlign : styles.rightAlign
                                        }`}
                                >
                                    <div className={styles.bubble}>
                                        <div><strong>{trade.type === 'mint' ? 'Mint' : 'Burn'}</strong></div>
                                        <div>Amt {trade.amount?.toString?.() ?? '-'}</div>
                                        <div> Cost: {formatEth(trade.cost)}</div>
                                        <div>Price: {Number(trade.price).toFixed(4)}</div>
                                        <div className={styles.timestamp}>
                                            {new Date(trade.timestamp * 1000).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div >
                )
            }
        </>
    );
};

function formatEth(wei: bigint | number | undefined): string {
    if (!wei) return '-';
    const eth = typeof wei === 'bigint' ? Number(wei) / 1e18 : wei / 1e18;
    return `${eth.toFixed(5)}`;
}
