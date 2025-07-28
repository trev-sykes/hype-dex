import pThrottle from 'p-throttle';
import { fetchTokenPrice } from '../../hooks/useContractRead';
export const throttledFetchPrice = pThrottle({ limit: 1, interval: 5000 })(fetchTokenPrice);