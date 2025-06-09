// src/hooks/useBurnEstimation.ts
import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../services/ETHBackedTokenMinter';
import { ERC6909ABI, ERC6909Address } from '../services/ERC6909Metadata';
import { parseEther } from 'ethers';

interface BurnEstimation {
    ethToReceive: number;
    burnAmount: number;
}
interface MintEstimation {
    tokensToMint: number;
    totalCostETH: number;
    refundETH: number;
}

export const useBurnEstimation = (tokenId: bigint | string | undefined, burnInput: string) => {
    const [estimation, setEstimation] = useState<BurnEstimation | null>(null);

    const { data: tokenConfig }: any = useReadContract({
        address: ETHBackedTokenMinterAddress,
        abi: ETHBackedTokenMinterABI,
        functionName: 'tokenConfigs',
        args: [tokenId],
    });

    const { data: totalSupply }: any = useReadContract({
        address: ERC6909Address,
        abi: ERC6909ABI,
        functionName: 'totalSupply',
        args: [tokenId],
    });

    useEffect(() => {
        if (!tokenId || !burnInput || parseFloat(burnInput) <= 0 || !tokenConfig || !totalSupply) {
            setEstimation(null);
            return;
        }

        try {
            const burnAmount = parseInt(burnInput);
            const basePrice = BigInt(tokenConfig[0]);
            const slope = BigInt(tokenConfig[1]);
            const supply = BigInt(totalSupply);

            if (BigInt(burnAmount) > supply) {
                setEstimation(null);
                return;
            }

            let refund = BigInt(0);
            for (let i = 0; i < burnAmount; i++) {
                const unitPrice = basePrice + slope * (supply - BigInt(1) - BigInt(i));
                refund += unitPrice;
            }

            setEstimation({
                ethToReceive: Number(formatEther(refund)),
                burnAmount: burnAmount,
            });

        } catch (error) {
            console.error('Burn estimation error:', error);
            setEstimation(null);
        }
    }, [tokenId, burnInput, tokenConfig, totalSupply]);

    return estimation;
};


export const useMintEstimation = (tokenId: bigint | string | undefined, ethInput: string) => {
    const [estimation, setEstimation] = useState<MintEstimation | null>(null);

    // Read token configuration (basePrice and slope)
    const { data: tokenConfig }: any = useReadContract({
        address: ETHBackedTokenMinterAddress,
        abi: ETHBackedTokenMinterABI,
        functionName: 'tokenConfigs',
        args: [tokenId],
    });

    // Read total supply
    const { data: totalSupply }: any = useReadContract({
        address: ERC6909Address,
        abi: ERC6909ABI,
        functionName: 'totalSupply',
        args: [tokenId],
    });

    useEffect(() => {
        if (!tokenId || !ethInput || parseFloat(ethInput) <= 0 || !tokenConfig || !totalSupply) {
            setEstimation(null);
            return;
        }

        try {
            const ethAmount = parseEther(ethInput); // Convert ETH input to wei
            const basePrice = BigInt(tokenConfig[0]); // basePrice from tokenConfigs
            const slope = BigInt(tokenConfig[1]); // slope from tokenConfigs
            const supply = BigInt(totalSupply); // Current total supply

            let amountToMint = 0;
            let cost = BigInt(0);

            // Simulate minting up to 1000 tokens (same as contract)
            for (let i = 1; i <= 1000; i++) {
                const unitPrice = basePrice + slope * (supply + BigInt(i - 1));
                if (cost + unitPrice > ethAmount) break;
                cost += unitPrice;
                amountToMint++;
            }

            if (amountToMint === 0) {
                setEstimation(null);
                return;
            }

            const refund = ethAmount - cost;
            setEstimation({
                tokensToMint: amountToMint,
                totalCostETH: Number(formatEther(cost)),
                refundETH: Number(formatEther(refund)),
            });
        } catch (error) {
            console.error('Estimation error:', error);
            setEstimation(null);
        }
    }, [tokenId, ethInput, tokenConfig, totalSupply]);

    return estimation;
};