import styles from "./Logo.module.css";
import logo from "../../assets/logo.png"
import logoNoBg from "../../assets/logo-no-bg.png"


interface LogoProps {
    background?: boolean;
    size?: number | string;

}

const Logo: React.FC<LogoProps> = ({ background, size = '10rem' }) => {

    const computedsize = typeof size === 'number' ? `${size}px` : size;
    const src = background ? logoNoBg : logo
    return (
        <img
            className={styles.logo}
            style={{ width: computedsize, height: computedsize }}
            src={src}
            alt="logo"
        />
    );
};

export default Logo;
