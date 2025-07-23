import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronUp, ChevronDown, Home, User, Compass, Plus } from 'lucide-react';
import Logo from '../logo/Logo';
import { Profile } from '../profile/Profile';
import styles from './DashboardNav.module.css';

const DashboardNav = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsCollapsed(true);
    }, [location]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const navItems = [
        { to: "/dashboard/", label: "Home", icon: Home, end: true },
        { to: "/dashboard/account/", label: "Account", icon: User, end: true },
        { to: "/dashboard/explore", label: "Explore", icon: Compass },
        { to: "/dashboard/create", label: "Create", icon: Plus }
    ];

    return (
        <nav
            className={`${styles.desktopNav} ${isCollapsed ? styles.collapsed : ''}`}
        >
            <button
                className={styles.toggleButton}
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
                {isCollapsed ? <ChevronUp size={isMobile ? 18 : 20} /> : <ChevronDown size={isMobile ? 18 : 20} />}
            </button>
            <div className={`${styles.navContent} ${isCollapsed ? styles.hidden : ''}`}>
                <div className={styles.logoContainer}>
                    <Logo background={true} size={isMobile ? '3rem' : '5rem'} />
                </div>
                <div className={styles.navLinks}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                        >
                            <item.icon size={isMobile ? 16 : 18} />
                            <span className={styles.navLabel}>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
                <div className={styles.profileContainer}>
                    <Profile />
                </div>
            </div>
        </nav>
    );
};

export default DashboardNav;