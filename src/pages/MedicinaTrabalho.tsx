import { PageHeader } from '@/components/ui/page-header';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { FuncionariosTab } from '@/components/medicina-trabalho/FuncionariosTab';
import { ConsultasMTTab } from '@/components/medicina-trabalho/ConsultasMTTab';

export default function MedicinaTrabalhoPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'funcionarios';

  const { role } = useAuth();
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }


  return (
    <div className="page-enter flex flex-col h-full gap-3">
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'consultas' ? <ConsultasMTTab /> : <FuncionariosTab />}
      </div>
    </div>
  );
}
