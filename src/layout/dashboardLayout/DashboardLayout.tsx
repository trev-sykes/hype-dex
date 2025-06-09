// DashboardLayout.jsx
import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DashboardNav from '../../nav/DashboardNav'
import styles from './DashboardLayout.module.css'
import Alert from '../../components/alert/Alert'
import { useOnline } from '../../hooks/useOnline'
import { useAlertStore } from '../../store/alertStore'
import { useAccount, useConnect } from 'wagmi'
import { ConnectWallet } from '../../wallet/ConnectWallet'

const DashboardLayout = () => {
    const [isConnectorOpen, setIsConnectorOpen] = useState(true);
    const isOnline = useOnline();
    const { setAlert } = useAlertStore();
    const { status } = useConnect();
    const account = useAccount();
    useEffect(() => {
        console.log('Connection Status', account.status);
        console.log("Current Status", status);
    }, [account])

    useEffect(() => {
        if (isOnline) return;
        else
            setAlert({
                action: 'persist',
                type: 'persist',
                message: '⚠️ No connection'
            })
    }, [isOnline]);
    return (
        <div className={styles.wrapper}>
            <main className={styles.main}>
                <Alert />
                {!account.isConnected && isConnectorOpen && <ConnectWallet handleIsHidden={setIsConnectorOpen} />}

                <Outlet />
            </main>
            <DashboardNav />
        </div>
    )
}

export default DashboardLayout
