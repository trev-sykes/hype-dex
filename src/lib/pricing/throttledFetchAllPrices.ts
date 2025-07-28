import pThrottle from 'p-throttle';
import { fetchTokenPrice } from '../../hooks/useContractRead';
export const throttledFetchPrice = pThrottle({ limit: 10, interval: 5000 })(fetchTokenPrice);