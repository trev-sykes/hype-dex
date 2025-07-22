import { formatEther } from "viem";

export const parsePrice = (rawPrice: string | bigint | number): number => {
    if (typeof rawPrice === 'string') {
        return parseFloat(formatEther(BigInt(rawPrice)));
    }
    if (typeof rawPrice === 'bigint') {
        return parseFloat(formatEther(rawPrice));
    }
    return rawPrice;
};