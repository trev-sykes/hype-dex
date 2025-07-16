import { useEffect, useRef, useState, useCallback } from 'react';
import * as Plotly from "plotly.js-basic-dist";
import styles from './TransparentCandlestickChart.module.css';
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
    coin?: any;
    trades: Trade[];
    interval?: number;
    tokenId?: any;
    width?: any;
    height?: any;
    lineColor?: any;
}

export default function PlotlyLineChart({ coin, trades, interval = 3600, width, height, lineColor }: Props) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const [selectedInterval, setSelectedInterval] = useState(interval);
    const [isChartInitialized, setIsChartInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { setTrades } = useTradeStore();
    const { price } = useTokenPriceData();
    const [showSparseDataWarning, setShowSparseDataWarning] = useState(false);

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
        const uniqueData = new Map<number, number>();
        data.forEach(item => {
            uniqueData.set(item.time, item.value);
        });

        return Array.from(uniqueData.entries())
            .map(([time, value]) => ({ time, value }))
            .sort((a, b) => a.time - b.time);
    };

    const updateChartData = useCallback(
        (trades: Trade[], interval: number) => {
            setIsLoading(true);
            if (!chartContainerRef.current) {
                setIsLoading(false);
                return;
            }

            let processedData: { time: number; value: any }[] = [];
            let annotations: any[] = [];

            if (!trades || trades.length === 0) {
                setShowSparseDataWarning(false);
                if (price) {
                    const now = Math.floor(Date.now() / 1000);
                    const bucket = interval === -1 ? now : Math.floor(now / interval) * interval;
                    const currentPrice: any = typeof price === 'bigint' ? Number(formatEther(price)) : price;
                    processedData = [{ time: bucket, value: currentPrice }];

                    if (!width && !height) {
                        annotations.push({
                            x: new Date(bucket * 1000),
                            y: currentPrice,
                            text: `${currentPrice.toFixed(6)}`,
                            showarrow: true,
                            arrowhead: 2,
                            arrowsize: 1,
                            arrowwidth: 2,
                            arrowcolor: '#2196f3',
                            ax: 0,
                            ay: -30,
                            font: { size: 12, color: '#2196f3' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#2196f3',
                            borderwidth: 1
                        });
                    }
                } else {
                    renderChart([], []);
                    setIsLoading(false);
                    return;
                }
            } else if (interval === -1) {
                setShowSparseDataWarning(false);

                const allTimeData = trades
                    .filter((trade) => isFinite(trade.price))
                    .map((trade) => ({ time: trade.timestamp, value: trade.price }));

                processedData = processDataForChart(allTimeData);

                const currentPrice: any = price
                    ? (typeof price === 'bigint' ? Number(formatEther(price)) : price)
                    : null;

                if (currentPrice !== null) {
                    const maxPrice = processedData.length > 0 ? Math.max(...processedData.map(d => d.value)) : -Infinity;

                    if (processedData.length === 0 || currentPrice > maxPrice || currentPrice >= processedData[processedData.length - 1].value) {
                        const currentTime = Math.floor(Date.now() / 1000);
                        if (processedData.length > 0 && processedData[processedData.length - 1].time === currentTime) {
                            processedData[processedData.length - 1] = { time: currentTime, value: currentPrice };
                        } else {
                            processedData.push({ time: currentTime, value: currentPrice });
                        }
                    }
                }

                if (processedData.length === 0) {
                    renderChart([], []);
                    setIsLoading(false);
                    return;
                }

                // Create annotations for high, low, and current points
                if (!width && !height) {
                    const high = Math.max(...processedData.map(d => d.value));
                    const low = Math.min(...processedData.map(d => d.value));

                    const highPoints = processedData.filter(d => d.value === high);
                    const lowPoints = processedData.filter(d => d.value === low);
                    const highPoint = highPoints[highPoints.length - 1];
                    const lowPoint = lowPoints[lowPoints.length - 1];
                    const currentPoint = processedData[processedData.length - 1];

                    if (highPoint && currentPrice !== null && highPoint.value !== currentPrice) {
                        annotations.push({
                            x: new Date(highPoint.time * 1000),
                            y: high,
                            text: `${high.toFixed(4)}`,
                            showarrow: true,
                            arrowhead: 2,
                            arrowsize: 1,
                            arrowwidth: 2,
                            arrowcolor: '#26a69a',
                            ax: 0,
                            ay: -30,
                            font: { size: 12, color: '#26a69a' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#26a69a',
                            borderwidth: 1
                        });
                    }

                    if (lowPoint && currentPrice !== null) {
                        annotations.push({
                            x: new Date(lowPoint.time * 1000),
                            y: low,
                            text: `${low.toFixed(4)}`,
                            showarrow: true,
                            arrowhead: 2,
                            arrowsize: 1,
                            arrowwidth: 2,
                            arrowcolor: '#ef5350',
                            ax: 0,
                            ay: 30,
                            font: { size: 12, color: '#ef5350' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#ef5350',
                            borderwidth: 1
                        });
                    }

                    if (currentPoint && currentPrice !== null) {
                        annotations.push({
                            x: new Date(currentPoint.time * 1000),
                            y: currentPrice,
                            text: `${currentPrice.toFixed(4)}`,
                            showarrow: true,
                            arrowhead: 2,
                            arrowsize: 1,
                            arrowwidth: 2,
                            arrowcolor: '#2196f3',
                            ax: 0,
                            ay: -30,
                            font: { size: 12, color: '#2196f3' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#2196f3',
                            borderwidth: 1
                        });
                    }
                }
            } else {
                const buckets = aggregateBuckets(trades, interval);

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
                    }));

                if (price && data.length > 0) {
                    const now = Math.floor(Date.now() / 1000);
                    const currentBucket = Math.floor(now / interval) * interval;
                    const currentPrice = typeof price === 'bigint' ? Number(formatEther(price)) : price;
                    data.push({ time: currentBucket, value: currentPrice });
                }

                processedData = processDataForChart(data);

                if (processedData.length === 0) {
                    renderChart([], []);
                    setIsLoading(false);
                    return;
                }

                // Create annotations for bucketed data
                if (!width && !height) {
                    const high = Math.max(...processedData.map(d => d.value));
                    const low = Math.min(...processedData.map(d => d.value));
                    const highPoint = processedData.find(d => d.value === high);
                    const lowPoint = processedData.find(d => d.value === low);
                    const currentPoint = processedData[processedData.length - 1];
                    const currentPrice: any = price ? (typeof price === 'bigint' ? Number(formatEther(price)) : price) : null;

                    if (highPoint && currentPrice !== high) {
                        annotations.push({
                            x: new Date(highPoint.time * 1000),
                            y: high,
                            text: `${high.toFixed(4)}`,
                            showarrow: false,
                            font: { size: 12, color: '#26a69a' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#26a69a',
                            borderwidth: 1
                        });
                    }

                    if (lowPoint && currentPrice !== low) {
                        annotations.push({
                            x: new Date(lowPoint.time * 1000),
                            y: low,
                            text: `${low.toFixed(4)}`,
                            showarrow: false,
                            font: { size: 12, color: '#ef5350' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#ef5350',
                            borderwidth: 1
                        });
                    }

                    if (currentPoint && currentPrice) {
                        annotations.push({
                            x: new Date(currentPoint.time * 1000),
                            y: currentPrice,
                            text: `${currentPrice.toFixed(4)}`,
                            showarrow: false,
                            font: { size: 12, color: '#2196f3' },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#2196f3',
                            borderwidth: 1
                        });
                    }
                }
            }

            renderChart(processedData, annotations);
            setIsLoading(false);
        },
        [price, width, height]
    );

    const renderChart = (data: { time: number; value: number }[], annotations: any[]) => {
        if (!chartContainerRef.current) return;

        const x = data.map(d => new Date(d.time * 1000));
        const y = data.map(d => d.value);
        const traces = [
            {
                x: x,
                y: y,
                type: 'scatter',
                mode: 'lines',
                name: 'Price',
                line: {
                    color: lineColor,
                    width: 2
                },
                // fill: 'tonexty',
                // fillcolor: 'rgba(33, 150, 243, 0.1)',
                // hovertemplate: 'Price: %{y:.6f}<br>Time: %{x}<extra></extra>'
            },
            {
                x: x,
                y: new Array(x.length).fill(0),
                type: 'scatter',
                mode: 'lines',
                name: 'Base',
                line: { color: 'rgba(0,0,0,0)', width: 0 },
                showlegend: false,
                hoverinfo: 'skip'
            }
        ];

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#171717' },
            margin: { l: 50, r: 50, t: 20, b: 50 },
            xaxis: {
                showgrid: false,
                showline: false,
                zeroline: false,
                visible: !width && !height,
                tickformat: '%H:%M',
                color: '#1c67a8'
            },
            yaxis: {
                showgrid: false,
                showline: false,
                zeroline: false,
                visible: !width && !height,
                tickformat: '.6f',
                color: '#1c67a8',
            },
            showlegend: false,
            annotations: annotations,
            hovermode: 'closest'
        };

        const config = {
            displayModeBar: false,
            responsive: false,
            scrollZoom: false,
            doubleClick: false,
            showTips: false,
            displaylogo: false,
            staticPlot: true
        };

        Plotly.newPlot(chartContainerRef.current, traces, layout, config);
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        setIsChartInitialized(true);
        updateChartData(trades, selectedInterval);

        if (coin?.tokenId) {
            setTrades(coin.tokenId.toString(), [...trades]);
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                Plotly.Plots.resize(chartContainerRef.current);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartContainerRef.current) {
                Plotly.purge(chartContainerRef.current);
            }
        };
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

        const filteredByTime = allIntervals.filter(
            (interval) => interval.value === -1 || timeSpan >= interval.minTimeSpan * 2
        );

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
                        {!width && !height && (
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
                        )}
                    </div>
                    {width && height ? (
                        <div
                            ref={chartContainerRef}
                            className={styles.chartContainerNS}
                            style={{ width: width, height: height }}
                        />
                    ) : (
                        <div ref={chartContainerRef} className={styles.chartContainer} />
                    )}

                    {!width && !height && (
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
                    )}

                    {!width && !height && showSparseDataWarning && (
                        <div className={styles.sparseDataWarning}>
                            <p>Data too sparse for selected interval. Showing all trades.</p>
                        </div>
                    )}

                    {!width && !height && !isLoading && trades.length === 0 && (
                        <div className={styles.noDataOverlay}>
                            <p>No trades available for this token.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}