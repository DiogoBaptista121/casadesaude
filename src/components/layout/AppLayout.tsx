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
      </div>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
}
