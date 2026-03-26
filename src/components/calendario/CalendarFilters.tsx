import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, CalendarDays } from 'lucide-react';
import type { Servico } from '@/types/database';

interface CalendarFiltersProps {
  servicos: Servico[];
  servicoFilter: string;
  setServicoFilter: (value: string) => void;
  tipoFilter: string;
  setTipoFilter: (value: string) => void;
  unidadeFilter: string;
  setUnidadeFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onToday: () => void;
  onNewConsulta: () => void;
  canEdit: boolean;
}

export function CalendarFilters({
  servicos,
  servicoFilter,
  setServicoFilter,
  tipoFilter,
  setTipoFilter,
  unidadeFilter,
  setUnidadeFilter,
  statusFilter,
  setStatusFilter,
  onToday,
  onNewConsulta,
  canEdit,
}: CalendarFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={servicoFilter} onValueChange={setServicoFilter}>
        <SelectTrigger className="h-8 w-36 text-[13px] border-dashed border-border/60 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <SelectValue placeholder="Serviço" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Serviços</SelectItem>
          {servicos.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tipoFilter} onValueChange={setTipoFilter}>
        <SelectTrigger className="h-8 w-36 text-[13px] border-dashed border-border/60 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Tipos</SelectItem>
          <SelectItem value="consulta">Consultas</SelectItem>
          <SelectItem value="medicina_trabalho">Medicina do Trabalho</SelectItem>
        </SelectContent>
      </Select>

      <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
        <SelectTrigger className="h-8 w-36 text-[13px] border-dashed border-border/60 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <SelectValue placeholder="Unidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas Unidades</SelectItem>
          <SelectItem value="casa_saude">Casa de Saúde</SelectItem>
          <SelectItem value="unidade_movel">Unidade Móvel</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-8 w-32 text-[13px] border-dashed border-border/60 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Status</SelectItem>
          <SelectItem value="agendada">Agendada</SelectItem>
          <SelectItem value="confirmada">Confirmada</SelectItem>
          <SelectItem value="concluida">Concluída</SelectItem>
          <SelectItem value="cancelada">Cancelada</SelectItem>
          <SelectItem value="falta">Falta</SelectItem>
          <SelectItem value="remarcada">Remarcada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
