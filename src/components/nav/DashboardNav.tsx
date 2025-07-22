import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import styles from './DashboardNav.module.css';
import { Profile } from '../profile/Profile';
import Logo from '../logo/Logo';

const DashboardNav: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const location = useLocation();
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    useEffect(() => {
        setIsCollapsed(true);
    }, [location])
    return (
        <nav className={`${styles.nav} ${isCollapsed ? styles.collapsed : ''}`}>
            <button
                className={styles.toggleButton}
                onClick={toggleCollapse}
                aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
            >
                {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <div className={`${styles.navContent} ${isCollapsed ? styles.hidden : ''}`}>
                <Logo background={true} size={'4rem'} />
                <div className={styles.navLinks}>
                    <NavLink to="/dashboard/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>Home</NavLink>
                    <NavLink to="/dashboard/account/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>Account</NavLink>
                    <NavLink to="/dashboard/explore" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>Explore</NavLink>
                    <NavLink to="/dashboard/create" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>Create</NavLink>
                </div>
                <div className={styles.profileContainer}>
                    <Profile />
                </div>
            </div>
        </nav>
    );
};

export default DashboardNav;