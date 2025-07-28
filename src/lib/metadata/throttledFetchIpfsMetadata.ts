import pThrottle from "p-throttle";
import { fetchIpfsMetadata } from "../../utils/ipfs";
export const throttledFetchIpfsMetadata = pThrottle({ limit: 10, interval: 5000 })(fetchIpfsMetadata);