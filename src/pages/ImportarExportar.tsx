import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, Users, FileDown, FileUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';

export default function ImportarExportarPage() {
  const navigate = useNavigate();
  const { role, isSuperAdmin: authIsSuperAdmin } = useAuth() as any;
  const isAdmin = role === 'admin';
  const isSuperAdmin = authIsSuperAdmin ?? isAdmin;

  const sections = [
    { title: 'Cartão de Saúde', icon: CreditCard, path: '/cartao-saude', desc: 'Importar/exportar aderentes' },
    { title: 'Consultas', icon: Calendar, path: '/consultas', desc: 'Importar/exportar marcações' },
    { title: 'Funcionários MT', icon: Users, path: '/medicina-trabalho', desc: 'Importar/exportar funcionários' },
  ];

  return (
    <div className="page-enter space-y-6 max-w-7xl mx-auto w-full p-4">
      <PageHeader
        title="Importar / Exportar"
        description="Atalhos para importação e exportação de dados em Excel"
      />

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 flex gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-600 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-medium">Funcionalidade em Fase de Testes</h3>
          <p className="text-sm opacity-90">
            Esta área encontra-se em desenvolvimento e manutenção. A sua utilização pode causar alterações irreversíveis nos dados. O uso está estritamente reservado ao Gestor/Administrador do sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <section.icon className="w-5 h-5 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => navigate(section.path)}
                disabled={!isSuperAdmin}
                title={!isSuperAdmin ? "Acesso Restrito" : ""}
              >
                <FileUp className="w-4 h-4 text-muted-foreground" /> Importar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => navigate(section.path)}
                disabled={!isSuperAdmin}
                title={!isSuperAdmin ? "Acesso Restrito" : ""}
              >
                <FileDown className="w-4 h-4 text-muted-foreground" /> Exportar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
