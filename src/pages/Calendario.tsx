import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarFilters } from '@/components/calendario/CalendarFilters';
import { CalendarViewSelector, CalendarView } from '@/components/calendario/CalendarViews';
import { CalendarEventData } from '@/components/calendario/CalendarEvent';
import { DayView } from '@/components/calendario/DayView';
import { WeekView } from '@/components/calendario/WeekView';
import { MonthView } from '@/components/calendario/MonthView';
import { YearView } from '@/components/calendario/YearView';
import { AppointmentModal } from '@/components/calendario/AppointmentModal';
import { MTEventViewModal } from '@/components/calendario/MTEventViewModal';
import { Loader2 } from 'lucide-react';
import type { Consulta, Servico, ConsultaOrigem, ConsultaStatus } from '@/types/database';

// Local type that matches consultas_mt + joined funcionarios_mt
interface ConsultaMTFichaView {
  consulta_id: string;   // the row's own id, aliased for consistency
  funcionario_id: string;
  data_consulta: string; // mapped from 'data'
  hora_consulta: string; // mapped from 'hora'
  tipo_exame: string | null;
  status: ConsultaStatus;
  notas: string | null;
  resultado: string | null;
  created_at: string | null;
  updated_at: string | null;
  // joined
  nome_completo: string;       // mapped from funcionarios_mt.nome
  numero_funcionario: string;  // mapped from funcionarios_mt.numero_funcionario
  // optional — not available without extra join, kept null for modal compat
  telefone: string | null;
  idade: number | null;
}

const origemLabels: Record<ConsultaOrigem, string> = {
  casa_saude: 'Casa de Saúde',
  unidade_movel: 'Unidade Móvel',
};

