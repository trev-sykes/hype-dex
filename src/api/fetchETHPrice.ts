import axios from 'axios';

export const fetchETHPrice = async (): Promise<number | null> => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        return response.data.ethereum.usd; // Return just the ETH price in USD
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        return null; // Return null in case of an error, or you can throw an error if you prefer
    }
};
