import ColorThief from 'colorthief';
import { useTokenStore } from '../store/allTokensStore';

export const getDominantColor = async (imageUrl: string): Promise<string> => {
    const { tokens, updateToken } = useTokenStore.getState();

    const matchingToken = tokens.find((t) => t.imageUrl === imageUrl);

    if (matchingToken?.dominantColor) {
        return matchingToken.dominantColor;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const [r, g, b] = colorThief.getColor(img);
                const color = `rgb(${r}, ${g}, ${b})`;

                // Cache it in the store
                if (matchingToken?.tokenId) {
                    updateToken(matchingToken.tokenId, { dominantColor: color });
                }

                resolve(color);
            } catch (error) {
                console.warn('ColorThief failed', error);
                resolve('#999');
            }
        };

        img.onerror = (e) => {
            console.warn('Image failed to load', imageUrl, e);
            resolve('#999');
        };

        img.src = imageUrl;
    });
};
