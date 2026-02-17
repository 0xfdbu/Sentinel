import BottomNavigation from './BottomNavigation'

interface MinimalLayoutProps {
  children: React.ReactNode
}

export function MinimalLayout({ children }: MinimalLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <main className="flex-1 pb-20 md:pb-24">
        {children}
      </main>
      <BottomNavigation isMinimal />
    </div>
  )
}

export default MinimalLayout
