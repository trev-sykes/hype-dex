export const filterTokensForEnrichment = (allFetchedTokens: any, currentTokens: any, nowSeconds: any, newTokenAgeLimit: any) => {
    // 1. Build sets for logic
    const existingIds = new Set(currentTokens.map((t: any) => t.tokenId.toString()));
    const newTokens = allFetchedTokens.filter((t: any) => !existingIds.has(t.tokenId.toString()));
    const incompleteTokens = currentTokens.filter((t: any) => {
        const isMissing = (v: any) => v === null || v === undefined;
        // const hasSamePrice = t.price && t.basePrice && t.price.toString() === t.basePrice.toString();
        // const priceEqualsBase = t.price && t.basePrice && t.price.toString() === t.basePrice.toString();
        // Check if image url is missing from token
        const isImageMissing = !t.imageUrl;

        const tokenAgeSeconds = nowSeconds - parseInt(t.blockTimestamp ?? '0', 10);
        const isNew = tokenAgeSeconds < newTokenAgeLimit;
        const needsEnrichment = (
            isImageMissing && isNew ||
            !t.description ||
            isMissing(t.basePrice) ||
            isMissing(t.price)
        );
        // if (needsEnrichment) {
        //     console.log(`Token ${t.name} needs enrichment:`, {
        //         missingImage: !t.imageUrl,
        //         missingDescription: !t.description,
        //         missingBasePrice: isMissing(t.basePrice),
        //         missingPrice: isMissing(t.price),
        //         priceEqualsBase: priceEqualsBase
        //     });
        // }

        return (
            needsEnrichment
        );
    });
    // 🔍 Log incomplete tokens found in store
    if (incompleteTokens.length > 0) {
    }
    // 2. Merge new tokens and incomplete ones (avoiding duplicates)
    const tokensToEnrichMap = new Map<string, any>();

    newTokens.forEach((t: any) => tokensToEnrichMap.set(t.tokenId.toString(), t));
    incompleteTokens.forEach((t: any) => {
        if (!tokensToEnrichMap.has(t.tokenId.toString())) {
            tokensToEnrichMap.set(t.tokenId.toString(), t);
        }
    });

    const tokensToEnrich = Array.from(tokensToEnrichMap.values());
    // 🧠 Log which tokens we will enrich
    if (tokensToEnrich.length > 0) {
    } else {
        return currentTokens;
    }
    return tokensToEnrich.length === 0 ? currentTokens : tokensToEnrich;
}