import { create } from 'zustand';
import { burnConfetti, createConfetti, mintConfetti } from '../components/confetti/CustomConfetti';
export type AlertType = 'success' | 'error' | 'info' | 'pending' | 'persist';
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
    setAlert: ({ action, message, type, timeout = 20000 }) => {
        const id = crypto.randomUUID();
        const newAlert: Alert = { action, id, message, type, timeout };

        set((state) => {
            let updatedAlerts = [...state.alerts];
            if (type === 'success') {
                if (action == 'create')
                    createConfetti()
                if (action == 'mint')
                    mintConfetti()
                if (action == 'burn')
                    burnConfetti()
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
            }, timeout);
        }
    },

    clearAlert: (id) =>
        set((state) => ({
            alerts: state.alerts.filter((a) => a.id !== id),
        })),
}));
