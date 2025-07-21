// DashboardHome.jsx
import { Link } from 'react-router-dom';
import styles from './DashboardHome.module.css';
import Logo from '../../../components/logo/Logo';

export const DashboardHome = () => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>

                <div className={styles.hero}>
                    <h1 className={styles.title}>What's the Hype?</h1>
                    <p className={styles.description}>
                        Create your own digital coins that grow in value as demand increases.
                        No coding needed — just choose your name and launch.
                    </p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.subtitle}>How It Works</h2>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>💎</div>
                            <div className={styles.featureContent}>
                                <strong>Price Goes Up</strong> — Your coin becomes more valuable as more people buy it.
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🔒</div>
                            <div className={styles.featureContent}>
                                <strong>Secure & Safe</strong> — Every coin is backed by real cryptocurrency reserves.
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🔄</div>
                            <div className={styles.featureContent}>
                                <strong>Buy & Sell</strong> — Purchase coins or cash them out anytime.
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🎨</div>
                            <div className={styles.featureContent}>
                                <strong>Make It Yours</strong> — Choose the name, symbol, and look of your coin.
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.cta}>
                    <h3 className={styles.ctaTitle}>Ready to create your first coin?</h3>
                    <div className={styles.ctaButtons}>
                        <Link to="/dashboard/create" className={`${styles.ctaButton} ${styles.primary}`}>
                            Create a Coin
                        </Link>
                        <Link to="/dashboard/explore" className={`${styles.ctaButton} ${styles.secondary}`}>
                            Browse Coins
                        </Link>
                    </div>
                    <Logo background={true} size={'15rem'} />
                </div>
            </div>
        </div>
    );
};