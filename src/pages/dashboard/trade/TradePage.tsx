import { useEffect, useRef, useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ERC6909ABI, ERC6909Address } from '../../../services/ERC6909Metadata';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../../../services/ETHBackedTokenMinter';
import styles from './TradePage.module.css';
import { useCoinStore } from '../../../store/coinStore';
import { RotateCwIcon } from 'lucide-react';
import TokenCandlestickChart from '../../../components/chart/CandlestickChartWithTradeView';
import { useTokenActivity } from '../../../hooks/useTokenActivity';
import { useBurnEstimation, useMintEstimation } from '../../../hooks/useTradeEstimation';
import { useAlertStore, type ActionType } from '../../../store/alertStore';
import { BackButton } from '../../../components/button/back/BackButton';
import { TradeHistoryTable } from './TradeHistoryTable';
interface TradePageProps {
  refetchBalance: any;
  tokenBalance: any;
  address: any;
  balance: any;
}
export const TradePage: React.FC<TradePageProps> = ({ refetchBalance, tokenBalance, address, balance }) => {
  const { coin } = useCoinStore();
  const { setAlert } = useAlertStore();
  const [ethInput, setEthInput] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [isSellActive, setIsSellActive] = useState<boolean>(false);
  const txTypeRef = useRef<ActionType | null>(null);
  const amountRef = useRef<any>(null);
  const actionTypeRef = useRef<any>(null);


  // Convert coin?.tokenId to BigInt if it's a string
  const tokenId = coin?.tokenId ? BigInt(coin.tokenId) : undefined;
  const trades = useTokenActivity(coin?.tokenId?.toString());

  const mintEstimation = useMintEstimation(tokenId, ethInput);
  const burnEstimation = useBurnEstimation(tokenId, burnAmount)


  const { data: isOperator } = useReadContract({
    address: ERC6909Address,
    abi: ERC6909ABI,
    functionName: 'isOperator',
    args: [address, ETHBackedTokenMinterAddress],
  });

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
        action: txTypeRef.current,
        type: 'pending',
        message: `${txTypeRef.current}ing ${amountRef.current} ${actionTypeRef.current?.slice(0, 6) ?? ''}`
      });
    }
  }, [isTxLoading]);

  useEffect(() => {
    if (isTxSuccess) {
      setAlert({
        action: txTypeRef.current,
        type: 'success',
        message: `You ${txTypeRef.current}ed ${amountRef.current} ${actionTypeRef.current?.slice(0, 6) ?? ''}!`
      });
      refetchBalance();
    }
  }, [isTxSuccess]);

  const handleMint = async () => {
    if (!tokenId || !ethInput || parseFloat(ethInput) <= 0) {
      return;
    }
    txTypeRef.current = 'mint';
    actionTypeRef.current = coin?.symbol;
    amountRef.current = mintEstimation?.tokensToMint ?? 0; // Use mintEstimation from hook
    try {
      await writeContract({
        address: ETHBackedTokenMinterAddress,
        abi: ETHBackedTokenMinterABI,
        functionName: 'mint',
        args: [tokenId],
        value: parseEther(ethInput),
      });
      setBurnAmount('')
      setEthInput('')
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAlert({
        action: txTypeRef.current,
        type: 'error',
        message: contractError ? contractError.toString() : message
      });
      txTypeRef.current = null;
      actionTypeRef.current = null;
      amountRef.current = null;
      setBurnAmount('')
      setEthInput('')
    }
  };

  const handleBurn = async () => {
    txTypeRef.current = 'burn';
    actionTypeRef.current = coin?.symbol;
    amountRef.current = burnEstimation?.burnAmount ?? 0;
    if (!tokenId || !burnAmount || parseFloat(burnAmount) <= 0) {
      return;
    }
    try {
      if (!isOperator) {
        await writeContract({
          address: ERC6909Address,
          abi: ERC6909ABI,
          functionName: 'setOperator',
          args: [ETHBackedTokenMinterAddress, true],
        });
      }
      await writeContract({
        address: ETHBackedTokenMinterAddress,
        abi: ETHBackedTokenMinterABI,
        functionName: 'burn',
        args: [tokenId, BigInt(burnAmount)],
      });
      if (!isTxLoading && isTxSuccess) {
      }
      setBurnAmount('')
      setEthInput('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAlert({
        action: txTypeRef.current,
        type: 'error',
        message: contractError ? contractError.toString() : message
      });
      txTypeRef.current = null;
      actionTypeRef.current = null;
      amountRef.current = null;
      setBurnAmount('')
      setEthInput('')
    }
  };
  return (
    <>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.cContainer}>
            <BackButton />
            <TokenCandlestickChart coin={coin} trades={trades} interval={86400} tokenId={tokenId} />
            <div className={styles.tradeCompact}>
              <div className={styles.tradeHeader}>
                <div className={styles.tradeModeIndicator}>
                  <span>Mode:</span>
                  <span className={`${styles.modeLabel} ${isSellActive ? styles.sellMode : styles.buyMode}`}>
                    {isSellActive ? `Sell ${coin?.symbol}` : `Buy ${coin?.symbol}`}
                  </span>
                </div>

                <div className={styles.tradeToggle}>
                  <span>Switch</span>
                  <div className={styles.buySell} onClick={() => setIsSellActive(prev => !prev)}>
                    <RotateCwIcon size={20} />
                  </div>
                </div>
              </div>
              <p className={styles.balanceText}>
                {isSellActive
                  ? `${tokenBalance} ${coin?.symbol}`
                  : `${balance.data ? Number(formatEther(balance.data.value)).toFixed(4) : '0'} ETH`}
              </p>
              <div className={styles.tradeBox}>
                <input
                  type="number"
                  placeholder={isSellActive ? 'Enter token amount' : 'Enter ETH amount'}
                  className={styles.inputCompact}
                  value={isSellActive ? burnAmount : ethInput}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (isSellActive) {
                      // Allow only whole numbers or empty string
                      if (/^\d*$/.test(value)) {
                        setBurnAmount(value);
                      }
                    } else {
                      // Allow decimals when buying
                      setEthInput(value);
                    }
                  }}
                  step={isSellActive ? "1" : "any"}
                  min="0"
                />

                <button
                  className={`${styles.buttonCompact} ${isSellActive ? styles.sell : ''}`}
                  onClick={isSellActive ? handleBurn : handleMint}
                  disabled={
                    isPending ||
                    !balance.data?.value ||
                    (ethInput !== '' && balance.data.value < parseEther(ethInput)) ||
                    (burnAmount !== '' && tokenBalance < Number(burnAmount))
                  }
                >
                  {isPending ? '...' : isSellActive ? 'Sell' : 'Buy'}
                </button>
              </div>

            </div>
            {mintEstimation && !isSellActive && (
              <div className={styles.calculationPreview}>
                {ethInput !== '' && parseEther(ethInput) > (balance.data?.value ?? 0n) ? (
                  <p className={styles.errorText}>Insufficient ETH for this purchase</p>
                ) : (
                  <>
                    <p>You will receive: <strong>{mintEstimation.tokensToMint}</strong> tokens</p>
                    <p>Total cost: <strong>{mintEstimation.totalCostETH.toFixed(6)}</strong> ETH</p>
                    <p>Refund: <strong>{mintEstimation.refundETH.toFixed(6)}</strong> ETH</p>
                  </>
                )}
              </div>
            )}

            {isSellActive && (
              <div className={styles.calculationPreview}>
                {burnAmount !== '' && Number(burnAmount) > tokenBalance ? (
                  <p className={styles.errorText}>Insufficient balance to sell that many tokens</p>
                ) : burnEstimation ? (
                  <>
                    <p>
                      You will receive: <strong>{burnEstimation.ethToReceive.toFixed(6)}</strong> ETH
                    </p>
                    <p>
                      Tokens to burn: <strong>{burnEstimation.burnAmount}</strong>
                    </p>
                  </>
                ) : burnAmount !== '' ? (
                  <p className={styles.errorText}>Invalid or uncalculable burn estimation</p>
                ) : null}
              </div>
            )}


          </div>
        </div>
      </div >
      <TradeHistoryTable coin={coin} />
    </>
  );
};
