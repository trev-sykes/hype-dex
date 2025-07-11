
import { WagmiProvider } from 'wagmi'
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


function App() {
  const queryClient = new QueryClient()

  return (
    <WagmiProvider config={config} >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter >
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route path='/dashboard/' element={<DashboardHome />} />
              <Route path="/dashboard/explore" element={<ExploreGrid />} />
              <Route path="/dashboard/create" element={<CreateTokenForm />} />
              <Route path="/dashboard/explore/:tokenId" element={<CoinInfo />} />
              <Route path="/dashboard/explore/:tokenId/trade" element={<TradePage />} />

            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
