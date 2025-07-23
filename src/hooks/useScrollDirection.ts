// hooks/useScrollDirection.ts
import { useEffect, useState, useRef } from "react";

export function useScrollDirection(delay = 150) {
    const [scrollingUp, setScrollingUp] = useState(false);
    const lastScrollY = useRef(0);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleScroll = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const currentY = window.scrollY;
                setScrollingUp(currentY < lastScrollY.current);
                lastScrollY.current = currentY;
            }, delay);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(timeoutId);
        };
    }, [delay]);

    return scrollingUp;
}
