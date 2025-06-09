declare module 'canvas-confetti' {
    interface ConfettiOptions {
        particleCount?: number;
        angle?: number;
        spread?: number;
        startVelocity?: number;
        decay?: number;
        gravity?: number;
        drift?: number;
        ticks?: number;
        origin?: {
            x?: number;
            y?: number;
        };
        colors?: string[];
        shapes?: ('square' | 'circle')[];
        scalar?: number;
        zIndex?: number;
    }

    function confetti(options?: ConfettiOptions): void;
    export default confetti;
}
