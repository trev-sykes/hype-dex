import styles from './ConnectWallet.module.css'
import { useConnect, useAccount } from 'wagmi'
import { MoveLeftIcon } from 'lucide-react'

export function ConnectWallet({ handleIsHidden }: any) {
    const { connectors, connect, error } = useConnect()
    const { status } = useAccount()

    // Don't show if connected or reconnecting
    if (status === 'connected') return null

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Select Wallet</h2>
                    <MoveLeftIcon
                        onClick={() => handleIsHidden(false)}
                        className={styles.closeBtn}
                    />
                </div>

                {connectors.map((connector) => (
                    <button
                        key={connector.id}
                        onClick={() => {
                            connect({ connector });
                            handleIsHidden(false);
                        }}
                        className={styles.walletButton}
                    >
                        {connector.name}
                    </button>
                ))}

                {error && <div className={styles.error}>{error.message}</div>}
            </div>
        </div>
    )
}
