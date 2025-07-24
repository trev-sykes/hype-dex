import React from 'react';
import styles from './DecimalKeypad.module.css';

type Props = {
    value: string;
    onChange: (val: string) => void;
    allowDecimals?: boolean; // control decimal input
    maxValue?: number;       // max allowed input
    restrict?: boolean;      // restrict inputs exceeding max
};

const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', '←'
];
export const MobileKeypad: React.FC<Props> = ({ value, onChange, allowDecimals = true, maxValue, restrict }) => {
    const handlePress = (key: string) => {
        let newValue = value;

        if (key === '←') {
            onChange(value.slice(0, -1));
            return;
        }

        if (key === '.') {
            if (!allowDecimals || value.includes('.')) return;
            newValue = value === '' ? '0.' : value + '.';
        } else {
            if (key === '0') {
                if (value === '' || value === '0') return;
            }

            if (value === '0' && key !== '.') {
                newValue = key;
            } else {
                newValue = value + key;
            }
        }

        if (restrict && maxValue !== undefined) {
            const isNumeric = /^-?\d*(\.\d+)?$/.test(newValue);
            const parsed = parseFloat(newValue);

            if (isNumeric && !isNaN(parsed) && parsed > maxValue) {
                return;
            }
        }


        onChange(newValue);
    };

    return (
        <div className={styles.persistentKeypad}>
            <div className={styles.keypad}>
                {keys.map((key, i) => (
                    <button
                        key={i}
                        onClick={() => handlePress(key)}
                        className={`${styles.key} ${key === '.' && !allowDecimals ? styles.disabled : ''}`}
                        disabled={key === '.' && !allowDecimals}
                    >
                        {key}
                    </button>
                ))}
            </div>
        </div>
    );
};
