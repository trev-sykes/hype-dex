import styles from "./Form.module.css";
import { useState } from "react";

interface Coin {
    name: string;
    symbol: string;
    description: string;
    tokenUri: string | null;
    initialSupply: number | null;
}

const Form: React.FC = () => {
    const [coin, setCoin] = useState<Coin>({
        name: '',
        symbol: '',
        description: '',
        tokenUri: null,
        initialSupply: null
    });

    // Generic handler to update coin fields dynamically
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setCoin(prev => ({
            ...prev,
            [name]: name === 'initialSupply' ? (value === '' ? null : Number(value)) : value
        }));
    };

    // Example submit handler (expand as needed)
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you could add logic to send data to blockchain or backend
    };

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formHeader}>
                    <h1>Create A Coin</h1>
                    <p>Creating a coin requires an ETH deposit for price action</p>
                </div>

                <div className={styles.formBody}>
                    <div className={styles.formSection}>
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={coin.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="symbol">Symbol</label>
                        <input
                            id="symbol"
                            name="symbol"
                            type="text"
                            value={coin.symbol}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={coin.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="tokenUri">Token URI</label>
                        <input
                            id="tokenUri"
                            name="tokenUri"
                            type="text"
                            value={coin.tokenUri || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="initialSupply">Initial Supply</label>
                        <input
                            id="initialSupply"
                            name="initialSupply"
                            type="number"
                            min="0"
                            value={coin.initialSupply === null ? '' : coin.initialSupply}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit">Create Coin</button>
                </div>
            </form>
        </div>
    );
};

export default Form;
