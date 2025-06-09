import { useEffect, useRef, useState, useCallback } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import styles from './CandlestickChart.module.css';
import { useCoinStore } from '../../store/coinStore';
import { useWitdh } from '../../hooks/useWidth';
import { FadeLoader } from 'react-spinners';
import { formatEther } from 'ethers';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useTradeStore } from '../../store/tradeStore';
import { useTokenData } from '../../hooks/useTokenData';

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
    interval?: number; // in seconds (default 1 hour)
    tokenId?: any;
}

export default function CandlestickChart({ trades, interval = 3600 }: Props) {
    const { coin } = useCoinStore();
    const { balance }: any = useTokenBalance();
    const viewportWidth = useWitdh();
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const [selectedInterval, setSelectedInterval] = useState(interval);
    const [isChartInitialized, setIsChartInitialized] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showLine, setShowLine] = useState(true);
    const [showCandles, setShowCandles] = useState(true);
    const { setTrades } = useTradeStore();
    const { price } = useTokenData();

    useEffect(() => {
        if (candleSeriesRef.current) {
            candleSeriesRef.current.applyOptions({ visible: showCandles });
        }
        if (lineSeriesRef.current) {
            lineSeriesRef.current.applyOptions({ visible: showLine });
        }
    }, [showCandles, showLine]);

    const debounce = (func: () => void, wait: number) => {
        let timeout: NodeJS.Timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(func, wait);
        };
    };
    // Replace the current updateChartData function with this improved version
    // Replace the current updateChartData function with this improved version

    const updateChartData = useCallback(
        (trades: Trade[], interval: number) => {
            setIsLoading(true);
            console.log(`[updateChartData] Processing ${trades.length} trades for interval: ${interval}s`);

            if (!candleSeriesRef.current || !lineSeriesRef.current) {
                setIsLoading(false);
                return;
            }

            if (!trades || trades.length === 0) {
                // If we have current price but no trades, create a minimal chart
                if (price) {
                    const currentTime: any = Math.floor(Date.now() / 1000);
                    const bucket: any = Math.floor(currentTime / interval) * interval;
                    // Convert price to number - handle both BigInt and number types
                    const currentPrice: any = typeof price === 'bigint' ? Number(formatEther(price)) : price;
                    const currentCandle: any = [{
                        time: bucket,
                        open: currentPrice,
                        high: currentPrice,
                        low: currentPrice,
                        close: currentPrice
                    }];
                    candleSeriesRef.current.setData(currentCandle);
                    lineSeriesRef.current.setData([{ time: bucket, value: currentPrice }]);
                } else {
                    candleSeriesRef.current.setData([]);
                    lineSeriesRef.current.setData([]);
                }
                setIsLoading(false);
                return;
            }

            // Add epoch price at the same time bucket as the first real trade
            const firstTradeTime = trades[0]?.timestamp || Math.floor(Date.now() / 1000);
            const epochTrade = {
                tokenId: 1n,
                amount: 1n,
                cost: 1n,
                price: 0.001,
                timestamp: firstTradeTime - 1,
                type: 'mint' as const
            };
            const allTrades = [epochTrade, ...trades];
            const ohlcMap: Record<number, {
                open: number;
                high: number;
                low: number;
                close: number;
                firstTimestamp: number;
                lastTimestamp: number
            }> = {};

            // Process historical trades
            allTrades.forEach(trade => {
                if (!isFinite(trade.price)) return;

                const bucket = Math.floor(trade.timestamp / interval) * interval;

                if (!ohlcMap[bucket]) {
                    ohlcMap[bucket] = {
                        open: trade.price,
                        high: trade.price,
                        low: trade.price,
                        close: trade.price,
                        firstTimestamp: trade.timestamp,
                        lastTimestamp: trade.timestamp,
                    };
                } else {
                    ohlcMap[bucket].high = Math.max(ohlcMap[bucket].high, trade.price);
                    ohlcMap[bucket].low = Math.min(ohlcMap[bucket].low, trade.price);

                    if (trade.timestamp < ohlcMap[bucket].firstTimestamp) {
                        ohlcMap[bucket].open = trade.price;
                        ohlcMap[bucket].firstTimestamp = trade.timestamp;
                    }

                    if (trade.timestamp > ohlcMap[bucket].lastTimestamp) {
                        ohlcMap[bucket].close = trade.price;
                        ohlcMap[bucket].lastTimestamp = trade.timestamp;
                    }
                }
            });

            let candles: any = Object.entries(ohlcMap)
                .map(([bucket, candle]) => ({
                    time: Number(bucket),
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close
                }))
                .sort((a, b) => a.time - b.time);

            // Handle current price integration
            if (price && candles.length > 0) {
                const currentTime = Math.floor(Date.now() / 1000);
                const currentBucket = Math.floor(currentTime / interval) * interval;
                const lastCandle = candles[candles.length - 1];

                // Convert price to number - handle both BigInt and number types
                const currentPrice: any = typeof price === 'bigint' ? Number(formatEther(price)) : price;

                if (lastCandle.time === currentBucket) {
                    // Update the existing last candle with current price
                    lastCandle.high = Math.max(lastCandle.high, currentPrice);
                    lastCandle.low = Math.min(lastCandle.low, currentPrice);
                    lastCandle.close = currentPrice; // Always update close to current price
                } else {
                    // Create a new candle for the current time period
                    candles.push({
                        time: currentBucket,
                        open: lastCandle.close, // Open with the previous close
                        high: Math.max(lastCandle.close, currentPrice),
                        low: Math.min(lastCandle.close, currentPrice),
                        close: currentPrice
                    });
                }
            }

            console.log(`[updateChartData] Final candles:`, candles.length);

            candleSeriesRef.current.setData(candles);
            lineSeriesRef.current.setData(candles.map((c: any) => ({ time: c.time, value: c.close })));
            chartRef.current?.timeScale().fitContent();
            setIsLoading(false);
        },
        [price]
    );
    useEffect(() => {
        if (typeof window === 'undefined' || !chartContainerRef.current) {
            console.warn('[useEffect] No window or container ref');
            return;
        }

        console.log('[useEffect] Initializing chart');

        let resizeObserver: ResizeObserver | null = null;

        import('lightweight-charts')
            .then(({ createChart }) => {
                const container = chartContainerRef.current!;
                const chart = createChart(container, {
                    width: container.clientWidth || 600,
                    height: 500,
                    layout: {
                        background: { color: '#000' },
                        textColor: '#fff',
                    },
                    grid: {
                        vertLines: { visible: false },
                        horzLines: { visible: false },
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: true,
                        borderColor: '#555',
                        barSpacing: 10,
                    },
                    rightPriceScale: {
                        autoScale: true,
                        scaleMargins: { top: 0.2, bottom: 0.2 },
                    },
                });

                const candleSeries = chart.addCandlestickSeries({
                    upColor: '#26a69a', // Green for mint (buy)
                    downColor: '#ef5350', // Red for burn (sell)
                    borderVisible: true,
                    borderUpColor: '#26a69f',
                    borderDownColor: '#ef535a',
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                    priceLineVisible: true,
                    priceFormat: {
                        type: 'price',
                        precision: 6, // Increased for small price variations
                        minMove: 0.000001,
                    },
                });

                const lineSeries = chart.addLineSeries({
                    color: '#2196f3',
                    lineWidth: 2,
                    priceLineVisible: false,
                    priceFormat: {
                        type: 'price',
                        precision: 6,
                        minMove: 0.000001,
                    },
                });

                chartRef.current = chart;
                candleSeriesRef.current = candleSeries;
                lineSeriesRef.current = lineSeries;

                console.log('[useEffect] Chart initialized');

                chart.subscribeCrosshairMove((param: any) => {
                    const container = chartContainerRef.current!;
                    const existingTooltips = container.querySelectorAll('.custom-tooltip');
                    existingTooltips.forEach((tooltip) => tooltip.remove());

                    if (param.time && param.point && param.seriesPrices) {
                        const candlePrice = param.seriesPrices.get(candleSeries);
                        if (candlePrice) {
                            const tooltip = document.createElement('div');
                            tooltip.className = 'custom-tooltip';
                            tooltip.style.position = 'absolute';
                            tooltip.style.background = 'rgba(0,0,0,0.8)';
                            tooltip.style.color = 'white';
                            tooltip.style.padding = '5px';
                            tooltip.style.borderRadius = '3px';
                            tooltip.style.zIndex = '1000';
                            tooltip.innerHTML = `
                                Time: ${new Date(param.time * 1000).toLocaleString()}<br/>
                                Price: ${candlePrice.close.toFixed(6)} ETH
                            `;
                            container.appendChild(tooltip);
                            tooltip.style.left = `${param.point.x + 10}px`;
                            tooltip.style.top = `${param.point.y + 10}px`;
                        }
                    }
                });

                const debouncedResize = debounce(() => {
                    if (chartContainerRef.current) {
                        chart.applyOptions({
                            width: chartContainerRef.current.clientWidth,
                            height: chartContainerRef.current.clientHeight,
                        });

                    }
                }, 200);

                resizeObserver = new ResizeObserver(debouncedResize);
                resizeObserver.observe(container);

                chart.timeScale().fitContent();
                setIsChartInitialized(true);
                updateChartData(trades, selectedInterval);
                if (coin?.tokenId) {
                    setTrades(coin.tokenId.toString(), [...trades]);
                }


            })
            .catch((err) => {
                console.error('[useEffect] Failed to load lightweight-charts:', err);
            });

        return () => {
            console.log('[useEffect] Cleaning up chart');
            if (resizeObserver && chartContainerRef.current) {
                resizeObserver.unobserve(chartContainerRef.current);
            }
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                candleSeriesRef.current = null;
                lineSeriesRef.current = null;
            }
            setIsChartInitialized(false);
        };
    }, []);

    useEffect(() => {
        if (!isChartInitialized) {
            console.log('[useEffect] Chart not initialized, skipping update');
            return;
        }
        console.log(`[useEffect] Updating chart with ${trades.length} trades, interval ${selectedInterval}`);
        updateChartData(trades, selectedInterval);
    }, [trades, selectedInterval, updateChartData, isChartInitialized]);

    const intervalOptions = [
        { label: '1m', value: 60 },
        { label: '5m', value: 300 },
        { label: '15m', value: 900 },
        { label: '1h', value: 3600 },
        { label: '1d', value: 86400 },
    ];

    return (
        <div className={styles.container}>
            {!isLoading && (
                <>
                    <div className={styles.controls}>
                        <div className={styles.assetInfo}>
                            <img src={coin?.imageUrl} alt={coin?.name} className={styles.image} />
                            <span className={styles.symbol}>${coin?.symbol}</span>
                        </div>

                        <div className={styles.intervalControl}>
                            {viewportWidth > 374 && (
                                <label htmlFor="interval-select" className={styles.label}>Interval</label>
                            )}
                            <select
                                id="interval-select"
                                value={selectedInterval}
                                onChange={(e) => setSelectedInterval(Number(e.target.value))}
                                className={styles.select}
                            >
                                {intervalOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.seriesToggles}>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={showLine}
                                    onChange={() => {
                                        if (!showCandles) return; // Prevent both from being unchecked
                                        setShowLine((prev) => !prev);
                                    }}
                                />
                                <svg width="40" height="10">
                                    <line x1="0" y1="5" x2="40" y2="5" stroke="#2196f3" strokeWidth="2" />
                                </svg>
                            </label>

                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={showCandles}
                                    onChange={() => {
                                        if (!showLine) return; // Prevent both from being unchecked
                                        setShowCandles((prev) => !prev);
                                    }}
                                />
                                <svg width="40" height="20">
                                    <rect x="10" y="5" width="8" height="10" fill="#26a69a" stroke="#26a69a" />
                                    <line x1="14" y1="0" x2="14" y2="20" stroke="#26a69a" strokeWidth="2" />
                                </svg>
                            </label>
                            <div className={styles.priceContainer}>
                                {!isLoading ? (
                                    <>
                                        <span className={styles.priceLabel}>Price:</span>
                                        <span className={styles.priceValue}>
                                            {price ? `${typeof (price) == 'bigint' ? formatEther(price) : price} ETH` : '—'}
                                        </span>
                                        <p className={styles.priceLabel}>
                                            Your Balance: <span className={styles.priceValue}>{balance} {coin?.symbol}</span>
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <FadeLoader />
                                    </>
                                )}

                            </div>
                        </div>
                    </div>
                    <div
                        ref={chartContainerRef}
                        className={styles.chartContainer}
                    />
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