import confetti from "canvas-confetti";
function toggleEffectClass(className: any) {
    const root = document.querySelector('main'); // Or whatever your main container is
    if (!root) return;

    root.classList.add(className);
    setTimeout(() => root.classList.remove(className), 450);
}

export function createConfetti() {
    const base = {
        spread: 100,
        startVelocity: 30,
        ticks: 150,
        gravity: 0.3,
        scalar: 1.0,
        zIndex: 999,
        colors: ['#4ade80', '#60a5fa', '#facc15', '#fff8dc'], // Unified, vibrant palette
    };

    // Central burst
    confetti({
        ...base,
        particleCount: 80,
        angle: 90,
        origin: { x: 0.5, y: 0.8 },
        shapes: ['circle', 'square'],
        scalar: 1.2,
    });

    // Subtle side sparkles
    setTimeout(() => {
        ['left', 'right'].forEach((side) => {
            confetti({
                ...base,
                particleCount: 30,
                angle: side === 'left' ? 60 : 120,
                origin: { x: side === 'left' ? 0.1 : 0.9, y: 0.7 },
                scalar: 0.8,
                shapes: ['circle'],
            });
        });
    }, 300);
}
export function mintConfetti() {
    toggleEffectClass('mint-effect');
}

export function burnConfetti() {
    toggleEffectClass('burn-effect');
}
