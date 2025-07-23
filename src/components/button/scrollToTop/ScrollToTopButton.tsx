import styles from "./ScrollToTopButton.module.css";
import { scrollToTop } from '../../../utils/scroll';
import { useEffect, useState } from "react";

export const ScrollToTopButton: React.FC = () => {
    const [showScrollButton, setShowScrollButton] = useState(false);
    useEffect(() => {
        const onScroll = () => {
            setShowScrollButton(window.scrollY > 200);

            // Infinite scroll: load next page if near bottom (300px)
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 300
            ) {
                // if (hasNextPage && !loading) {
                //     fetchNextPage();
                // }
            }
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (
        <button
            className={`${styles.scrollToTopButton} ${showScrollButton ? styles.show : ''}`}
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            ↑
        </button>
    )
}