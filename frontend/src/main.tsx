import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiConfig } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import App from './App'
import { config, chains } from './utils/wagmi'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          <BrowserRouter>
            <App />
            <Toaster position="top-right" />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  </React.StrictMode>,
)
