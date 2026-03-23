import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Toaster } from '@/components/ui/sonner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
          <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center px-4 shrink-0 z-10">
            <SidebarTrigger className="mr-4" />
          </header>
          <div className="flex-1 flex flex-col overflow-hidden px-6 pt-4 pb-2">
            {children}
          </div>
        </main>

        {/* ── SELO DE VERSÃO GLOBAL ── */}
        <div className="fixed top-4 right-6 z-[9999] pointer-events-none hidden sm:block">
          <span className="text-[10px] font-mono text-muted-foreground/50 bg-background/50 backdrop-blur-sm border border-border/50 rounded-md px-2 py-1 shadow-sm">
            Versão: 1.1.10.2026
          </span>
        </div>

      </div>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
}
