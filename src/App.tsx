
import { useAccount, useBalance, WagmiProvider } from 'wagmi'
import { config } from './wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/landing/LandingPage'
import DashboardLayout from './layout/dashboardLayout/DashboardLayout'
import { DashboardHome } from './pages/dashboard/dashboardHome/DashboardHome'
import CreateTokenForm from './pages/dashboard/create/CreateTokenForm'
import { ExploreGrid } from './pages/dashboard/explore/ExploreGrid'
import { TradePage } from './pages/dashboard/trade/TradePage'
import { CoinInfo } from './pages/dashboard/coinInfo/CoinInfo'
import { ScrollToTop } from './hooks/useScrollToTop'
import { useTradeUpdater } from './hooks/useTradeUpdater'
import { useTokenCreationUpdater } from './hooks/useNewTokenCreationUpdater'
import { useTokens } from './hooks/useTokens'
import { useUserTokenBalance } from './hooks/useUserBalance'
import { useAllTrades } from './hooks/useTokenActivity'
import { useTradeStore } from './store/tradeStore'
import { Portfolio } from './pages/dashboard/portfolio/Portfolio'
import { BuySell } from './pages/dashboard/buySell/BuySell'
import { useEffect } from 'react'
import { useTokenStore } from './store/allTokensStore'
import { useTokensRefresh } from './hooks/useTokensRefresh'



export default function App() {
  useTradeUpdater();
  useTokenCreationUpdater();
  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <InnerApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function InnerApp() {
  const { tokens, fetchStaticMetadata, loading } = useTokensRefresh();
  const { fetchNextPage, hasNextPage, fetchAllPrices } = useTokens();
  const { setTokens } = useTokenStore();
  const trades = useAllTrades();
  const { setTrades } = useTradeStore();
  const { refetchBalance, tokenBalance }: any = useUserTokenBalance();
  const { address } = useAccount();
  const balance = useBalance({ address });
  useEffect(() => {
    setTrades('all', trades);
  }, [trades])
  useEffect(() => {
    setTokens(tokens);
  }, [tokens])
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="/dashboard/" element={<DashboardHome />} />
          <Route
            path="/dashboard/account"
            element={
              <Portfolio
                tokens={tokens}
              />
            }
          />
          <Route
            path="/dashboard/explore"
            element={
              <ExploreGrid
                tokens={tokens}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                loading={loading}
                fetchStaticMetadata={fetchStaticMetadata}
                fetchAllPrices={fetchAllPrices}
              />
            }
          />
          <Route path="/dashboard/create" element={<CreateTokenForm />} />
          <Route path='/dashboard/trade/:tokenId' element={
            <BuySell
              balance={balance} />
          } />
          <Route path="/dashboard/explore/:tokenId" element={<CoinInfo />} />
          <Route path="/dashboard/explore/:tokenId/trade"
            element={
              <TradePage
                refetchBalance={refetchBalance}
                tokenBalance={tokenBalance}
                address={address}
                balance={balance}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
