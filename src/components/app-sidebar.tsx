import { CalendarDays, Home, Inbox, Wallet, ShieldAlert } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader
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

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-sidebar-border flex h-16 items-center justify-center border-b p-4">
        <div className="w-full truncate text-xl font-bold tracking-tighter text-indigo-400">
          Trader Tracker <span className="text-foreground">Pro</span>
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
    </Sidebar>
  )
}
