import confetti from "canvas-confetti";
function toggleEffectClass(className: any) {
    const root = document.querySelector('main'); // Or whatever your main container is
    if (!root) return;

    root.classList.add(className);
    setTimeout(() => root.classList.remove(className), 450);
}
export function createConfetti() {
    const base = {
        spread: 60,
        startVelocity: 25,
        ticks: 400,
        gravity: 0.9,
        zIndex: 999,
        colors: ['#26a69a', '#60a5fa', '#facc15', '#ef5350', '#1c67a8', '#fff8dc'],
    };

    const totalBursts = 6;
    const intervalTime = 350;
    const sources = 10; // Number of emitters across the width

    setTimeout(() => {
        let count = 0;

        const interval = setInterval(() => {
            const intensity = (count + 1) / totalBursts;

            for (let i = 0; i < sources; i++) {
                confetti({
                    ...base,
                    origin: { x: i / (sources - 1), y: 0 },
                    particleCount: Math.floor(5 + 10 * intensity),
                    spread: 40 + 20 * intensity,
                    scalar: 0.9 + 0.2 * intensity,
                    startVelocity: 20 + 15 * intensity,
                });
            }

            count++;
            if (count >= totalBursts) {
                clearInterval(interval);

                setTimeout(() => {
                    for (let i = 0; i < sources; i++) {
                        confetti({
                            ...base,
                            origin: { x: i / (sources - 1), y: 0 },
                            particleCount: 1,
                            spread: 80,
                            scalar: 1.2,
                            startVelocity: 95,
                        });
                    }
                }, 800);
            }
        }, intervalTime);
    }, 400);
}


export function mintConfetti() {
    toggleEffectClass('mint-effect');
}

export function burnConfetti() {
    toggleEffectClass('burn-effect');
}
