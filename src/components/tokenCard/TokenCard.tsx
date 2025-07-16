import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatUnits } from "ethers";
import styles from "./TokenCard.module.css";
import { useCoinStore } from "../../store/coinStore";
import { useWitdh } from "../../hooks/useWidth";
import { useTokenActivity } from "../../hooks/useTokenActivity";
import PlotlyLineChart from "../chart/PlotlyLineChart";
import { getDominantColor } from "../../utils/colorTheif";
// import TransparentLineChart from "../chart/TransparentCandlestickChart";

interface TokenCardProps {
    coin: any;
    number: number;
    onLoad: (index: number, success: boolean) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ coin, number, onLoad }) => {
    const navigate = useNavigate();
    const { setCoin } = useCoinStore();
    const width = useWitdh();
    const [tokenColor, setTokenColor] = useState('#1c67a8');

    const trades = useTokenActivity(coin?.tokenId?.toString());
    // Preload image
    useEffect(() => {
        if (!coin.imageUrl) return;

        const img = new Image();
        img.src = coin.imageUrl;

        img.onload = async () => {
            try {
                const color = await getDominantColor(img.src);
                console.log("COLOR:::", color);
                setTokenColor(color);
                onLoad(number, true);
            } catch (error) {
                console.error("Error getting dominant color:", error);
                onLoad(number, false);
            }
        };

        img.onerror = () => onLoad(number, false);
    }, [coin.imageUrl, number, onLoad]);

    useEffect(() => {
        console.log("Token color:", tokenColor); // Add this
    }, [tokenColor]);
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
                {/* <TransparentLineChart coin={coin} trades={trades} height={50} width={"100%"} /> */}
                <PlotlyLineChart coin={coin} trades={trades} height={150} width={'100%'} lineColor={tokenColor} />
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
