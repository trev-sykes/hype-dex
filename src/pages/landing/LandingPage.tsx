// LandingPage.jsx
import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'
import Logo from '../../components/logo/Logo'

const LandingPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.logoContainer}>
                    <Logo size={'8rem'} />
                </div>
                <div className={styles.textContent}>
                    <h1 className={styles.title}>Welcome to Hype</h1>
                    <p className={styles.tagline}>
                        Create your own digital coin that gets more valuable as more people want it.
                        Simple, secure, and built on proven technology.
                    </p>
                </div>
                <div className={styles.buttonContainer}>
                    <Link to="/dashboard/" className={styles.enterButtonLink}>
                        <button className={styles.enterButton}>
                            <span className={styles.buttonText}>Get Started</span>
                            <span className={styles.buttonArrow}>→</span>
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default LandingPage