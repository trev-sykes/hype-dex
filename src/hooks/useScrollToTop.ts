import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();

    useEffect(() => {
        if (navigationType === "PUSH" || navigationType === "POP") {
            // delay scroll to let page render
            const timer = setTimeout(() => {
                window.scrollTo(0, 0);
            }, 5); // 50ms delay, tweak if needed

            return () => clearTimeout(timer);
        }
    }, [pathname, navigationType]);

    return null;
}
