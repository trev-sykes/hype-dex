import type { Token } from "../types/token";

export function sanitizeTokenForStorage(token: Token): Record<string, any> {
    const sanitized: Record<string, any> = { ...token };

    const bigintKeys: (keyof Token)[] = [
        'tokenId',
        'basePrice',
        'slope',
        'reserve',
        'totalSupply',
    ];

    for (const key of bigintKeys) {
        const value = sanitized[key];
        if (typeof value === 'bigint') {
            sanitized[key] = value.toString();
        }
    }

    // Handle price separately
    const price = sanitized.price;
    if (typeof price === 'bigint') {
        sanitized.price = price.toString(); // unformatted BigInt
    } else if (typeof price === 'number') {
        sanitized.price = price; // already formatted, keep it as-is
    } else if (typeof price === 'string') {
        // Try to detect unformatted raw string (e.g., "1300000000000000") and convert
        const parsed = Number(price);
        if (!isNaN(parsed) && parsed > 1e9) {
            sanitized.price = parsed / 1e18; // assume 18 decimals
        }
    }

    return sanitized;
}

export function sanitizeTokensForStorage(tokens: Token[]) {
    return tokens.map(sanitizeTokenForStorage);
}

export function toStringOrNull(value: unknown): string | null {
    if (typeof value === 'bigint' || typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'string') {
        return value; // assume already sanitized
    }
    return null;
}

