
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
import { useTokenPriceData } from './hooks/useTokenPriceData'



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
  const { tokens, fetchNextPage, hasNextPage, refetch, loading } = useTokens();
  const { refetchBalance, tokenBalance }: any = useUserTokenBalance();
  const { refetchAll } = useTokenPriceData();
  const { address } = useAccount();
  const balance = useBalance({ address });

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="/dashboard/" element={<DashboardHome />} />
          <Route
            path="/dashboard/explore"
            element={
              <ExploreGrid
                tokens={tokens}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                loading={loading}
              />
            }
          />
          <Route path="/dashboard/create" element={<CreateTokenForm />} />
          <Route path="/dashboard/explore/:tokenId" element={<CoinInfo refetch={refetch} />} />
          <Route path="/dashboard/explore/:tokenId/trade"
            element={
              <TradePage
                refetch={refetch}
                refetchBalance={refetchBalance}
                refetchAll={refetchAll}
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
