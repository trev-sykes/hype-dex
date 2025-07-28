

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
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
];

function extractCid(uri: string): string {
    return uri.replace(/^ipfs:\/\/ipfs\//, '')
        .replace(/^ipfs:\/\//, '')
        .replace(/^ipfs\//, '')
        .replace(/^https?:\/\/[^/]+\/ipfs\//, '');
}

function fetchWithTimeout(resource: string, options = {}, timeout = 15000) {
    return new Promise<Response>((resolve, reject) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        fetch(resource, { ...options, signal: controller.signal })
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(id));
    });
}

async function fetchWithBackoff(url: string, retries = 3, delay = 1000, timeout = 5000): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetchWithTimeout(url, { cache: "no-store" }, timeout);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res;
        } catch (err: any) {
            if (attempt === retries - 1) throw err; // last attempt, throw error
            console.warn(`[fetchWithBackoff] Attempt ${attempt + 1} failed for ${url}:`, err.message);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; // exponential backoff
        }
    }
    throw new Error('Unreachable code');
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
        const url = `${gateway}${cid}`;
        try {
            const res = await fetchWithBackoff(url);
            const json = await res.json();
            if (json && json.image) {
                localStorage.setItem(cacheKey, JSON.stringify(json));
                return json;
            }
        } catch (err: any) {
            console.warn(`[ipfs fetch error from ${gateway}]`, err.message);
        }
    }

    return null;
}


