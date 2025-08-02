import { formatEther } from "viem";

export const parsePrice = (rawPrice: string | bigint | number): number => {
    if (typeof rawPrice === 'number') {
        return rawPrice;
    }

    try {
        const priceBigInt = BigInt(rawPrice);
        return parseFloat(formatEther(priceBigInt));
    } catch {
        console.warn("Invalid rawPrice:", rawPrice);
        return 0;
    }
};
