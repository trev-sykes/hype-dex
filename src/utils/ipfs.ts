const IPFS_GATEWAYS = [
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.io/ipfs/",
];


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
export async function fetchIpfsMetadata(uri: string): Promise<any | null> {
    const cid = uri.replace(/^ipfs:\/\//, "").replace("ipfs/", "");
    const cached = localStorage.getItem(`ipfs_${cid}`);
    if (cached) {
        try {
            console.log('[ipfs cid locale storage]', JSON.parse(cached))
            return JSON.parse(cached);
        } catch (err: any) {
            console.error('Error parsing cached uri data', err.message)
        }
    }

    for (const gateway of IPFS_GATEWAYS) {
        try {
            const res = await fetch(`${gateway}${cid}`, { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                localStorage.setItem(`ipfs_${cid}`, JSON.stringify(json));
                return json;
            }
        } catch (err: any) {
            console.error('Error getting metadata form URI ', err.message);
        }
    }
    return null;
}
