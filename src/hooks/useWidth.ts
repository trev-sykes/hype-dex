import { useEffect, useState } from "react";

export const useWidth = () => {
    const [width, setWith] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => {
            setWith(window.innerWidth);
        }
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize)
    }, [])
    return width;
}