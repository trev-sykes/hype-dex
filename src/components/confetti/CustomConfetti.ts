import confetti from "canvas-confetti";

export function createConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 1000 };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
            clearInterval(interval);
            return;
        }

        const particleCount = 40 + Math.floor(Math.random() * 30);

        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.2, 0.4), y: randomInRange(0.3, 0.5) },
            colors: ['#4ade80', '#60a5fa', '#a78bfa', '#f472b6'],
            shapes: ['circle', 'square'],
            scalar: randomInRange(0.8, 1.1),
            gravity: 0.3,
        });

        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.6, 0.8), y: randomInRange(0.3, 0.5) },
            colors: ['#facc15', '#fb923c', '#f472b6'],
            shapes: ['circle', 'square'],
            scalar: randomInRange(0.8, 1.2),
            gravity: 0.3,
        });

    }, 250);
}


export function mintConfetti() {
    const base = {
        spread: 90,
        startVelocity: 25,
        ticks: 200,
        gravity: 0.25,
        scalar: 1.1,
        zIndex: 999,
        colors: ['#facc15', '#fde68a', '#fff8dc'],
    };

    // Gold coin burst
    confetti({
        ...base,
        particleCount: 120,
        angle: 90,
        origin: { x: 0.5, y: 1.1 },
        shapes: ['square'],
        scalar: 1.4,
    });

    // Light shimmer from top
    confetti({
        ...base,
        particleCount: 80,
        angle: 270,
        spread: 120,
        startVelocity: 20,
        origin: { x: 0.5, y: -0.1 },
        gravity: 0.5,
        shapes: ['circle'],
        scalar: 0.7,
    });

    // Sparkle twinkles drifting in from sides
    setTimeout(() => {
        ['left', 'right'].forEach((side) => {
            confetti({
                ...base,
                particleCount: 40,
                angle: side === 'left' ? 60 : 120,
                origin: { x: side === 'left' ? 0.05 : 0.95, y: 0.9 },
                scalar: 0.6,
                colors: ['#fff8dc', '#fcd34d'],
                shapes: ['circle'],
            });
        });
    }, 400);
}
export function burnConfetti() {
    const duration = 2200;
    const animationEnd = Date.now() + duration;
    const fireColors = ['#ff0000', '#ff4500', '#ffb703', '#ffe169'];
    const ashColors = ['#333', '#555', '#777', '#999'];

    const defaults = {
        startVelocity: 40,
        spread: 320,
        ticks: 80,
        gravity: 0.4,
        scalar: 1.2,
        zIndex: 999,
    };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
            clearInterval(interval);
            return;
        }

        const particleCount = 30 + Math.floor(Math.random() * 20);

        confetti({
            ...defaults,
            particleCount,
            origin: {
                x: Math.random(),
                y: Math.random() * 0.4,
            },
            colors: fireColors,
            angle: randomInRange(70, 110),
            gravity: randomInRange(0.3, 0.6),
            scalar: randomInRange(1, 1.5),
            shapes: ['circle', 'square'],
        });
    }, 160);

    // Ash drift
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            confetti({
                particleCount: 20,
                angle: randomInRange(180, 360),
                spread: 80,
                startVelocity: 15,
                origin: { x: Math.random(), y: -0.2 },
                colors: ashColors,
                scalar: 0.5,
                ticks: 250,
                gravity: 0.1,
                shapes: ['circle'],
                zIndex: 998,
            });
        }, i * 250);
    }
}
