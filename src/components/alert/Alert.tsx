import { useAlertStore } from '../../store/alertStore';
import { X } from 'lucide-react';
import styles from './Alert.module.css';

const Alert = () => {
    const { alerts, clearAlert } = useAlertStore();

    return (
        <div className={styles.alertContainer}>
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`${styles.alert} ${styles[alert.type]}`}
                >
                    <span className={`${styles.message} ${alert.type == 'pending' ? styles.pendingMessage : ''}`}>{alert.message}</span>
                    {alert.type != 'persist' && (
                        <button
                            className={styles.close}
                            onClick={() => clearAlert(alert.id)}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Alert;
