import { useEffect, useRef, useState } from "react";
import { ETHBackedTokenMinterAddress, ETHBackedTokenMinterABI } from "../../../services/ETHBackedTokenMinter";
import styles from "./CreateTokenForm.module.css";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import { pinImageToPinata, pinJsonToPinata } from "../../../services/Pinata";
import { useOnline } from "../../../hooks/useOnline";
import { WifiOffIcon } from "lucide-react";
import { useAlertStore } from "../../../store/alertStore";
import { Link } from "react-router-dom";
import Logo from '../../../components/logo/Logo'


const CreateTokenForm = () => {
    const isOnline = useOnline();
    const { address } = useAccount()
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [description, setDescription] = useState("");
    const [basePrice] = useState("0.001");
    const [slope] = useState("0.0001");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [successPage, setSuccessPage] = useState(false);
    const [imageBuffer, setImageBuffer] = useState<any>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [uploadError, setUploadError] = useState<string | null>(null);
    const { setAlert } = useAlertStore();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageBuffer(event.target?.result as ArrayBuffer);
            };
            reader.readAsArrayBuffer(file);
            handleFile(file);
        }
    };


    const handleFile = (file: File) => {
        setImageFile(file);
        setUploadError(null); // Clear any previous errors when a new file is selected

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        console.log("Drag over detected", e.dataTransfer.types); // Debug log
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files?.length) {
            const file = files[0];
            handleFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageBuffer(event.target?.result as ArrayBuffer);
            };
            reader.onerror = (error) => {
                console.error("FileReader error:", error);
                setUploadError("Failed to read the dropped file");
            };
            reader.readAsArrayBuffer(file);
        } else if (e.dataTransfer.types.includes("text/uri-list")) {
            setUploadError("Please drag a local image file instead of a URL");
        } else {
            setUploadError("Please drop a valid image file");
        }
    };
    // Clean up the URL when component unmounts
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Parsing values with viem instead of ethers
    const basePriceParsed = basePrice ? parseEther(basePrice) : 0n;
    const slopeParsed = slope ? parseEther(slope) : 0n;

    // Updated contract write hook
    const {
        data: hash,
        writeContract,
        isPending,
        error: contractError
    } = useWriteContract();

    // Updated transaction receipt hook
    const {
        isLoading: isTxLoading,
        isSuccess: isTxSuccess
    } = useWaitForTransactionReceipt({
        hash,
    });
    useEffect(() => {
        if (isTxLoading) {
            setAlert({
                action: 'create',
                type: 'pending',
                message: `Creation pending`
            });
        }

        if (isTxSuccess) {
            setAlert({
                action: 'create',
                type: 'success',
                message: `Creation successful!`
            });

            // Reset form state
            setName('');
            setSymbol('');
            setDescription('');
            setImageFile(null);
            setImageBuffer(null);
            setPreviewUrl(null);
            setUploadError(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setSuccessPage(true);
        }
    }, [isTxLoading, isTxSuccess]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || isTxLoading) return; // prevent double-click
        setUploadError(null);
        setIsSubmitting(true);
        if (!address || !imageBuffer) {
            // Error will be shown in UI
            console.log(
                !address ? "Wallet not connected" : "Please upload an image",
            );
            return;
        }
        if (name && symbol && description && basePrice && slope && imageFile) {
            try {
                const fileName = `${name}_logo.png`;
                const pinataMetadata = { name: fileName };
                // const uri = await UploadToken(name, symbol, description, imageFile);
                const imageHash = await pinImageToPinata(
                    imageBuffer,
                    fileName,
                    pinataMetadata,
                );
                const tokenUriJson = {
                    name: name,
                    symbol: symbol,
                    description: description,
                    image: imageHash,
                };
                const tokenUriHash = await pinJsonToPinata(tokenUriJson);
                writeContract({
                    address: ETHBackedTokenMinterAddress,
                    abi: ETHBackedTokenMinterABI,
                    functionName: "createToken",
                    args: [name, symbol, tokenUriHash, basePriceParsed, slopeParsed],
                });
            } catch (error: any) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setUploadError(error.message || "Failed to upload token metadata");
                setAlert({
                    action: 'create',
                    type: 'error',
                    message: contractError ? contractError.toString() : message
                });
                setIsSubmitting(false)
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className={styles.container}>
            {!successPage ? (
                <form className={styles.form} onSubmit={onSubmit}>
                    <div className={styles.formHeader}>
                        <h2>Create Hype Coin</h2>
                        <Logo size={'6rem'} />
                    </div>
                    {!isOnline && (
                        <div className={styles.offlineContainer}>
                            <p>No Internet</p>
                            <WifiOffIcon />
                        </div>
                    )}
                    <label>
                        Name
                        <input
                            disabled={!isOnline}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Token Name"
                        />
                    </label>

                    <label>
                        Symbol
                        <input
                            disabled={!isOnline}
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            required
                            placeholder="SYM"
                        />
                    </label>

                    <label>
                        Description
                        <input
                            disabled={!isOnline}
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            placeholder="Token Description"
                        />
                    </label>
                    <label htmlFor="photo">
                        <div className={styles.imageContainer}>
                            <input
                                disabled={!isOnline}
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className={styles.hiddenInput}
                                id="photo"
                            />
                            <div
                                className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {previewUrl ? (
                                    <div className={styles.previewContainer}>
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className={styles.previewImage}
                                        />
                                        <div className={styles.fileInfo}>
                                            <p className={styles.fileName}>{imageFile && imageFile.name}</p>
                                            <button
                                                disabled={!isOnline}
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                Change Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.textCenter}>
                                        <p className="mb-2">Drag & drop image here</p>
                                        <p>or</p>
                                        <button
                                            disabled={!isOnline}
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className={styles.marginTop}
                                        >
                                            Browse Files
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </label>
                    <label>
                        Base Price (ETH)
                        <span>0.001</span>
                    </label>

                    <label>
                        Slope (ETH)
                        <span>0.0001</span>
                    </label>

                    <button type="submit" disabled={isSubmitting || isPending || !isOnline || isTxLoading}>
                        {isSubmitting || isPending ? "Submitting..." : "Create Token"}
                    </button>
                    {uploadError}
                </form>
            ) : (
                <div className={styles.successPage}>
                    <h2 className={styles.successTitle}>🎉 Token Created Successfully!</h2>
                    <p className={styles.successMessage}>Your token has been minted and is live on the blockchain.</p>

                    <div className={styles.successActions}>
                        <Link to={'/dashboard/explore'} className={styles.secondaryButton}>
                            Explore Tokens
                        </Link>
                    </div>
                </div>

            )}

        </div>
    );
};

export default CreateTokenForm;

