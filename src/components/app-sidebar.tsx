import { CalendarDays, Home, Inbox, Wallet, ShieldAlert, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuthStore } from '@/store/useAuthStore'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar'

const items = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home
  },
  {
    title: 'Mis Cuentas',
    url: '/accounts',
    icon: Wallet
  },
  {
    title: 'Registrar Trade',
    url: '/trades/new',
    icon: Inbox
  },
  {
    title: 'Calendario',
    url: '/calendar',
    icon: CalendarDays
  },
  {
    title: 'Gestor de Riesgo',
    url: '/risk',
    icon: ShieldAlert
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out', error)
    }
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-sidebar-border flex h-16 items-center justify-center border-b p-4">
        <div className="flex w-full items-center gap-2 truncate text-xl font-bold tracking-tighter text-indigo-400">
          <img src="/logo-svg.svg" alt="Logo" className="w-6 h-6" />
          <span>Funded<span className="text-foreground">Flow</span></span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t p-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="size-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-slate-500">{user.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-1 flex-col truncate">
              <span className="truncate text-sm font-semibold">{user.displayName || 'Trader'}</span>
              <span className="truncate text-xs text-slate-500">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
