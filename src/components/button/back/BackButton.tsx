import { MoveLeftIcon } from "lucide-react";
import styles from "./BackButton.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export const BackButton: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [canGoBack, setCanGoBack] = useState(false);

    useEffect(() => {
        // Check if the navigation history has an entry before this
        // Simple heuristic: if current location key is not the first one
        if (window.history.length > 2) {
            setCanGoBack(true);
        }
    }, [location]);

    const handleBack = () => {
        if (canGoBack) {
            navigate(-1);
        } else {
            navigate("/dashboard/"); // fallback route (e.g., home page)
        }
    };

    return (
        <div className={styles.exploreButtonContainer}>
            <div className={styles.exploreButton} onClick={handleBack}>
                <MoveLeftIcon /><span>Back</span>
            </div>
        </div>
    );
};
