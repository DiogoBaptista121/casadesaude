import { useState } from 'react';
import {
  Home,
  CreditCard,
  Calendar,
  CalendarDays,
  Stethoscope,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  HeartPulse,
  MapPin,
  LayoutGrid,
  ChevronDown,
  Users,
  ClipboardList,
  Truck,
} from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Início', url: '/', icon: Home, roles: ['admin', 'manager', 'staff', 'viewer'] },
  { title: 'Cartão de Saúde', url: '/cartao-saude', icon: CreditCard, roles: ['admin', 'manager', 'staff'] },
  { title: 'Consultas', url: '/consultas', icon: Calendar, roles: ['admin', 'manager', 'staff'] },
  // Medicina do Trabalho is handled separately as a collapsible group
  { title: 'Dashboard', url: '/dashboard', icon: BarChart3, roles: ['admin', 'manager', 'staff'] },
  { title: 'Importar/Exportar', url: '/importar-exportar', icon: FileSpreadsheet, roles: ['admin', 'manager', 'staff'] },
  { title: 'Definições', url: '/definicoes', icon: Settings, roles: ['admin', 'manager', 'staff', 'viewer'] },
];

const calendarioSubItems = [
  { title: 'Visão Geral', url: '/calendario', icon: LayoutGrid },
  { title: 'Horários e Locais', url: '/horarios-locais', icon: MapPin },
  { title: 'Agenda Unidade Móvel', url: '/agenda-unidade-movel', icon: Truck },
];

