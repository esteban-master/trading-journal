import { Home, Inbox, Wallet, LogOut, ChevronsUpDown } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'


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
  // {
  //   title: 'Calendario',
  //   url: '/calendar',
  //   icon: CalendarDays
  // },
  // {
  //   title: 'Gestor de Riesgo',
  //   url: '/risk',
  //   icon: ShieldAlert
  // },
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

      <SidebarFooter className="border-sidebar-border border-t p-2">
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="size-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-500">{user.email?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-semibold">{user.displayName || 'Trader'}</span>
                      <span className="truncate text-xs text-slate-500">{user.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side="right"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || 'User'} className="size-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-slate-500">{user.email?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user.displayName || 'Trader'}</span>
                        <span className="truncate text-xs text-slate-500">{user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer">
                    <LogOut className="mr-2 size-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