export default function CalendarioPage() {
  const { canEdit } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // non-blocking re-fetch indicator
  const [view, setView] = useState<CalendarView>('mes');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [consultasMT, setConsultasMT] = useState<ConsultaMTFichaView[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Filters
  const [servicoFilter, setServicoFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [unidadeFilter, setUnidadeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

  // MT View Modal
  const [mtViewModalOpen, setMtViewModalOpen] = useState(false);
  const [selectedMTEvent, setSelectedMTEvent] = useState<ConsultaMTFichaView | null>(null);

  // ── Date-range helper ──────────────────────────────────────────────
  // Returns [startISO, endISO] for the current view window
  const getDateRange = (date: Date, v: CalendarView): [string, string] => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (v === 'dia') {
      // ±1 day buffer so events at day boundary are never clipped
      const prev = new Date(date); prev.setDate(prev.getDate() - 1);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      return [iso(prev), iso(next)];
    }
    if (v === 'semana') {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay()); // Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Saturday
      return [iso(start), iso(end)];
    }
    if (v === 'mes') {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return [iso(start), iso(end)];
    }
    // ano — fetch the whole year
    return [
      `${date.getFullYear()}-01-01`,
      `${date.getFullYear()}-12-31`,
    ];
  };

  // Fetch only when currentDate or view changes
  useEffect(() => {
    fetchData(currentDate, view);
  }, [currentDate, view]);

  const fetchData = async (date: Date = currentDate, v: CalendarView = view) => {
    // First load → full spinner; subsequent navigations → subtle indicator
    if (!loading) setLoadingMore(true);
    else setLoading(true);

    const [startDate, endDate] = getDateRange(date, v);

    const [consultasRes, consultasMTRes, servicosRes] = await Promise.all([
      supabase
        .from('consultas')
        .select('*, servicos(nome, cor)')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true }),
      supabase
        .from('consultas_mt')
        .select('*')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true })
        .order('hora', { ascending: true }),
      supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ]);

    // Also separately fetch funcionarios_mt to get names
    const { data: funcData } = await supabase
      .from('funcionarios_mt' as any)
      .select('id, nome, numero_funcionario');

    if (consultasRes.error) {
      console.error('Error fetching consultas:', consultasRes.error);
    } else {
      // Batch lookup patient names by NIF (same approach as Consultas.tsx)
      const rawConsultas = (consultasRes.data ?? []) as any[];
      const nifsUnicos = [...new Set(rawConsultas.map((c) => c.paciente_nif).filter(Boolean))];
      const nifNameMap = new Map<string, string>();

      if (nifsUnicos.length > 0) {
        const { data: cartoes } = await supabase
          .from('cartao_saude')
          .select('nif, nome_completo')
          .in('nif', nifsUnicos as any);
        ((cartoes ?? []) as any[]).forEach((c) => nifNameMap.set(c.nif, c.nome_completo));
      }

      // Attach patient names back to each consulta
      rawConsultas.forEach((c) => {
        c._nome_paciente = nifNameMap.get(c.paciente_nif) || c.paciente_nif || 'Paciente';
      });

      setConsultas(rawConsultas as unknown as Consulta[]);
    }

    if (consultasMTRes.error) {
      console.error('Error fetching consultas_mt:', consultasMTRes.error);
    } else {
      // Build a lookup map: funcionario_id → { nome, numero_funcionario }
      const funcMap = new Map<string, { nome: string; numero_funcionario: string }>();
      ((funcData ?? []) as any[]).forEach((f: any) => {
        funcMap.set(f.id, { nome: f.nome ?? 'Funcionário', numero_funcionario: f.numero_funcionario ?? '-' });
      });

      const mapped: ConsultaMTFichaView[] = (consultasMTRes.data ?? []).map((row) => {
        const func = funcMap.get(row.funcionario_id);
        // Normalise hora: DB returns 'HH:mm:ss', we need 'HH:mm'
        const hora = (row.hora ?? '00:00:00').substring(0, 5);
        // Ensure date is clean YYYY-MM-DD (should always be, but be defensive)
        const data = (row.data ?? '').substring(0, 10);
        return {
          consulta_id: row.id,
          funcionario_id: row.funcionario_id,
          data_consulta: data,
          hora_consulta: hora,
          tipo_exame: row.tipo_exame,
          status: (row.status ?? 'agendada') as ConsultaStatus,
          notas: row.notas,
          resultado: row.resultado,
          created_at: row.created_at,
          updated_at: row.updated_at,
          nome_completo: func?.nome ?? 'Funcionário',
          numero_funcionario: func?.numero_funcionario ?? '-',
          telefone: null,
          idade: null,
        };
      });
      console.log('[Calendario] Loaded', mapped.length, 'consultas MT:', mapped.map(m => ({ id: m.consulta_id, data: m.data_consulta, nome: m.nome_completo })));
      setConsultasMT(mapped);
    }

    if (servicosRes.data) setServicos(servicosRes.data as Servico[]);

    setLoading(false);
    setLoadingMore(false);
  };

  // Transform data into calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEventData[] = [];

    // Consultas Casa de Saúde
    // Map filter values (from Select) to the string stored in c.local
    const unidadeLocalMap: Record<string, string> = {
      casa_saude: 'Casa de Saúde',
      unidade_movel: 'Unidade Móvel',
    };
    const localParaFiltrar = unidadeFilter !== 'todos' ? unidadeLocalMap[unidadeFilter] : null;

    if (tipoFilter === 'todos' || tipoFilter === 'consulta') {
      consultas.forEach((c: any) => {
        // Filter by unidade using c.local (new schema)
        if (localParaFiltrar && c.local !== localParaFiltrar) return;
        if (servicoFilter !== 'todos' && c.servico_id !== servicoFilter) return;
        if (statusFilter !== 'todos' && c.status !== statusFilter) return;

        const servico = (c.servicos ?? c.servico) as any;
        const nomePaciente = c._nome_paciente || c.paciente_nif || 'Paciente';
        const localLabel = c.local || 'Casa de Saúde';

        allEvents.push({
          id: c.id,
          title: nomePaciente,
          subtitle: servico?.nome || 'Serviço',
          date: c.data,
          time: c.hora?.substring(0, 5) || '00:00',
          status: c.status,
          color: servico?.cor,
          isMT: false,
          type: 'consulta',
          origem: undefined,
          origemLabel: localLabel,
        });
      });
    }

    // Consultas Medicina do Trabalho — sempre Casa de Saúde
    if (tipoFilter === 'todos' || tipoFilter === 'medicina_trabalho') {
      // MT is always 'Casa de Saúde'; exclude when filtering for Unidade Móvel
      if (unidadeFilter !== 'unidade_movel') {
        consultasMT.forEach((c) => {
          if (statusFilter !== 'todos' && c.status !== statusFilter) return;

          allEvents.push({
            id: c.consulta_id,
            title: `MT - ${c.numero_funcionario} - ${c.nome_completo}`,
            subtitle: c.tipo_exame || 'Exame',
            date: c.data_consulta,
            time: c.hora_consulta?.substring(0, 5) || '00:00',
            status: c.status,
            color: '#f59e0b',
            isMT: true,
            type: 'consulta_mt',
            origem: 'casa_saude' as ConsultaOrigem,
            origemLabel: 'Casa de Saúde • MT',
          });
        });
      }
    }

    return allEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [consultas, consultasMT, servicoFilter, tipoFilter, unidadeFilter, statusFilter]);

  const handleEventClick = (event: CalendarEventData) => {
    // Viewers can only view MT events, not edit anything
    if (!canEdit) {
      if (event.type === 'consulta_mt') {
        const consultaMT = consultasMT.find((c) => c.consulta_id === event.id);
        if (consultaMT) {
          setSelectedMTEvent(consultaMT);
          setMtViewModalOpen(true);
        }
      }
      return; // Block editing for viewers
    }

    // Find the original data to edit (staff/admin only)
    if (event.type === 'consulta') {
      const consulta = consultas.find((c) => c.id === event.id) as any;
      if (consulta) {
        setEditingAppointment({
          id: consulta.id,
          type: 'consulta' as const,
          nif: consulta.paciente_nif || '',
          data: consulta.data,
          hora: consulta.hora?.substring(0, 5) || '09:00',
          status: consulta.status,
          notas: consulta.notas || '',
        });
      }
    } else {
      // Para eventos MT, abrir modal de visualização em vez de edição
      const consultaMT = consultasMT.find((c) => c.consulta_id === event.id);
      if (consultaMT) {
        setSelectedMTEvent(consultaMT);
        setMtViewModalOpen(true);
        return;
      }
    }
    setModalOpen(true);
  };

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setModalOpen(true);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthClick = (month: Date) => {
    setCurrentDate(month);
    setView('mes');
  };

  return (
    <div className="page-enter flex flex-col h-[calc(100vh-140px)] gap-2 max-w-7xl mx-auto w-full p-4 overflow-hidden">
      <PageHeader
        title="Calendário"
        description="Visualização das consultas agendadas"
      />

      <div className="shrink-0">
        <CalendarFilters
          servicos={servicos}
          servicoFilter={servicoFilter}
          setServicoFilter={setServicoFilter}
          tipoFilter={tipoFilter}
          setTipoFilter={setTipoFilter}
          unidadeFilter={unidadeFilter}
          setUnidadeFilter={setUnidadeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onToday={handleToday}
          onNewConsulta={handleNewAppointment}
          canEdit={canEdit}
        />
      </div>

      <div className="shrink-0">
        <CalendarViewSelector
          view={view}
          setView={setView}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
      </div>

      {/* Loading indicator for navigation re-fetches */}
      {loadingMore && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          A carregar consultas...
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        {view === 'dia' && (
          <DayView date={currentDate} events={events} onEventClick={handleEventClick} />
        )}
        {view === 'semana' && (
          <WeekView date={currentDate} events={events} onEventClick={handleEventClick} />
        )}
        {view === 'mes' && (
          <MonthView date={currentDate} events={events} onEventClick={handleEventClick} />
        )}
        {view === 'ano' && (
          <YearView date={currentDate} events={events} onMonthClick={handleMonthClick} />
        )}
      </div>

      {/* Appointment Modal for Create/Edit */}
      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingAppointment}
        initialDate={currentDate}
        onSuccess={fetchData}
      />

      {/* MT Event View Modal */}
      <MTEventViewModal
        open={mtViewModalOpen}
        onOpenChange={setMtViewModalOpen}
        event={selectedMTEvent}
      />
    </div>
  );
}
