// import { convertToIpfsUrl, fetchIpfsMetadata } from '../../utils/ipfs';
// import { getDominantColor } from '../../utils/colorTheif';
// import pThrottle from 'p-throttle';
// import type { Token } from '../../types/token';

// const throttledFetchIpfsMetadata = pThrottle({ limit: 1, interval: 5000 })(fetchIpfsMetadata);

// export const fetchStaticMetadata = async (token: Token): Promise<Token> => {
//     try {
//         const ipfsUrl = convertToIpfsUrl(token.tokenURI);
//         const metadata = await throttledFetchIpfsMetadata(ipfsUrl);
//         const color = await getDominantColor(metadata.image);
//         return {
//             ...token,
//             metadata,
//             color,
//         };
//     } catch (error) {
//         console.error('[fetchStaticMetadata]', error);
//         return token; // fallback if metadata fails
//     }
// };
