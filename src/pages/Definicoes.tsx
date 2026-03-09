import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Shield, Bell, Palette } from 'lucide-react';
import { GeneralSettingsTab } from '@/components/definicoes/GeneralSettingsTab';
import { UsersTab } from '@/components/definicoes/UsersTab';
import { SecurityTab } from '@/components/definicoes/SecurityTab';
import { NotificationsTab } from '@/components/definicoes/NotificationsTab';
import { AppearanceTab } from '@/components/definicoes/AppearanceTab';
import { usePermissions } from '@/hooks/usePermissions';

export default function DefinicoesPage() {
  const { isAdmin, isViewer, canEditSettings } = usePermissions();

  // Determine default tab based on role
  const defaultTab = isAdmin ? 'geral' : isViewer ? 'seguranca' : 'geral';

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto pb-20">
      <PageHeader title="Definições" description="Configurações do sistema e da sua conta" />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-flex">
          {/* Geral — admin and manager */}
          {canEditSettings && (
            <TabsTrigger value="geral" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
          )}

          {/* Utilizadores — admin only */}
          {isAdmin && (
            <TabsTrigger value="utilizadores" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilizadores</span>
            </TabsTrigger>
          )}

          {/* Segurança — everyone */}
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>

          {/* Notificações — admin and manager */}
          {canEditSettings && (
            <TabsTrigger value="notificacoes" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
          )}

          {/* Aparência — everyone */}
          <TabsTrigger value="aparencia" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Aparência</span>
          </TabsTrigger>
        </TabsList>

        {canEditSettings && (
          <TabsContent value="geral" className="mt-6">
            <GeneralSettingsTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="utilizadores" className="mt-6">
            <UsersTab />
          </TabsContent>
        )}

        <TabsContent value="seguranca" className="mt-6">
          <SecurityTab />
        </TabsContent>

        {canEditSettings && (
          <TabsContent value="notificacoes" className="mt-6">
            <NotificationsTab />
          </TabsContent>
        )}

        <TabsContent value="aparencia" className="mt-6">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
