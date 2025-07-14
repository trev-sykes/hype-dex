import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatUnits } from "ethers";
import styles from "./TokenCard.module.css";
import { useCoinStore } from "../../store/coinStore";
import { useWitdh } from "../../hooks/useWidth";
import { useTokenActivity } from "../../hooks/useTokenActivity";
import TransparentLineChart from "../chart/TransparentCandlestickChart"; // ✅ Adjust import as needed

interface TokenCardProps {
    coin: any;
    number: number;
    onLoad: (index: number, success: boolean) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ coin, number, onLoad }) => {
    const navigate = useNavigate();
    const { setCoin } = useCoinStore();
    const width = useWitdh();

    const trades = useTokenActivity(coin?.tokenId?.toString());

    // Preload image
    useEffect(() => {
        if (!coin.imageUrl) return;

        const img = new Image();
        img.src = coin.imageUrl;
        img.onload = () => onLoad(number, true);
        img.onerror = () => onLoad(number, false);
    }, [coin.imageUrl, number, onLoad]);

    return (
        <Link
            to={`/dashboard/explore/${coin.tokenId}`}
            className={styles.coinCard}
            onClick={() => {
                setCoin(coin);
                navigate(`/dashboard/explore/${coin.tokenId}/trade`);
            }}
        >
            {/* Image */}
            <div className={styles.imageContainer}>
                {coin.imageUrl ? (
                    <img
                        loading="lazy"
                        src={coin.imageUrl}
                        alt={coin.name || "Coin"}
                        className={styles.coinImage}
                    />
                ) : (
                    <div className={styles.imageFallback}>{coin.symbol}</div>
                )}
            </div>

            {/* Name and Symbol stacked */}
            <div className={styles.tokenDetails}>
                {width > 640 && <h4>{coin.name.length > 7 ? `${coin.name.slice(0, 7)}..` : coin.name}</h4>}
                <div className={styles.symbolText}>
                    {coin.symbol.length < 8 ? coin.symbol : coin.symbol.slice(0, 8)}
                </div>
            </div>

            {/* Chart */}
            <div className={styles.chartContainer}>
                <TransparentLineChart coin={coin} trades={trades} height={50} width={"100%"} />
            </div>

            {/* Price */}
            <div className={styles.priceSection}>
                <p>
                    <span className={styles.priceValue}>
                        {coin.price != null ? formatUnits(coin.price) : "N/A"}
                    </span>
                </p>
            </div>
        </Link>

    );
};
