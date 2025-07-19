// MobileKeypad.tsx
import React from 'react';
import styles from './DecimalKeypad.module.css';

type Props = {
    value: string;
    onChange: (val: string) => void;
    onClose: () => void;
};

const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', '←'
];

export const MobileKeypad: React.FC<Props> = ({ value, onChange, onClose }) => {
    const handlePress = (key: string) => {
        if (key === '←') {
            onChange(value.slice(0, -1));
        } else {
            // Prevent multiple decimals or leading zeros
            if (key === '.' && value.includes('.')) return;
            if (key === '.' && value === '') return onChange('0.');
            onChange(value + key);
        }
    };

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.sheet} onClick={e => e.stopPropagation()}>
                <div className={styles.display}>{value || '0'}</div>
                <div className={styles.keypad}>
                    {keys.map((key, i) => (
                        <button key={i} onClick={() => handlePress(key)} className={styles.key}>
                            {key}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className={styles.done}>Done</button>
            </div>
        </div>
    );
};
