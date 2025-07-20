import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
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


function rgbToHex(rgb: string): string | null {
    // Make sure input is like "rgb(156, 108, 84)"
    const result = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!result) return null;
    const r = parseInt(result[1], 10);
    const g = parseInt(result[2], 10);
    const b = parseInt(result[3], 10);

    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}
// Add this helper function inside your component or import it
const hexToRgba = (hex: any, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
// New helper function to validate color based on luminance
function getValidColor(color: string, defaultColor: string = '#1c67a8'): string {
    // Convert RGB to hex if necessary
    const hexColor = color.startsWith('rgb') ? rgbToHex(color) : color;
    if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
        return defaultColor;
    }

    // Extract RGB values from hex
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;

    // Linearize RGB values (sRGB gamma correction)
    const linearize = (value: number) => value; // Simplified for sRGB, no need for full gamma correction here

    const R = linearize(r);
    const G = linearize(g);
    const B = linearize(b);

    // Calculate relative luminance (W3C formula)
    const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

    // Define thresholds: too dark (< 0.2) or too light (> 0.8)
    const minLuminance = 0.25;
    const maxLuminance = 0.75;

    if (luminance < minLuminance || luminance > maxLuminance) {
        return defaultColor;
    }

    return hexColor;
}



export default function TransparentLineChart({ coin, trades, interval = 3600, width, height, lineColor = '#1c67a8' }: Props) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
    const [selectedInterval, setSelectedInterval] = useState(interval);
    const [isChartInitialized, setIsChartInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { setTrades } = useTradeStore();
    const { price } = useTokenPriceData();
    const [hexColor, setHexColor] = useState('');
    const [showSparseDataWarning, setShowSparseDataWarning] = useState(false);
    useEffect(() => {
        const c = getValidColor(lineColor)
        setHexColor(c);
    }, []);
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
                    areaSeriesRef.current?.setData(processedData);


                    // Add marker for current price
                    if (!width && !height) {
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
                    }

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

                // Filter trades and map to {time, value}
                const allTimeData = trades
                    .filter((trade) => isFinite(trade.price))
                    .map((trade) => ({ time: trade.timestamp, value: trade.price }));

                // Process data: unique timestamps and sorted
                let processedData: any = processDataForChart(allTimeData);

                const currentPrice: any = price
                    ? (typeof price === 'bigint' ? Number(formatEther(price)) : price)
                    : null;

                if (currentPrice !== null) {
                    // Check if current price is newer than last point or higher than max price
                    const maxPrice = processedData.length > 0 ? Math.max(...processedData.map((d: any) => d.value)) : -Infinity;

                    // If current price is more recent or higher than any historical data, add/update it
                    if (processedData.length === 0 || currentPrice > maxPrice || currentPrice >= processedData[processedData.length - 1].value) {
                        if (processedData.length > 0 && processedData[processedData.length - 1].time === Math.floor(Date.now() / 1000)) {
                            // Replace last point if same timestamp (to avoid duplicates)
                            processedData[processedData.length - 1] = {
                                time: Math.floor(Date.now() / 1000),
                                value: currentPrice,
                            };
                        } else {
                            // Otherwise, append current price as new point with current time
                            processedData.push({
                                time: Math.floor(Date.now() / 1000),
                                value: currentPrice,
                            });
                        }
                    }
                }

                if (processedData.length === 0) {
                    lineSeriesRef.current.setData([]);
                    lineSeriesRef.current.setMarkers([]);
                    setIsLoading(false);
                    return;
                }

                // Find high and low
                const high = Math.max(...processedData.map((d: any) => d.value));
                const low = Math.min(...processedData.map((d: any) => d.value));

                // Find high and low points
                const highPoints = processedData.filter((d: any) => d.value === high);
                const lowPoints = processedData.filter((d: any) => d.value === low);
                // Take latest high and low points for marker placement
                const highPoint = highPoints[highPoints.length - 1];
                const lowPoint = lowPoints[lowPoints.length - 1];
                const currentPoint = processedData[processedData.length - 1];

                // Set chart data
                lineSeriesRef.current.setData(processedData);
                areaSeriesRef.current?.setData(processedData);

                // Setup markers
                const markers: any[] = [];

                if (!width && !height && highPoint && currentPrice !== null && highPoint !== currentPrice) {
                    markers.push({
                        time: highPoint.time,
                        position: 'aboveBar',
                        color: '#26a69a',
                        shape: 'arrowUp',
                        text: `${high.toFixed(4)}`,
                        size: 0, // visible size
                    });
                }

                if (!width && !height && lowPoint && currentPrice !== null) {
                    markers.push({
                        time: lowPoint.time,
                        position: 'belowBar',
                        color: '#ef5350',
                        shape: 'arrowDown',
                        text: `${low.toFixed(4)}`,
                        size: 0,
                    });
                }

                if (!width && !height && currentPoint && currentPrice !== null) {
                    markers.push({
                        time: currentPoint.time,
                        position: 'aboveBar',
                        color: '#2196f3',
                        shape: 'circle',
                        text: `${currentPrice.toFixed(4)}`,
                        size: 0,
                    });
                }

                // Sort markers by time ascending
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
            areaSeriesRef.current?.setData(processedData);


            // Set markers for high, low, and current price
            const markers: any[] = [];
            const currentPrice: any = price ? (typeof price === 'bigint' ? Number(formatEther(price)) : price) : null;

            if (!width && !height && highPoint && currentPrice !== high) {
                markers.push({
                    time: highPoint.time,
                    position: 'aboveBar',
                    color: '#26a69a',
                    shape: 'none',
                    text: `${high.toFixed(4)}`,
                    size: 0,
                });
            }

            if (!width && !height && lowPoint && currentPrice !== low) {
                markers.push({
                    time: lowPoint.time,
                    position: 'belowBar',
                    color: '#ef5350',
                    shape: 'none',
                    text: `${low.toFixed(4)}`,
                    size: 0,
                });
            }

            if (!width && !height && currentPoint && currentPrice) {
                markers.push({
                    time: currentPoint.time,
                    position: 'aboveBar',
                    color: '#2196f3',
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
        if (typeof window === 'undefined' || !chartContainerRef.current || !hexColor) return;
        const container = chartContainerRef.current;
        if (!container) return; // Extra safeguard

        import('lightweight-charts')
            .then(({ createChart }) => {
                if (!width && !height) {
                    const container = chartContainerRef.current!;
                    const chart = createChart(container, {
                        width: 50,
                        height: 400,
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
                            barSpacing: 1,
                            fixLeftEdge: true,
                            fixRightEdge: false,
                            minBarSpacing: 1,
                            rightOffset: 2,
                            lockVisibleTimeRangeOnResize: true,
                        },
                        rightPriceScale: {
                            visible: false,
                        },
                        handleScroll: false,
                        handleScale: false,
                    });

                    const lineSeries = chart.addLineSeries({
                        color: hexColor,
                        lineWidth: 1,
                        priceLineVisible: true,
                        priceFormat: {
                            type: 'price',
                            precision: 6,
                            minMove: 0.000001,
                        },
                    });
                    // 1. Add the filled Area Series (gradient fill)
                    const areaSeries = chart.addAreaSeries({
                        topColor: hexToRgba(hexColor || '#1c67a8', 0.4),     // Use dynamic color
                        bottomColor: hexToRgba(hexColor || '#1c67a8', 0.0),  // Use dynamic color
                        lineColor: hexColor ? hexColor : '#1c67a8',
                        lineWidth: 2,
                        priceLineVisible: false,
                        priceFormat: {
                            type: 'price',
                            precision: 6,
                            minMove: 0.000001,
                        },
                    });
                    chartRef.current = chart;
                    areaSeriesRef.current = areaSeries;
                    lineSeriesRef.current = lineSeries;

                    // const debouncedResize = debounce(() => {
                    //     if (chartContainerRef.current) {
                    //         chart.applyOptions({
                    //             width: chartContainerRef.current.clientWidth,
                    //             height: chartContainerRef.current.clientHeight,
                    //         });
                    //     }
                    // }, 200);

                    // const resizeObserver = new ResizeObserver(debouncedResize);
                    // resizeObserver.observe(container);

                    chart.timeScale().fitContent();
                    setIsChartInitialized(true);
                    updateChartData(trades, selectedInterval);

                    if (coin?.tokenId) {
                        setTrades(coin.tokenId.toString(), [...trades]);
                    }

                    return () => {
                        // resizeObserver.disconnect();
                        chart.remove();
                        chartRef.current = null;
                        lineSeriesRef.current = null;
                        setIsChartInitialized(false);
                    };
                } else {
                    const container = chartContainerRef.current!;
                    const chart = createChart(container, {
                        width: container.clientWidth,
                        height: 400,
                        layout: {
                            background: { color: 'transparent' },
                            textColor: '#171717',
                        },
                        grid: {
                            vertLines: { visible: false },
                            horzLines: { visible: false },
                        },
                        timeScale: {
                            visible: false,
                        },
                        rightPriceScale: {
                            visible: false,
                        },
                        handleScroll: false,
                        handleScale: false,
                    });

                    const lineSeries = chart.addLineSeries({
                        color: hexColor,
                        lineWidth: 1,
                        priceLineVisible: !width && !height ? true : false,
                        priceFormat: {
                            type: 'price',
                            precision: 6,
                            minMove: 0.000001,
                        },
                    });
                    // 1. Add the filled Area Series (gradient fill)
                    const areaSeries = chart.addAreaSeries({
                        topColor: hexToRgba(hexColor || '#1c67a8', 0.4),     // Use dynamic color
                        bottomColor: hexToRgba(hexColor || '#1c67a8', 0.0),  // Use dynamic color
                        lineColor: hexColor ? hexColor : '#1c67a8',
                        lineWidth: 2,
                        priceLineVisible: false,
                        priceFormat: {
                            type: 'price',
                            precision: 6,
                            minMove: 0.000001,
                        },
                    });
                    chartRef.current = chart;
                    areaSeriesRef.current = areaSeries;
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
                }
            })
            .catch((err) => console.error('Failed to load lightweight-charts:', err));
    }, [hexColor]);
    // Update series colors when hexColor changes
    useEffect(() => {
        if (lineSeriesRef.current && areaSeriesRef.current) {
            lineSeriesRef.current.applyOptions({
                color: hexColor,
            });
            areaSeriesRef.current.applyOptions({
                topColor: hexToRgba(hexColor || '#1c67a8', 0.4),
                bottomColor: hexToRgba(hexColor || '#1c67a8', 0.0),
                lineColor: hexColor ? hexColor : '#1c67a8',
            });
        }
    }, [hexColor]);

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
    const availableIntervals = useMemo(() => getAvailableIntervals(), [trades]);

    useEffect(() => {
        if (!isChartInitialized) return;

        const isSelectedAvailable = availableIntervals.some((i) => i.value === selectedInterval);

        if (!isSelectedAvailable) {
            const fallback = availableIntervals.find((i) => i.value === -1) || availableIntervals.slice(-1)[0];
            setSelectedInterval(fallback.value);
            return;
        }

        updateChartData(trades, selectedInterval);
    }, [trades, selectedInterval, updateChartData, isChartInitialized, availableIntervals]);

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
                        <div ref={chartContainerRef} className={styles.chartContainerNS} style={{ width: width, height: height }} />
                    ) :
                        (
                            <div ref={chartContainerRef} className={styles.chartContainer} />
                        )}

                    {!width && !height && <div className={styles.intervalButtonGroup}>
                        {intervalOptions.map((option) => (
                            <button
                                key={option.value}
                                className={`${styles.intervalButton} ${selectedInterval === option.value ? styles.active : ''}`}
                                onClick={() => setSelectedInterval(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>}

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