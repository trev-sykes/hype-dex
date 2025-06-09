// LandingPage.jsx
import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'
import Logo from '../../components/logo/Logo'

const LandingPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.backgroundPattern}></div>
            </div>
            <div className={styles.content}>
                <div className={styles.logoContainer}>
                    <Logo width="8rem" height="8rem" />
                </div>
                <div className={styles.textContent}>
                    <h1 className={styles.title}>Welcome to Hype</h1>
                    <p className={styles.tagline}>
                        Launch your own ETH-backed coin with dynamic pricing that grows with demand.
                        No gatekeepers, no fluff — just pure token power.
                    </p>
                </div>
                <div className={styles.buttonContainer}>
                    <Link to="/dashboard/home" className={styles.enterButtonLink}>
                        <button className={styles.enterButton}>
                            <span className={styles.buttonText}>Enter Dashboard</span>
                            <span className={styles.buttonArrow}>→</span>
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default LandingPage