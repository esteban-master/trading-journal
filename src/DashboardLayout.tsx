import { Outlet, Link } from 'react-router'

import { AppSidebar } from './components/app-sidebar'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'


export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="bg-background text-foreground flex min-h-screen w-full">
        <AppSidebar />

        {/* Contenido Principal */}
        <main className="flex h-screen flex-1 flex-col overflow-y-auto">
          {/* Top Header Placeholder */}
          <header className="border-border bg-background/50 sticky top-0 z-10 flex h-16 items-center justify-between border-b px-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="text-foreground text-lg font-bold md:hidden">
                Trader Tracker
              </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex items-center gap-4">
              <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
                <Link to="/trades/new">+ Nuevo Trade</Link>
              </button>
              <div className="bg-muted border-border size-8 rounded-full border"></div>
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
