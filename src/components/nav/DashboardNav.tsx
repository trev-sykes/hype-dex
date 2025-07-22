import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronUp, ChevronDown, Home, User, Compass, Plus, Menu, X } from 'lucide-react';
import Logo from '../logo/Logo';
import styles from './DashboardNav.module.css';

const DashboardNav = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsCollapsed(true);
        setIsMobileMenuOpen(false);
    }, [location]);

    const navItems = [
        { to: "/dashboard/", label: "Home", icon: Home, end: true },
        { to: "/dashboard/account/", label: "Account", icon: User, end: true },
        { to: "/dashboard/explore", label: "Explore", icon: Compass },
        { to: "/dashboard/create", label: "Create", icon: Plus }
    ];

    return (
        <>
            {/* Desktop */}
            <nav className={styles.desktopNav}>
                <button className={styles.toggleButton} onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <div className={`${styles.navContent} ${isCollapsed ? styles.hidden : ''}`}>
                    <div className={styles.logoContainer}>
                        <Logo background={true} size={80} />
                    </div>
                    <div className={styles.navLinks}>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                    <div className={styles.profileContainer}>
                        <div className={styles.profilePlaceholder}>Profile</div>
                    </div>
                </div>
            </nav>

            {/* Mobile */}
            <nav className={styles.mobileNav}>
                <div className={styles.mobileNavHeader}>
                    <Logo background={true} size={50} />
                    <button
                        className={styles.mobileMenuButton}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <div className={`${styles.mobileOverlay} ${isMobileMenuOpen ? styles.open : ''}`}>
                    <div className={styles.mobileNavContent}>
                        <div className={styles.mobileNavLinks}>
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) => `${styles.mobileNavLink} ${isActive ? styles.active : ''}`}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                        <div className={styles.mobileProfileContainer}>
                            <div className={styles.profilePlaceholder}>Profile</div>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default DashboardNav;
