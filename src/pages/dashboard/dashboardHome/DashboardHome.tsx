
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
                        Launch ETH-backed tokens with dynamic pricing and total transparency.
                        No code, no complexity — just pure, decentralized hype.
                    </p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.subtitle}>How It Works</h2>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>💎</div>
                            <div className={styles.featureContent}>
                                <strong>Price by Demand</strong> — Token price increases as more are minted.
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🔒</div>
                            <div className={styles.featureContent}>
                                <strong>Backed by ETH</strong> — Each token is fully backed by Ether in reserve.
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🔄</div>
                            <div className={styles.featureContent}>
                                <strong>Mint & Burn</strong> — Buy with ETH. Burn to withdraw ETH.
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🎨</div>
                            <div className={styles.featureContent}>
                                <strong>Custom Identity</strong> — Name it, symbol it, brand it your way.
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.cta}>
                    <h3 className={styles.ctaTitle}>Ready to mint your first token?</h3>
                    <div className={styles.ctaButtons}>
                        <Link to="/dashboard/create" className={`${styles.ctaButton} ${styles.primary}`}>
                            Launch a Token
                        </Link>
                        <Link to="/dashboard/explore" className={`${styles.ctaButton} ${styles.secondary}`}>
                            Explore Tokens
                        </Link>
                    </div>
                    <Logo background={true} size={'15rem'} />
                </div>
            </div>
        </div>
    );
};
