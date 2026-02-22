import { Link } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Wallet } from 'lucide-react'

// Custom styled connect button
export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-50 text-neutral-950 rounded-xl font-semibold text-sm hover:bg-white transition-all hover:scale-105 shadow-lg shadow-amber-500/10 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <Wallet className="w-4 h-4" />
                    <span className="relative">Connect Wallet</span>
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold text-sm hover:bg-red-500/30 transition-all"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-800 border border-white/10 text-slate-50 rounded-xl text-sm hover:bg-neutral-700 transition-all"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-800 border border-white/10 text-slate-50 rounded-xl font-medium text-sm hover:bg-neutral-700 hover:border-amber-500/30 transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span>{account.displayName}</span>
                    {account.displayBalance && (
                      <span className="text-neutral-400">
                        ({account.displayBalance})
                      </span>
                    )}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="group">
            <span 
              className="text-3xl font-black tracking-wider text-slate-50 group-hover:text-white transition-all uppercase"
              style={{ fontFamily: "'Orbitron', monospace" }}
            >
              Sentinel
            </span>
          </Link>

          {/* Right side */}
          <CustomConnectButton />
        </div>
      </div>
    </header>
  )
}

export default Header
