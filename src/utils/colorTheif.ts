import ColorThief from 'colorthief';

export const getDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // must be before src!
        img.src = imageUrl;

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const [r, g, b] = colorThief.getColor(img);
                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch (error) {
                console.warn('ColorThief failed', error);
                resolve('#999'); // fallback
            }
        };

        img.onerror = (e) => {
            console.warn('Image failed to load', imageUrl, e);
            resolve('#999'); // fallback
        };
    });
};