const medicinaSubItems = [
  { title: 'Funcionários', url: '/medicina-trabalho', icon: Users },
  { title: 'Consultas MT', url: '/medicina-trabalho?tab=consultas', icon: ClipboardList },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const isCollapsed = state === 'collapsed';

  // Calendário submenu open if either child is active, or can be toggled
  const isCalendarioActive =
    location.pathname === '/calendario' || location.pathname === '/horarios-locais';
  const [calendarioOpen, setCalendarioOpen] = useState(isCalendarioActive);

  // Medicina do Trabalho submenu
  const isMedicinaActive = location.pathname === '/medicina-trabalho';
  const [medicinaOpen, setMedicinaOpen] = useState(isMedicinaActive);

  const visibleMenuItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(role || 'viewer')
  );

  const getInitials = (nome: string | null) => {
    if (!nome) return 'U';
    return nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (r: string | null) => {
    switch (r) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gestor';
      case 'staff': return 'Colaborador';
      case 'viewer': return 'Visualizador';
      default: return 'Utilizador';
    }
  };

  return (
    <Sidebar className="sidebar-gradient border-r-0">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-display font-semibold text-white">Casa de Saúde</span>
              <span className="text-xs text-white/70">Sistema de Gestão</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* Regular menu items (before Calendário position) */}
              {visibleMenuItems.slice(0, 2).map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          'text-white/80 hover:text-white hover:bg-white/10',
                          isActive && 'bg-white/15 text-white font-medium shadow-sm'
                        )}
                      >
                        <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-white/70')} />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* ── Calendário group (with submenu) ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => !isCollapsed && setCalendarioOpen((o) => !o)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full cursor-pointer',
                    'text-white/80 hover:text-white hover:bg-white/10',
                    isCalendarioActive && 'bg-white/15 text-white font-medium shadow-sm'
                  )}
                >
                  <CalendarDays className={cn('w-5 h-5 flex-shrink-0', isCalendarioActive ? 'text-white' : 'text-white/70')} />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1">Calendário</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-white/60 transition-transform duration-200',
                          calendarioOpen && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </SidebarMenuButton>

                {/* Sub-items */}
                {!isCollapsed && calendarioOpen && (
                  <SidebarMenuSub className="ml-2 mt-1 space-y-0.5">
                    {calendarioSubItems.map((sub) => {
                      const isSubActive = location.pathname === sub.url;
                      return (
                        <SidebarMenuSubItem key={sub.url}>
                          <SidebarMenuSubButton asChild>
                            <RouterNavLink
                              to={sub.url}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                                'text-white/70 hover:text-white hover:bg-white/10',
                                isSubActive && 'bg-white/15 text-white font-medium'
                              )}
                            >
                              <sub.icon className={cn('w-4 h-4 flex-shrink-0', isSubActive ? 'text-white' : 'text-white/60')} />
                              <span className="truncate">{sub.title}</span>
                            </RouterNavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}

                {/* Collapsed: show sub-items as icons only */}
                {isCollapsed && (
                  <SidebarMenuSub className="mt-1 space-y-0.5">
                    {calendarioSubItems.map((sub) => {
                      const isSubActive = location.pathname === sub.url;
                      return (
                        <SidebarMenuSubItem key={sub.url}>
                          <SidebarMenuSubButton asChild>
                            <RouterNavLink
                              to={sub.url}
                              title={sub.title}
                              className={cn(
                                'flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200',
                                'text-white/70 hover:text-white hover:bg-white/10',
                                isSubActive && 'bg-white/15 text-white'
                              )}
                            >
                              <sub.icon className="w-4 h-4 flex-shrink-0" />
                            </RouterNavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* ── Medicina do Trabalho group (with submenu) ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => !isCollapsed && setMedicinaOpen((o) => !o)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full cursor-pointer',
                    'text-white/80 hover:text-white hover:bg-white/10',
                    isMedicinaActive && 'bg-white/15 text-white font-medium shadow-sm'
                  )}
                >
                  <Stethoscope className={cn('w-5 h-5 flex-shrink-0', isMedicinaActive ? 'text-white' : 'text-white/70')} />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1">Medicina do Trabalho</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-white/60 transition-transform duration-200',
                          medicinaOpen && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </SidebarMenuButton>

                {/* Sub-items expanded */}
                {!isCollapsed && medicinaOpen && (
                  <SidebarMenuSub className="ml-2 mt-1 space-y-0.5">
                    {medicinaSubItems.map((sub) => {
                      const isSubActive =
                        sub.url === '/medicina-trabalho'
                          ? location.pathname === '/medicina-trabalho' && !location.search
                          : location.pathname === '/medicina-trabalho' && location.search.includes('tab=consultas');
                      return (
                        <SidebarMenuSubItem key={sub.url}>
                          <SidebarMenuSubButton asChild>
                            <RouterNavLink
                              to={sub.url}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                                'text-white/70 hover:text-white hover:bg-white/10',
                                isSubActive && 'bg-white/15 text-white font-medium'
                              )}
                            >
                              <sub.icon className={cn('w-4 h-4 flex-shrink-0', isSubActive ? 'text-white' : 'text-white/60')} />
                              <span className="truncate">{sub.title}</span>
                            </RouterNavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}

                {/* Collapsed: icons only */}
                {isCollapsed && (
                  <SidebarMenuSub className="mt-1 space-y-0.5">
                    {medicinaSubItems.map((sub) => {
                      const isSubActive =
                        sub.url === '/medicina-trabalho'
                          ? location.pathname === '/medicina-trabalho' && !location.search
                          : location.pathname === '/medicina-trabalho' && location.search.includes('tab=consultas');
                      return (
                        <SidebarMenuSubItem key={sub.url}>
                          <SidebarMenuSubButton asChild>
                            <RouterNavLink
                              to={sub.url}
                              title={sub.title}
                              className={cn(
                                'flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200',
                                'text-white/70 hover:text-white hover:bg-white/10',
                                isSubActive && 'bg-white/15 text-white'
                              )}
                            >
                              <sub.icon className="w-4 h-4 flex-shrink-0" />
                            </RouterNavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Remaining menu items */}
              {visibleMenuItems.slice(2).map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          'text-white/80 hover:text-white hover:bg-white/10',
                          isActive && 'bg-white/15 text-white font-medium shadow-sm'
                        )}
                      >
                        <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-white/70')} />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9 border-2 border-white/20">
            <AvatarFallback className="bg-white/15 text-white text-sm font-medium">
              {getInitials(profile?.nome)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.nome || 'Utilizador'}
              </p>
              <p className="text-xs text-white/60 truncate">
                {getRoleLabel(role)}
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={signOut}
          className={cn(
            'w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-accent/80',
            'bg-accent/60 border border-accent/20',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>Terminar Sessão</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
