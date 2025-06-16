export function convertToIpfsUrl(uri: string, gateway = 'https://ipfs.io/ipfs/') {
    if (!uri) return null;

    let hash = uri;

    // Remove prefixes
    if (uri.startsWith('ipfs://')) {
        hash = uri.slice(7);
    }
    if (hash.startsWith('ipfs/')) {
        hash = hash.slice(5);
    }

    const fullUrl = `${gateway}${hash}`;
    return fullUrl;
}
