import { Outlet, Link } from 'react-router'

import { AppSidebar } from './components/app-sidebar'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from './lib/utils'
import { buttonVariants } from './components/ui/button'
import { ModeToggle } from './mode-toggle'


export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="bg-background text-foreground flex min-h-screen w-full">
        <AppSidebar />

        {/* Contenido Principal */}
        <main className="flex h-screen flex-1 flex-col overflow-y-auto">
          {/* Top Header Placeholder */}
          <header className="border-border bg-background/50 sticky top-0 z-10 flex h-20 items-center justify-between border-b px-6 backdrop-blur-md py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>

            <div className="flex-1"></div>

            <div className="flex items-center gap-4">
              <Link to="/trades/new" className={cn(buttonVariants())}>+ Nuevo Trade</Link>
            </div>
            <div className='ml-4'>
              <ModeToggle />
            </div>
          </header>

          {/* Vista renderizada de React Router */}
          <div className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
