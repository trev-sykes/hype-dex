import { MoveLeftIcon } from "lucide-react";
import styles from "./BackButton.module.css";
import { useNavigate } from "react-router-dom";


export const BackButton: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className={styles.exploreButtonContainer}>
            <div
                className={styles.exploreButton}
                onClick={() => {
                    navigate(-1)
                }} // ← go back one page in history
            >
                <MoveLeftIcon /><span>Back</span>
            </div>
        </div>
    );
};
