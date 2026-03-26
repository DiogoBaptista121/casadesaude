import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  FileDown,
  Edit2,
  Loader2,
  Truck,
  Trash2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { CartaoSaudePorNif } from '@/types/database';
import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------
// Rota schedule — identical to AgendaUnidadeMovel.tsx
// -----------------------------------------------------------------------
const rotasUnidadeMovel = [
  { local: 'Termas de Monfortinho', dataInicio: '2026-03-02', horario: '09:00 - 10:30' },
  { local: 'Monfortinho',           dataInicio: '2026-03-02', horario: '11:00 - 12:00' },
  { local: 'Torre',                 dataInicio: '2026-03-02', horario: '12:10 - 13:00' },
  { local: 'Segura',                dataInicio: '2026-03-03', horario: '09:00 - 11:00' },
  { local: 'Salvaterra do Extremo', dataInicio: '2026-03-03', horario: '11:30 - 13:00' },
  { local: 'Medelim',               dataInicio: '2026-03-04', horario: '09:00 - 11:00' },
  { local: 'Alcafozes',             dataInicio: '2026-03-04', horario: '11:30 - 13:00' },
  { local: 'Toulões',               dataInicio: '2026-03-05', horario: '09:00 - 11:00' },
  { local: 'Idanha-a-Velha',        dataInicio: '2026-03-05', horario: '11:30 - 13:00' },
  { local: 'Penha Garcia',          dataInicio: '2026-03-06', horario: '09:00 - 13:00' },
  { local: 'Aldeia de Santa Margarida', dataInicio: '2026-03-09', horario: '09:00 - 11:00' },
  { local: 'Proença-a-Velha',       dataInicio: '2026-03-09', horario: '11:30 - 13:00' },
  { local: 'Monsanto',              dataInicio: '2026-03-10', horario: '09:00 - 13:00' },
  { local: 'Zebreira',              dataInicio: '2026-03-11', horario: '09:00 - 13:00' },
  { local: 'Ladoeiro',              dataInicio: '2026-03-11', horario: '14:30 - 16:30' },
  { local: 'São Miguel de Acha',    dataInicio: '2026-03-12', horario: '09:00 - 11:00' },
  { local: 'Oledo',                 dataInicio: '2026-03-12', horario: '11:30 - 13:00' },
  { local: 'Cegonhas',              dataInicio: '2026-03-13', horario: '09:00 - 10:00' },
  { local: 'Soalheiras',            dataInicio: '2026-03-13', horario: '10:30 - 11:00' },
  { local: 'Rosmaninhal',           dataInicio: '2026-03-13', horario: '11:30 - 13:00' },
];

// All distinct place names for the filter dropdown
const ALL_LOCAIS = [...new Set(rotasUnidadeMovel.map((r) => r.local))].sort();

// Returns the array of { local, horario } scheduled for a given YYYY-MM-DD date
function rotasParaData(dateStr: string): { local: string; horario: string }[] {
  const target = new Date(dateStr + 'T12:00:00');
  const result: { local: string; horario: string }[] = [];

  rotasUnidadeMovel.forEach((rota) => {
    const origem = new Date(rota.dataInicio + 'T12:00:00');
    if (target < origem) return; // before first occurrence
    const diffDays = Math.round((target.getTime() - origem.getTime()) / 86400000);
    if (diffDays % 14 === 0) {
      result.push({ local: rota.local, horario: rota.horario });
    }
  });

  return result;
}

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const TIPO = 'unidade_movel';
const SERVICOS_PERMITIDOS = ['Medicina Geral', 'Enfermagem'];
const OPCAO_AMBOS = 'Ambos';

// -----------------------------------------------------------------------
// Row type
// -----------------------------------------------------------------------
interface AtendimentoRow {
  id: string;
  paciente_nif: string;
  nome_completo: string | null;
  numero_cartao: string | null;
  data: string;
  hora: string | null;
  local: string;
  servico_nome: string | null;
  notas: string | null;
  created_at: string;
}

const currentTimeHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function ConsultasUnidadeMovelPage() {
  const { role, user } = useAuth();
  const canEdit = ['admin', 'gestor', 'colaborador_unidade_movel'].includes(role || '');

  const [loading, setLoading] = useState(true);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([]);
  // Map: servico nome → id
  const [servicoIds, setServicoIds] = useState<Record<string, string>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dataFilter, setDataFilter] = useState('');
  const [localFilter, setLocalFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('recentes');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<AtendimentoRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAtendimento, setDeletingAtendimento] = useState<AtendimentoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // NIF lookup
  const [nifValue, setNifValue] = useState('');
  const [nifLookup, setNifLookup] = useState<CartaoSaudePorNif | null>(null);
  const [nifSuggestions, setNifSuggestions] = useState<CartaoSaudePorNif[]>([]);
  const [nifError, setNifError] = useState('');
  const [nifSearching, setNifSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [formData, setFormData] = useState({
    local: '',
    hora: '',
    data: todayStr(),
    servico: '' as string,
    notas: '',
  });

  // Today's scheduled visits
  const visitasHoje = useMemo(() => rotasParaData(todayStr()), []);

  useEffect(() => { fetchData(); }, []);

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const [servicosRes, atendimentosRes] = await Promise.all([
      supabase
        .from('servicos')
        .select('id, nome')
        .in('nome', SERVICOS_PERMITIDOS),
      (supabase as any)
        .from('atendimentos')
        .select('*, servicos(nome)')
        .eq('tipo', TIPO)
        .order('data', { ascending: false }),
    ]);

    if (servicosRes.data) {
      const map: Record<string, string> = {};
      (servicosRes.data as any[]).forEach((s) => { map[s.nome] = s.id; });
      setServicoIds(map);
    }

    if (atendimentosRes.error) {
      toast.error('Erro ao carregar registos: ' + atendimentosRes.error.message);
    } else {
      const rows: AtendimentoRow[] = (atendimentosRes.data ?? []).map((a: any) => ({
        id: a.id,
        paciente_nif: a.paciente_nif ?? '',
        nome_completo: null,
        numero_cartao: null,
        data: a.data,
        hora: a.hora ?? null,
        local: a.local ?? '',
        servico_nome: a.servicos?.nome ?? null,
        notas: a.notas ?? null,
        created_at: a.created_at,
      }));

      // Batch NIF → name
      const nifsUnicos = [...new Set(rows.map((r) => r.paciente_nif).filter(Boolean))];
      if (nifsUnicos.length > 0) {
        const { data: cartoes } = await supabase
          .from('cartao_saude')
          .select('nif, nome_completo, numero_cartao')
          .in('nif', nifsUnicos as any);
        const cartaoMap = new Map<string, any>();
        ((cartoes ?? []) as any[]).forEach((c) => cartaoMap.set(c.nif, c));
        rows.forEach((r) => {
          const c = cartaoMap.get(r.paciente_nif);
          if (c) { r.nome_completo = c.nome_completo; r.numero_cartao = c.numero_cartao; }
        });
      }

      setAtendimentos(rows);
    }
    setLoading(false);
  };

  // ------------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------------
  const filteredAtendimentos = useMemo(() => {
    let list = atendimentos.filter((a) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !a.nome_completo?.toLowerCase().includes(term) &&
          !a.paciente_nif?.toLowerCase().includes(term)
        ) return false;
      }
      if (dataFilter && a.data !== dataFilter) return false;
      if (localFilter !== 'todos' && a.local !== localFilter) return false;
      return true;
    });
    switch (sortBy) {
      case 'nome_asc':
        list = [...list].sort((a, b) =>
          (a.nome_completo ?? a.paciente_nif).localeCompare(b.nome_completo ?? b.paciente_nif, 'pt')
        );
        break;
      case 'local':
        list = [...list].sort((a, b) => a.local.localeCompare(b.local, 'pt'));
        break;
      default: // recentes
        list = [...list].sort((a, b) => {
          const cmp = b.data.localeCompare(a.data);
          return cmp !== 0 ? cmp : (b.hora ?? '').localeCompare(a.hora ?? '');
        });
    }
    return list;
  }, [atendimentos, searchTerm, dataFilter, localFilter, sortBy]);

  // ------------------------------------------------------------------
  // NIF predictive search
  // ------------------------------------------------------------------
  const clearNifState = () => {
    setNifLookup(null); setNifSuggestions([]); setNifError(''); setShowSuggestions(false);
  };

  const selectSuggestion = (cartao: CartaoSaudePorNif) => {
    setNifValue(cartao.nome_completo ?? cartao.nif);
    setNifLookup(cartao);
    setNifSuggestions([]); setShowSuggestions(false); setNifError('');
  };

  const handleNifChange = (raw: string) => {
    setNifValue(raw); setNifLookup(null);
    if (raw.trim().length === 0) { clearNifState(); setNifSearching(false); if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current); return; }
    if (raw.trim().length < 3) { clearNifState(); return; }
    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
    setNifSearching(true);
    nifDebounceRef.current = setTimeout(async () => {
      try {
        const trimmed = raw.trim();
        const isExact = /^\d{9}$/.test(trimmed);
        if (isExact) {
          const { data, error } = await supabase.from('cartao_saude').select('id, nif, nome_completo, numero_cartao, telefone, estado_entrega').eq('nif', trimmed).maybeSingle();
          if (error) { setNifError('Erro: ' + error.message); }
          else if (!data) { setNifError('NIF não encontrado no Cartão de Saúde'); }
          else { setNifLookup(data as unknown as CartaoSaudePorNif); setNifSuggestions([]); setShowSuggestions(false); setNifError(''); }
        } else {
          const { data, error } = await supabase.from('cartao_saude').select('id, nif, nome_completo, numero_cartao, telefone, estado_entrega').or(`nome_completo.ilike.%${trimmed}%,nif.ilike.%${trimmed}%`).limit(10);
          if (!error && data && data.length > 0) { setNifSuggestions(data as unknown as CartaoSaudePorNif[]); setShowSuggestions(true); setNifLookup(null); setNifError(''); }
          else { setNifSuggestions([]); setShowSuggestions(false); setNifError(trimmed.length >= 4 ? 'Sem resultados para este NIF/nome' : ''); }
        }
      } finally { setNifSearching(false); }
    }, 250);
  };

  // ------------------------------------------------------------------
  // Modal: when local changes, auto-fill horário from schedule
  // ------------------------------------------------------------------
  const handleLocalChange = (local: string) => {
    const rotaHoje = visitasHoje.find((v) => v.local === local);
    const horario = rotaHoje?.horario ?? '';
    // Use the start time of the horário range as the default time
    const horaInicio = horario.split(' - ')[0] ?? '';
    setFormData((f) => ({ ...f, local, hora: horaInicio }));
  };

  // ------------------------------------------------------------------
  // Modal helpers
  // ------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingAtendimento(null);
    setNifValue(''); clearNifState(); setNifSearching(false);
    // Pre-fill local with first visit of today (if any)
    const primeiraVisita = visitasHoje[0];
    const horaInicio = primeiraVisita ? primeiraVisita.horario.split(' - ')[0] : currentTimeHHMM();
    setFormData({
      local: primeiraVisita?.local ?? '',
      hora: horaInicio,
      data: todayStr(),
      servico: '',
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (a: AtendimentoRow) => {
    setEditingAtendimento(a);
    setNifValue(a.paciente_nif);
    setNifLookup(a.nome_completo ? ({ id: '', nif: a.paciente_nif, nome_completo: a.nome_completo, numero_cartao: a.numero_cartao, telefone: null, estado_entrega: null } as CartaoSaudePorNif) : null);
    setNifSuggestions([]); setShowSuggestions(false); setNifError('');
    setFormData({
      local: a.local,
      hora: (a.hora ?? currentTimeHHMM()).substring(0, 5),
      data: a.data,
      servico: a.servico_nome ?? '',
      notas: a.notas ?? '',
    });
    setModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    if (!formData.data) { toast.error('Preencha a data'); return; }
    if (!formData.local) { toast.error('Selecione o local'); return; }
    if (!nifLookup?.nif) { toast.error('Pesquise e selecione um utente da lista'); return; }
    if (!editingAtendimento && !formData.servico) { toast.error('Selecione o serviço'); return; }

    setSaving(true);

    if (editingAtendimento) {
      const { error } = await (supabase as any)
        .from('atendimentos')
        .update({ data: formData.data, hora: formData.hora || null, local: formData.local, notas: formData.notas.trim() || null })
        .eq('id', editingAtendimento.id);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); }
      else { toast.success('Registo atualizado'); setModalOpen(false); fetchData(); }
    } else {
      // Determine which service IDs to insert
      const servicosParaInserir: string[] = [];
      if (formData.servico === OPCAO_AMBOS) {
        SERVICOS_PERMITIDOS.forEach((nome) => {
          if (servicoIds[nome]) servicosParaInserir.push(servicoIds[nome]);
        });
      } else {
        if (servicoIds[formData.servico]) servicosParaInserir.push(servicoIds[formData.servico]);
      }

      if (servicosParaInserir.length === 0) {
        toast.error('Serviço não encontrado na base de dados');
        setSaving(false);
        return;
      }

      const registos = servicosParaInserir.map((servico_id) => ({
        paciente_nif: nifLookup.nif,
        servico_id,
        tipo: TIPO,
        local: formData.local,
        data: formData.data,
        hora: formData.hora || null,
        notas: formData.notas.trim() || null,
        created_by: user?.id ?? null,
      }));

      const { error } = await (supabase as any).from('atendimentos').insert(registos);
      if (error) { toast.error('Erro ao criar registo: ' + error.message); }
      else {
        toast.success(registos.length > 1 ? 'Dois registos criados (Medicina Geral + Enfermagem)' : 'Registo criado com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  const openDeleteDialog = (a: AtendimentoRow) => { setDeletingAtendimento(a); setDeleteDialogOpen(true); };
  const handleDelete = async () => {
    if (!deletingAtendimento) return;
    setDeleting(true);
    const { error } = await (supabase as any).from('atendimentos').delete().eq('id', deletingAtendimento.id);
    if (error) { toast.error(error.code === '42501' ? 'Sem permissão para eliminar.' : 'Erro: ' + error.message); }
    else { toast.success('Registo eliminado'); setDeleteDialogOpen(false); setDeletingAtendimento(null); fetchData(); }
    setDeleting(false);
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  const handleExport = () => {
    const exportData = filteredAtendimentos.map((a) => ({
      'Data': a.data, 'Hora': (a.hora ?? '').substring(0, 5),
      'Paciente': a.nome_completo ?? a.paciente_nif, 'NIF': a.paciente_nif,
      'Aldeia': a.local, 'Serviço': a.servico_nome ?? '', 'Notas': a.notas ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Unidade Móvel');
    XLSX.writeFile(wb, `unidade_movel_${todayStr()}.xlsx`);
    toast.success('Ficheiro exportado');
  };

  // ------------------------------------------------------------------
  // Bulk delete
  // ------------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    const { error } = await (supabase as any).from('atendimentos').delete().in('id', selectedIds);
    if (error) { toast.error('Erro ao eliminar: ' + error.message); }
    else { toast.success(`${selectedIds.length} registo(s) eliminado(s)`); setSelectedIds([]); setBulkDeleteDialogOpen(false); fetchData(); }
    setBulkDeleting(false);
  };

  const formatData = (d: string) => { try { return format(new Date(d), "dd 'de' MMM, yyyy", { locale: pt }); } catch { return d; } };

  // Select-all
  const allFilteredIds = filteredAtendimentos.map((a) => a.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds((p) => p.filter((id) => !allFilteredIds.includes(id))); }
    else { setSelectedIds((p) => [...new Set([...p, ...allFilteredIds])]); }
  };

  // ------------------------------------------------------------------
  // Table columns
  // ------------------------------------------------------------------
  const columns: Column<AtendimentoRow>[] = [];
  if (canEdit) {
    columns.push({
      key: 'select' as any,
      header: (<input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300" />) as any,
      cell: (item) => (
        <input type="checkbox" checked={selectedIds.includes(item.id)}
          onChange={(e) => { e.stopPropagation(); setSelectedIds((p) => e.target.checked ? [...p, item.id] : p.filter((id) => id !== item.id)); }}
          onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300" />
      ),
      className: 'w-10',
    });
  }
  columns.push(
    {
      key: 'data', header: 'Data / Hora',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{formatData(item.data)}</p>
          {item.hora && <p className="text-xs text-muted-foreground">{item.hora.substring(0, 5)}</p>}
        </div>
      ),
    },
    {
      key: 'paciente', header: 'Paciente',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{item.nome_completo ?? item.paciente_nif}</p>
          <p className="text-xs text-muted-foreground">NIF: {item.paciente_nif}{item.numero_cartao ? ` • Cartão: ${item.numero_cartao}` : ''}</p>
        </div>
      ),
    },
    { key: 'local', header: 'Aldeia', cell: (item) => <p className="text-sm">{item.local}</p> },
    { key: 'servico', header: 'Serviço', cell: (item) => <p className="text-sm">{item.servico_nome ?? '—'}</p> },
    { key: 'notas', header: 'Notas', cell: (item) => <p className="text-sm text-muted-foreground truncate max-w-xs">{item.notas ?? '—'}</p> },
    {
      key: 'actions', header: '',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditModal(item); }}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteDialog(item); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </>
          )}
        </div>
      ),
      className: 'w-16',
    }
  );

  const isEditing = !!editingAtendimento;
  // Locais to show in modal dropdown: today's if any, else all
  const locaisModal = visitasHoje.length > 0 ? visitasHoje : rotasUnidadeMovel.map((r) => ({ local: r.local, horario: r.horario }));

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="page-enter flex flex-col h-full gap-3">
      {/* BLOCO 1: PageHeader */}
      <PageHeader title="Unidade Móvel" description="Registo de atendimentos por aldeia">
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="gap-2 h-10 shadow-sm">
              <FileDown className="w-4 h-4" /> Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2 h-10 shadow-sm">
              <Plus className="w-4 h-4" /> Novo Registo
            </Button>
          </div>
        )}
      </PageHeader>

      {/* Visitas de Hoje — highlight card */}
      <div className="bg-card border border-border/50 rounded-lg shadow-sm p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Visitas de Hoje — {format(new Date(), "dd 'de' MMMM yyyy", { locale: pt })}
          </h2>
        </div>
        {visitasHoje.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem visitas programadas para hoje.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visitasHoje.map((v) => (
              <div key={v.local} className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-lg px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{v.local}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{v.horario}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 2: Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0 w-full flex-wrap bg-muted/40 py-3 px-4 rounded-xl">
        <Select value={localFilter} onValueChange={setLocalFilter}>
          <SelectTrigger className="w-full sm:w-48 h-9 shrink-0">
            <SelectValue placeholder="Todas as aldeias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as aldeias</SelectItem>
            {ALL_LOCAIS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Nome ou NIF do utente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
        </div>
        <Input type="date" value={dataFilter} onChange={(e) => setDataFilter(e.target.value)} className="w-full sm:w-40 h-9 shrink-0" />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 h-9 shrink-0"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais Recentes</SelectItem>
            <SelectItem value="nome_asc">Nome Utente (A-Z)</SelectItem>
            <SelectItem value="local">Aldeia (A-Z)</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && selectedIds.length > 0 && (
          <Button variant="destructive" className="gap-2 h-9 shrink-0 sm:ml-auto w-full sm:w-auto" onClick={() => setBulkDeleteDialogOpen(true)}>
            <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* BLOCO 3: Tabela */}
      <div className="border border-border/50 rounded-lg overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <DataTable columns={columns} data={filteredAtendimentos} loading={loading}
            emptyTitle="Sem registos" emptyDescription="Ainda não existem registos da Unidade Móvel."
            onRowClick={canEdit ? openEditModal : undefined} />
        </div>
        {!loading && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t bg-muted/20">
            <span>A mostrar <span className="font-semibold text-foreground">{filteredAtendimentos.length}</span> de <span className="font-semibold text-foreground">{atendimentos.length}</span> registos</span>
            {selectedIds.length > 0 && <span className="text-primary font-medium">{selectedIds.length} selecionado(s)</span>}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
          <div className="max-h-[90vh] overflow-y-auto px-6 py-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="w-5 h-5 text-primary" />
                {isEditing ? 'Editar Registo' : 'Novo Registo — Unidade Móvel'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                {isEditing ? 'Atualize os dados do atendimento' : 'Registe um atendimento da Unidade Móvel'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
            {/* NIF Lookup */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">NIF / Cartão de Saúde *</Label>
              <div className="relative">
                <Input placeholder="Pesquise por NIF ou nome (mín. 3 caracteres)" value={nifValue}
                  onChange={(e) => handleNifChange(e.target.value)} maxLength={9} disabled={isEditing}
                  className={`pr-8 ${nifError ? 'border-destructive' : ''}`} />
                {nifSearching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                {showSuggestions && nifSuggestions.length > 0 && !isEditing && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg">
                    {nifSuggestions.map((s) => (
                      <button key={s.id} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}>
                        <span className="font-medium truncate">{s.nome_completo}</span>
                        <span className="text-muted-foreground ml-2 shrink-0 text-xs">{s.nif}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {nifError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{nifError}</p>}
            </div>

            {/* Patient card */}
            {nifLookup && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm flex items-center gap-1.5 text-primary font-medium"><CheckCircle2 className="w-4 h-4" />Utente encontrado</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">Nome: </span><span className="font-medium">{nifLookup.nome_completo}</span></div>
                  <div><span className="text-muted-foreground">Nº Cartão: </span><span className="font-medium">{nifLookup.numero_cartao || '—'}</span></div>
                  {nifLookup.telefone && <div><span className="text-muted-foreground">Telefone: </span><span className="font-medium">{nifLookup.telefone}</span></div>}
                </div>
              </div>
            )}

            {/* Local + Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Local / Aldeia *</Label>
                <Select value={formData.local} onValueChange={handleLocalChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione a aldeia..." /></SelectTrigger>
                  <SelectContent>
                    {locaisModal.map((v) => (
                      <SelectItem key={v.local} value={v.local}>
                        <span className="flex flex-col">
                          <span>{v.local}</span>
                          <span className="text-xs text-muted-foreground">{v.horario}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Hora</Label>
                <Input type="time" value={formData.hora} onChange={(e) => setFormData({ ...formData, hora: e.target.value })} />
              </div>
            </div>

            {/* Data e Serviço */}
            <div className="grid grid-cols-2 gap-4">
              {/* Data */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Data *</Label>
                <DatePickerInput value={formData.data} onChange={(v) => setFormData({ ...formData, data: v })} />
              </div>

              {/* Serviço (só em criação) */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Serviço *</Label>
                  <Select value={formData.servico} onValueChange={(v) => setFormData({ ...formData, servico: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o serviço..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICOS_PERMITIDOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      <SelectItem value={OPCAO_AMBOS}>Ambos (Medicina Geral + Enfermagem)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.servico === OPCAO_AMBOS && (
                    <p className="text-xs text-muted-foreground">Serão criados dois registos separados.</p>
                  )}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Notas</Label>
              <Textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observações, procedimentos..." rows={3} className="resize-none" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end mt-8 border-t pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar' : 'Registar Atendimento'}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} loading={deleting}
        title="Eliminar Registo" description="Tem a certeza que deseja eliminar este registo? Esta ação não pode ser desfeita." />
      <DeleteConfirmationDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen} onConfirm={handleBulkDelete} loading={bulkDeleting}
        title="Eliminar Registos Selecionados" description={`Tem a certeza que deseja eliminar ${selectedIds.length} registo(s)?`} />
    </div>
  );
}
