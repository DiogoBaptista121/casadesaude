import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Stethoscope } from 'lucide-react';
import { FuncionariosTab } from '@/components/medicina-trabalho/FuncionariosTab';
import { ConsultasMTTab } from '@/components/medicina-trabalho/ConsultasMTTab';

export default function MedicinaTrabalhoPage() {
  return (
    <div className="page-enter flex flex-col h-full gap-3 max-w-7xl mx-auto w-full p-4">
      <PageHeader
        title="Medicina do Trabalho"
        description="Gestão de funcionários e consultas de medicina do trabalho"
      />

      <Tabs defaultValue="funcionarios" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="shrink-0">
          <TabsTrigger value="funcionarios" className="gap-2">
            <Users className="w-4 h-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="consultas" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            Consultas MT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios" className="flex-1 overflow-hidden mt-2">
          <FuncionariosTab />
        </TabsContent>

        <TabsContent value="consultas" className="flex-1 overflow-hidden mt-2">
          <ConsultasMTTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
