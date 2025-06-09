// utils/ipfs.ts
export const convertToIpfsUrl = (ipfsUri: string): string => {
    if (!ipfsUri) return '';
    return ipfsUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
};
