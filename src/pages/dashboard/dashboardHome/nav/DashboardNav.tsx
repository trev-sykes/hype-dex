import { NavLink } from 'react-router-dom'
import styles from './DashboardNav.module.css'

const DashboardNav = () => {
    return (
        <nav className={styles.nav}>
            <NavLink to="/dashboard" className={styles.navLink}>Home</NavLink>
            {/* <NavLink to="/dashboard/swap" className={styles.navLink}>Swap</NavLink> */}
            <NavLink to="/dashboard/explore" className={styles.navLink}>Explore</NavLink>
            {/* <NavLink to="/dashboard/deploy" className={styles.navLink}>Deploy</NavLink> */}
        </nav>
    )
}

export default DashboardNav
