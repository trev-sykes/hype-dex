import { useEffect, useRef, useState, useCallback } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import styles from './TransparentCandlestickChart.module.css';
import { useCoinStore } from '../../store/coinStore';
import { FadeLoader } from 'react-spinners';
import { formatEther } from 'ethers';
import { useTradeStore } from '../../store/tradeStore';
import { useTokenPriceData } from '../../hooks/useTokenPriceData';
// import { useWitdh } from '../../hooks/useWidth';

interface Trade {
    tokenId: bigint;
    amount: bigint;
    cost: bigint;
    price: number;
    timestamp: number;
    type: 'mint' | 'burn';
}

interface Props {
    trades: Trade[];
    interval?: number;
    tokenId?: any;
}

export default function TransparentLineChart({ trades, interval = 3600 }: Props) {
    const { coin } = useCoinStore();
    // const viewportWidth = useWitdh();
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const [selectedInterval, setSelectedInterval] = useState(interval);
    const [isChartInitialized, setIsChartInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { setTrades } = useTradeStore();
    const { price } = useTokenPriceData();
    const [showSparseDataWarning, setShowSparseDataWarning] = useState(false);

    // Simple debounce helper
    const debounce = (func: () => void, wait: number) => {
        let timeout: NodeJS.Timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(func, wait);
        };
    };

    const aggregateBuckets = (trades: Trade[], interval: number) => {
        const buckets: Record<number, { total: number; count: number }> = {};
        trades.forEach((trade) => {
            if (!isFinite(trade.price)) return;
            const bucket = Math.floor(trade.timestamp / interval) * interval;
            if (!buckets[bucket]) {
                buckets[bucket] = { total: trade.price, count: 1 };
            } else {
                buckets[bucket].total += trade.price;
                buckets[bucket].count += 1;
            }
        });
        return buckets;
    };

    const updateChartData = useCallback(
        (trades: Trade[], interval: number) => {
            setIsLoading(true);
            if (!lineSeriesRef.current) {
                setIsLoading(false);
                return;
            }

            if (!trades || trades.length === 0) {
                setShowSparseDataWarning(false);
                if (price) {
                    const now: any = Math.floor(Date.now() / 1000);
                    const bucket: any = interval === -1 ? now : Math.floor(now / interval) * interval;
                    const currentPrice: any = typeof price === 'bigint' ? Number(formatEther(price)) : price;
                    lineSeriesRef.current.setData([{ time: bucket, value: currentPrice }]);
                } else {
                    lineSeriesRef.current.setData([]);
                }
                setIsLoading(false);
                return;
            }

            if (interval === -1) {
                // Show all trades as points on the line chart
                setShowSparseDataWarning(false);
                const allTimeData: any = trades
                    .filter((trade) => isFinite(trade.price))
                    .map((trade) => ({ time: trade.timestamp, value: trade.price }))
                    .sort((a, b) => a.time - b.time);

                lineSeriesRef.current.setData(allTimeData);
                chartRef.current?.timeScale().fitContent();
                setIsLoading(false);
                return;
            }

            const buckets = aggregateBuckets(trades, interval);

            // If too sparse (less than 2 buckets), fallback to all time view
            if (Object.keys(buckets).length < 2) {
                setShowSparseDataWarning(true);
                updateChartData(trades, -1);
                return;
            } else {
                setShowSparseDataWarning(false);
            }

            const data: any = Object.entries(buckets)
                .map(([timeStr, bucketData]) => ({
                    time: Number(timeStr),
                    value: bucketData.total / bucketData.count,
                }))
                .sort((a, b) => a.time - b.time);

            // Optionally add current price as last point if relevant
            if (price && data.length > 0) {
                const now: any = Math.floor(Date.now() / 1000);
                const currentBucket: any = Math.floor(now / interval) * interval;
                const currentPrice: any = typeof price === 'bigint' ? Number(formatEther(price)) : price;

                const lastPoint = data[data.length - 1];
                if (lastPoint.time === currentBucket) {
                    data[data.length - 1] = { time: currentBucket, value: currentPrice };
                } else {
                    data.push({ time: currentBucket, value: currentPrice });
                }
            }

            lineSeriesRef.current.setData(data);
            chartRef.current?.timeScale().fitContent();
            setIsLoading(false);
        },
        [price]
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !chartContainerRef.current) return;

        import('lightweight-charts')
            .then(({ createChart }) => {
                const container = chartContainerRef.current!;
                const chart = createChart(container, {
                    width: container.clientWidth,
                    height: 500,
                    layout: {
                        background: { color: 'transparent' },
                        textColor: '#171717',
                    },
                    grid: {
                        vertLines: { visible: false },
                        horzLines: { visible: false },
                    },
                    timeScale: {
                        timeVisible: false,
                        secondsVisible: true,
                        borderColor: '#1c67a8',
                        barSpacing: 10,
                        fixLeftEdge: true,
                        fixRightEdge: true,
                        minBarSpacing: 1,
                        rightOffset: 0,
                        lockVisibleTimeRangeOnResize: true,
                    },
                    rightPriceScale: {
                        visible: false,
                    },
                    handleScroll: false,
                    handleScale: false,
                });

                const lineSeries = chart.addLineSeries({
                    color: '#2196f3',
                    lineWidth: 1,
                    priceLineVisible: true,
                    priceFormat: {
                        type: 'price',
                        precision: 6,
                        minMove: 0.000001,
                    },
                });

                chartRef.current = chart;
                lineSeriesRef.current = lineSeries;

                const debouncedResize = debounce(() => {
                    if (chartContainerRef.current) {
                        chart.applyOptions({
                            width: chartContainerRef.current.clientWidth,
                            height: chartContainerRef.current.clientHeight,
                        });
                    }
                }, 200);

                const resizeObserver = new ResizeObserver(debouncedResize);
                resizeObserver.observe(container);

                chart.timeScale().fitContent();
                setIsChartInitialized(true);
                updateChartData(trades, selectedInterval);

                if (coin?.tokenId) {
                    setTrades(coin.tokenId.toString(), [...trades]);
                }

                return () => {
                    resizeObserver.disconnect();
                    chart.remove();
                    chartRef.current = null;
                    lineSeriesRef.current = null;
                    setIsChartInitialized(false);
                };
            })
            .catch((err) => console.error('Failed to load lightweight-charts:', err));
    }, []);

    // Return filtered intervals based on time span and bucket counts
    const getAvailableIntervals = useCallback(() => {
        if (!trades || trades.length === 0) {
            return [{ label: 'All', value: -1 }];
        }

        const now = Math.floor(Date.now() / 1000);
        const oldestTrade = Math.min(...trades.map((t) => t.timestamp));
        const timeSpan = now - oldestTrade;

        const allIntervals = [
            { label: '1H', value: 3600, minTimeSpan: 3600 },
            { label: '1D', value: 86400, minTimeSpan: 86400 },
            { label: '1M', value: 2592000, minTimeSpan: 2592000 },
            { label: '1Y', value: 31536000, minTimeSpan: 31536000 },
            { label: 'All', value: -1, minTimeSpan: 0 },
        ];

        // Filter intervals by minimum time span
        const filteredByTime = allIntervals.filter(
            (interval) => interval.value === -1 || timeSpan >= interval.minTimeSpan * 2
        );

        // Further filter intervals by bucket count >= 2 for non -1 intervals
        const filteredByBuckets = filteredByTime.filter((interval) => {
            if (interval.value === -1) return true;
            const buckets = aggregateBuckets(trades, interval.value);
            return Object.keys(buckets).length >= 2;
        });

        return filteredByBuckets.length > 0 ? filteredByBuckets : [{ label: 'All', value: -1 }];
    }, [trades]);

    useEffect(() => {
        if (!isChartInitialized) return;

        const availableIntervals = getAvailableIntervals();
        const isSelectedAvailable = availableIntervals.some((i) => i.value === selectedInterval);

        if (!isSelectedAvailable) {
            const fallback = availableIntervals.find((i) => i.value === -1) || availableIntervals.slice(-1)[0];
            setSelectedInterval(fallback.value);
            return;
        }

        updateChartData(trades, selectedInterval);
    }, [trades, selectedInterval, updateChartData, isChartInitialized, getAvailableIntervals]);

    const intervalOptions = getAvailableIntervals();

    return (
        <div className={styles.container}>
            {!isLoading && (
                <>
                    <div className={styles.controls}>
                        <div className={styles.assetInfo}>
                            {!isLoading ? (
                                <>
                                    <p className={styles.symbol}>{coin?.symbol}</p>
                                    <p className={styles.price}>{price ? `${typeof price === 'bigint' ? formatEther(price) : price} ETH` : '—'}</p>
                                </>
                            ) : (
                                <>
                                    <FadeLoader />
                                </>
                            )}
                        </div>
                    </div>

                    <div ref={chartContainerRef} className={styles.chartContainer} />

                    <div className={styles.intervalButtonGroup}>
                        {intervalOptions.map((option) => (
                            <button
                                key={option.value}
                                className={`${styles.intervalButton} ${selectedInterval === option.value ? styles.active : ''}`}
                                onClick={() => setSelectedInterval(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {showSparseDataWarning && (
                        <div className={styles.sparseDataWarning}>
                            <p>Data too sparse for selected interval. Showing all trades.</p>
                        </div>
                    )}

                    {!isLoading && trades.length === 0 && (
                        <div className={styles.noDataOverlay}>
                            <p>No trades available for this token.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
