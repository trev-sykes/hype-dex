import styles from "./Profile.module.css";
import { useAccount, useEnsName } from 'wagmi'
import { useState } from 'react'
import { BounceLoader } from "react-spinners";

export function Profile() {
    const { address, } = useAccount()
    const { data: ensName, status: ensStatus } = useEnsName({ address })
    const [hovered, setHovered] = useState(false)
    if (!address) return <div className={styles.profileContainer}>Not connected</div>

    const formattedAddress = `0x...${address.slice(-5)}`
    const ensLoading = ensStatus === 'pending'

    return (
        <div className={styles.profileContainer}>
            <div className={styles.section}>
                <span className={styles.label}></span>
                <span
                    className={styles.address}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {ensLoading && !address ? <BounceLoader /> : ensName ? ensName : ""}
                    {ensName ? " (" : ""}
                    {hovered ? address : formattedAddress}
                    {ensName ? ")" : ""}
                </span>
            </div>
        </div>
    )
}
