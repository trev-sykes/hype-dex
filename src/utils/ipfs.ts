

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
const IPFS_GATEWAYS = [
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://dweb.link/ipfs/',
];

function extractCid(uri: string): string {
    return uri.replace(/^ipfs:\/\/ipfs\//, '')
        .replace(/^ipfs:\/\//, '')
        .replace(/^ipfs\//, '')
        .replace(/^https?:\/\/[^/]+\/ipfs\//, '');
}

function fetchWithTimeout(resource: string, options = {}, timeout = 5000) {
    return new Promise<Response>((resolve, reject) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        fetch(resource, { ...options, signal: controller.signal })
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(id));
    });
}

export async function fetchIpfsMetadata(uri: string): Promise<any | null> {
    const cid = extractCid(uri);
    const cacheKey = `ipfs_${cid}`;

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.image) return parsed;
        } catch (err: any) {
            console.warn('[ipfs cache parse error]', err.message);
        }
    }

    for (const gateway of IPFS_GATEWAYS) {
        try {
            const res = await fetchWithTimeout(`${gateway}${cid}`, { cache: "no-store" }, 5000);
            if (res.ok) {
                const json = await res.json();
                if (json && json.image) {
                    localStorage.setItem(cacheKey, JSON.stringify(json));
                }
                return json;
            }
        } catch (err: any) {
            console.warn(`[ipfs fetch error from ${gateway}]`, err.message);
        }
    }

    return null;
}

