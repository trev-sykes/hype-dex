import { MoveLeftIcon } from "lucide-react"
import styles from "./ExploreButton.module.css"
import { Link } from "react-router-dom"

export const ExploreButton: React.FC = () => {

    return (
        <div className={styles.exploreButtonContainer}>
            <Link className={styles.exploreButton} to={"/dashboard/explore"}>
                <MoveLeftIcon />
                <span>Back to Explore</span>
            </Link>
        </div>
    )
}