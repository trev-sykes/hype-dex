import { create } from 'zustand';
import { burnConfetti, createConfetti, mintConfetti } from '../components/confetti/CustomConfetti';
export type AlertType = 'success' | 'error' | 'info' | 'pending' | 'persist' | 'network';

export type ActionType = 'create' | 'mint' | 'burn' | 'persist';

export interface Alert {
    action: ActionType | null;
    id: string;
    message: string;
    type: AlertType;
    timeout?: number;
}

interface AlertStore {
    alerts: Alert[];
    setAlert: (alert: Omit<Alert, 'id'>) => void;
    clearAlert: (id: string) => void;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
    alerts: [],
    setAlert: ({ action, message, type, timeout }) => {
        const id = crypto.randomUUID();

        // Automatically set shorter timeout for network alerts
        const defaultTimeout =
            type === 'network' ? 3000 :
                type === 'persist' ? 3000 :
                    20000;

        const newAlert: Alert = {
            action,
            id,
            message,
            type,
            timeout: timeout ?? defaultTimeout,
        };

        set((state) => {
            let updatedAlerts = [...state.alerts];
            if (type === 'success') {
                if (action === 'create') createConfetti();
                if (action === 'mint') mintConfetti();
                if (action === 'burn') burnConfetti();
            }

            if ((type === 'success' || type === 'error') && state.alerts.length > 0) {
                const pendingAlert = state.alerts.find((a) => a.type === 'pending');
                if (pendingAlert) {
                    updatedAlerts = updatedAlerts.filter((a) => a.id !== pendingAlert.id);
                }
            }

            return {
                alerts: [...updatedAlerts, newAlert],
            };
        });

        if (type !== 'persist') {
            setTimeout(() => {
                get().clearAlert(id);
            }, newAlert.timeout);
        }
    }
    ,

    clearAlert: (id) =>
        set((state) => ({
            alerts: state.alerts.filter((a) => a.id !== id),
        })),
}));
