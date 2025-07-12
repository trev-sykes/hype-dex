import { useEffect, useRef, useState, useCallback } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import styles from './TransparentCandlestickChart.module.css';
import { useCoinStore } from '../../store/coinStore';
import { FadeLoader } from 'react-spinners';
import { formatEther } from 'ethers';
import { useTradeStore } from '../../store/tradeStore';
import { useTokenPriceData } from '../../hooks/useTokenPriceData';

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

    // Helper function to ensure unique timestamps and proper sorting
    const processDataForChart = (data: { time: number; value: number }[]) => {
        // Remove duplicates and sort by time
        const uniqueData = new Map<number, number>();

        data.forEach(item => {
            // For duplicate timestamps, keep the last value (most recent)
            uniqueData.set(item.time, item.value);
        });

        // Convert back to array and sort by time
        return Array.from(uniqueData.entries())
            .map(([time, value]) => ({ time, value }))
            .sort((a, b) => a.time - b.time);
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
                    const data: any = [{ time: bucket, value: currentPrice }];

                    // Process data to ensure uniqueness
                    const processedData: any = processDataForChart(data);
                    lineSeriesRef.current.setData(processedData);

                    // Add marker for current price
                    lineSeriesRef.current.setMarkers([
                        {
                            time: bucket,
                            position: 'aboveBar',
                            color: '#2196f3',
                            shape: 'circle',
                            text: `${currentPrice.toFixed(6)}`,
                            size: 0,
                        },
                    ]);

                    chartRef.current?.timeScale().fitContent();
                    setIsLoading(false);
                    return;
                } else {
                    lineSeriesRef.current.setData([]);
                    lineSeriesRef.current.setMarkers([]);
                    setIsLoading(false);
                    return;
                }
            }

            if (interval === -1) {
                setShowSparseDataWarning(false);
                const allTimeData = trades
                    .filter((trade) => isFinite(trade.price))
                    .map((trade) => ({ time: trade.timestamp, value: trade.price }));

                // Process data to remove duplicates and ensure proper sorting
                const processedData: any = processDataForChart(allTimeData);

                if (processedData.length === 0) {
                    lineSeriesRef.current.setData([]);
                    lineSeriesRef.current.setMarkers([]);
                    setIsLoading(false);
                    return;
                }

                // Find high and low
                const high = Math.max(...processedData.map((d: any) => d.value));
                const low = Math.min(...processedData.map((d: any) => d.value));
                const currentPrice = price
                    ? typeof price === 'bigint'
                        ? Number(formatEther(price))
                        : price
                    : processedData[processedData.length - 1].value;

                // Find timestamps for high and low
                const highPoint = processedData.find((d: any) => d.value === high);
                const lowPoint = processedData.find((d: any) => d.value === low);
                const currentPoint = processedData[processedData.length - 1];

                // Set data
                lineSeriesRef.current.setData(processedData);

                // Set markers for high, low, and current price
                const markers: any[] = [];

                if (highPoint && high !== currentPrice) {
                    markers.push({
                        time: highPoint.time,
                        position: 'aboveBar',
                        color: '#4caf50',
                        shape: 'none',
                        text: `${high.toFixed(6)}`,
                        size: 0,
                    });
                }

                if (lowPoint && low !== currentPrice) {
                    markers.push({
                        time: lowPoint.time,
                        position: 'belowBar',
                        color: '#f44336',
                        shape: 'none',
                        text: `${low.toFixed(6)}`,
                        size: 0,
                    });
                }

                const isCurrentMarkerDuplicate =
                    (high === currentPrice && highPoint?.time === currentPoint?.time) ||
                    (low === currentPrice && lowPoint?.time === currentPoint?.time);

                if (currentPoint && price && !isCurrentMarkerDuplicate) {
                    markers.push({
                        time: currentPoint.time,
                        position: 'aboveBar',
                        color: '#404040',
                        shape: 'none',
                        text: `${currentPrice.toFixed(6)}`,
                        size: 0,
                    });
                }

                // Sort markers by time
                markers.sort((a, b) => a.time - b.time);
                lineSeriesRef.current.setMarkers(markers);
                chartRef.current?.timeScale().fitContent();
                setIsLoading(false);
                return;
            }

            const buckets = aggregateBuckets(trades, interval);

            if (Object.keys(buckets).length < 2) {
                setShowSparseDataWarning(true);
                updateChartData(trades, -1);
                return;
            } else {
                setShowSparseDataWarning(false);
            }

            const data = Object.entries(buckets)
                .map(([timeStr, bucketData]) => ({
                    time: Number(timeStr),
                    value: bucketData.total / bucketData.count,
                }));

            // Add current price as last point if relevant
            if (price && data.length > 0) {
                const now = Math.floor(Date.now() / 1000);
                const currentBucket = Math.floor(now / interval) * interval;
                const currentPrice: any = typeof price === 'bigint' ? Number(formatEther(price)) : price;

                // Add or update current price point
                data.push({ time: currentBucket, value: currentPrice });
            }

            // Process data to ensure uniqueness and proper sorting
            const processedData: any = processDataForChart(data);

            if (processedData.length === 0) {
                lineSeriesRef.current.setData([]);
                lineSeriesRef.current.setMarkers([]);
                setIsLoading(false);
                return;
            }

            // Find high and low
            const high = Math.max(...processedData.map((d: any) => d.value));
            const low = Math.min(...processedData.map((d: any) => d.value));
            const highPoint = processedData.find((d: any) => d.value === high);
            const lowPoint = processedData.find((d: any) => d.value === low);
            const currentPoint = processedData[processedData.length - 1];

            // Set data
            lineSeriesRef.current.setData(processedData);

            // Set markers for high, low, and current price
            const markers: any[] = [];
            const currentPrice: any = price ? (typeof price === 'bigint' ? Number(formatEther(price)) : price) : null;

            if (highPoint && currentPrice !== high) {
                markers.push({
                    time: highPoint.time,
                    position: 'aboveBar',
                    color: '#404040',
                    shape: 'none',
                    text: `${high.toFixed(4)}`,
                    size: 0,
                });
            }

            if (lowPoint && currentPrice !== low) {
                markers.push({
                    time: lowPoint.time,
                    position: 'belowBar',
                    color: '#404040',
                    shape: 'none',
                    text: `${low.toFixed(4)}`,
                    size: 0,
                });
            }

            if (currentPoint && currentPrice) {
                markers.push({
                    time: currentPoint.time,
                    position: 'aboveBar',
                    color: '#404040',
                    shape: 'none',
                    text: `${currentPrice.toFixed(4)}`,
                    size: 0,
                });
            }

            // Sort markers by time
            markers.sort((a, b) => a.time - b.time);
            lineSeriesRef.current.setMarkers(markers);
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