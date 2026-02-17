import Header from './Header'
import BottomNavigation from './BottomNavigation'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20 md:pb-32">
        {children}
      </main>
      <BottomNavigation />
    </div>
  )
}

export default MainLayout
