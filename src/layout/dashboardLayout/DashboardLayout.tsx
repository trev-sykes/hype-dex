import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardNav from '../../nav/DashboardNav';
import styles from './DashboardLayout.module.css';
import Alert from '../../components/alert/Alert';
import { useOnline } from '../../hooks/useOnline';
import { useAlertStore } from '../../store/alertStore';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../../wallet/ConnectWallet';
import { useEnforceChain } from '../../hooks/useForceChainId';

const DashboardLayout = () => {
    const [isConnectorOpen, setIsConnectorOpen] = useState(true);
    const isOnline = useOnline();
    const account = useAccount();
    useEnforceChain(11155111);
    useEffect(() => {
        const alertStore = useAlertStore.getState();

        if (isOnline) {
            // 1. Clear 'persist' alerts
            const persistAlerts = alertStore.alerts.filter(
                (alert) => alert.type === 'persist'
            );
            persistAlerts.forEach((alert) => {
                alertStore.clearAlert(alert.id);
            });

            // 2. Show brief 'network restored' alert
            alertStore.setAlert({
                action: null,
                type: 'network',
                message: '✅ Connected',
            });
        } else {
            // Only show if not already displayed
            const hasPersist = alertStore.alerts.some(
                (alert) => alert.type === 'persist'
            );
            if (!hasPersist) {
                alertStore.setAlert({
                    action: 'persist',
                    type: 'persist',
                    message: '⚠️ No connection',
                });
            }
        }
    }, [isOnline]);

    return (
        <div className={styles.wrapper}>
            <main className={styles.main}>
                <Alert />
                {!account.isConnected && isConnectorOpen && (
                    <ConnectWallet handleIsHidden={setIsConnectorOpen} />
                )}
                <Outlet />
            </main>
            <DashboardNav />
        </div>
    );
};

export default DashboardLayout;
