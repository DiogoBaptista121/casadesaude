import { useEffect, useState } from 'react';
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
  Brain,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { ConsultaStatus } from '@/types/database';
import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const SERVICO_NOME = 'Neurologia';
const NIF_PLACEHOLDER = 'sessao'; // fixed value — no real patient

const LOCAIS = [
  'Casa de Saúde',
  'Termas de Monfortinho',
  'Monfortinho',
  'Torre',
  'Segura',
  'Salvaterra do Extremo',
  'Medelim',
  'Alcafozes',
  'Toulões',
  'Idanha-a-Velha',
  'Penha Garcia',
  'Aldeia de Santa Margarida',
  'Proença-a-Velha',
  'Monsanto',
  'Zebreira',
  'Ladoeiro',
  'São Miguel de Acha',
  'Oledo',
  'Cegonhas',
  'Soalheiras',
  'Rosmaninhal',
];

// -----------------------------------------------------------------------
// Row type
// -----------------------------------------------------------------------
interface SessaoRow {
  id: string;
  data_consulta: string;
  hora_consulta: string;
  local: string | null;
  notas: string | null;
  status: string;
  created_at: string | null;
}

export default function ConsultasNeurologiaPage() {
  const { canEdit } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessoes, setSessoes] = useState<SessaoRow[]>([]);
  const [neurologiaServicoId, setNeurologiaServicoId] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dataFilter, setDataFilter] = useState('');
  const [sortBy, setSortBy] = useState('recentes');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSessao, setEditingSessao] = useState<SessaoRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSessao, setDeletingSessao] = useState<SessaoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    data: '',
    hora_inicio: '',
    hora_fim: '',
    local: '',
    notas: '',
    status: 'agendada' as ConsultaStatus,
  });

  useEffect(() => { fetchData(); }, []);

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const [servicosRes, consultasRes] = await Promise.all([
      supabase.from('servicos').select('id').eq('nome', SERVICO_NOME).maybeSingle(),
      supabase
        .from('consultas')
        .select('id, data, hora, local, notas, status, created_at, servicos(nome)')
        .eq('paciente_nif', NIF_PLACEHOLDER)
        .order('data', { ascending: false })
        .order('hora', { ascending: true }),
    ]);

    if (servicosRes.data) setNeurologiaServicoId((servicosRes.data as any).id);

    if (consultasRes.error) {
      toast.error('Erro ao carregar sessões: ' + consultasRes.error.message);
    } else {
      // Also filter by servico to be safe
      const rows = ((consultasRes.data ?? []) as any[])
        .filter((c) => c.servicos?.nome === SERVICO_NOME || neurologiaServicoId)
        .map((c) => ({
          id: c.id,
          data_consulta: c.data,
          hora_consulta: c.hora,
          local: c.local ?? null,
          notas: c.notas ?? null,
          status: c.status,
          created_at: c.created_at,
        }));
      setSessoes(rows);
    }

    setLoading(false);
  };

  // ------------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------------
  const filteredSessoes = (() => {
    let list = sessoes.filter((s) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!s.local?.toLowerCase().includes(term) && !s.notas?.toLowerCase().includes(term)) return false;
      }
      if (dataFilter && s.data_consulta !== dataFilter) return false;
      return true;
    });
    switch (sortBy) {
      case 'local_asc':
        list = [...list].sort((a, b) => (a.local ?? '').localeCompare(b.local ?? '', 'pt'));
        break;
      default: // recentes
        list = [...list].sort((a, b) => {
          const cmp = b.data_consulta.localeCompare(a.data_consulta);
          return cmp !== 0 ? cmp : (b.hora_consulta ?? '').localeCompare(a.hora_consulta ?? '');
        });
    }
    return list;
  })();

  // ------------------------------------------------------------------
  // Modal helpers
  // ------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingSessao(null);
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora_inicio: '09:00',
      hora_fim: '10:00',
      local: '',
      notas: '',
      status: 'agendada',
    });
    setModalOpen(true);
  };

  const openEditModal = (s: SessaoRow) => {
    setEditingSessao(s);
    let hInicio = '09:00';
    let hFim = '10:00';
    if (s.hora_consulta && s.hora_consulta.includes(' - ')) {
      const parts = s.hora_consulta.split(' - ');
      hInicio = parts[0] || '09:00';
      hFim = parts[1] || '10:00';
    } else if (s.hora_consulta) {
      hInicio = s.hora_consulta.substring(0, 5);
      hFim = '';
    }
    setFormData({
      data: s.data_consulta,
      hora_inicio: hInicio,
      hora_fim: hFim,
      local: s.local ?? '',
      notas: s.notas ?? '',
      status: s.status as ConsultaStatus,
    });
    setModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    if (!formData.data || !formData.hora_inicio || !formData.hora_fim) { toast.error('Preencha a data e intervalo de horas'); return; }
    if (!formData.local) { toast.error('Selecione um local'); return; }

    setSaving(true);
    const horaFormatada = `${formData.hora_inicio} - ${formData.hora_fim}`;

    if (editingSessao) {
      const { error } = await supabase
        .from('consultas')
        .update({ data: formData.data, hora: horaFormatada, local: formData.local, notas: formData.notas.trim() || null, status: formData.status } as any)
        .eq('id', editingSessao.id);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); }
      else { toast.success('Sessão atualizada'); setModalOpen(false); fetchData(); }
    } else {
      if (!neurologiaServicoId) { toast.error('Serviço "Neurologia" não encontrado'); setSaving(false); return; }
      const { error } = await supabase
        .from('consultas')
        .insert([{ paciente_nif: NIF_PLACEHOLDER, servico_id: neurologiaServicoId, data: formData.data, hora: horaFormatada, local: formData.local, notas: formData.notas.trim() || null, status: formData.status }] as any);
      if (error) { toast.error('Erro ao criar sessão: ' + error.message); }
      else { toast.success('Sessão criada com sucesso'); setModalOpen(false); fetchData(); }
    }
    setSaving(false);
  };

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  const openDeleteDialog = (s: SessaoRow) => { setDeletingSessao(s); setDeleteDialogOpen(true); };
  const handleDelete = async () => {
    if (!deletingSessao) return;
    setDeleting(true);
    const { error } = await supabase.from('consultas').delete().eq('id', deletingSessao.id);
    if (error) { toast.error(error.code === '42501' ? 'Sem permissão para eliminar.' : 'Erro: ' + error.message); }
    else { toast.success('Sessão eliminada'); setDeleteDialogOpen(false); setDeletingSessao(null); fetchData(); }
    setDeleting(false);
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  const handleExport = () => {
    const data = filteredSessoes.map((s) => ({
      'Data': s.data_consulta, 'Hora': s.hora_consulta ?? '',
      'Local': s.local ?? '', 'Notas': s.notas ?? '', 'Status': s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Neurologia');
    XLSX.writeFile(wb, `sessoes_neurologia_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado');
  };

  // ------------------------------------------------------------------
  // Bulk delete
  // ------------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    const { error } = await supabase.from('consultas').delete().in('id', selectedIds as any);
    if (error) { toast.error('Erro ao eliminar: ' + error.message); }
    else { toast.success(`${selectedIds.length} sessão(ões) eliminada(s)`); setSelectedIds([]); setBulkDeleteDialogOpen(false); fetchData(); }
    setBulkDeleting(false);
  };

  const formatData = (d: string) => { try { return format(new Date(d), "dd 'de' MMM, yyyy", { locale: pt }); } catch { return d; } };

  // Select-all
  const allFilteredIds = filteredSessoes.map((s) => s.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds((p) => p.filter((id) => !allFilteredIds.includes(id))); }
    else { setSelectedIds((p) => [...new Set([...p, ...allFilteredIds])]); }
  };

  // ------------------------------------------------------------------
  // Table columns
  // ------------------------------------------------------------------
  const columns: Column<SessaoRow>[] = [];
  if (canEdit) {
    columns.push({
      key: 'select' as any,
      header: (<input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300" aria-label="Selecionar todas" />) as any,
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
          <p className="font-medium text-sm">{formatData(item.data_consulta)}</p>
          <p className="text-xs text-muted-foreground">{item.hora_consulta}</p>
        </div>
      ),
    },
    { key: 'local', header: 'Local', cell: (item) => <p className="text-sm font-medium">{item.local ?? '—'}</p> },
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

  const isEditing = !!editingSessao;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="page-enter flex flex-col h-full gap-3">
      {/* BLOCO 1: PageHeader */}
      <PageHeader title="Neurologia" description="Sessões agendadas pelo médico">
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="gap-2 h-10 shadow-sm">
              <FileDown className="w-4 h-4" /> Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2 h-10 shadow-sm">
              <Plus className="w-4 h-4" /> Nova Sessão
            </Button>
          </div>
        )}
      </PageHeader>

      {/* BLOCO 2: Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0 w-full bg-muted/40 py-3 px-4 rounded-xl">
        <div className="relative w-full sm:max-w-sm shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Local ou notas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
        </div>
        <Input type="date" value={dataFilter} onChange={(e) => setDataFilter(e.target.value)} className="w-full sm:w-40 h-9 shrink-0" />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 h-9 shrink-0"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais Recentes</SelectItem>
            <SelectItem value="local_asc">Local (A-Z)</SelectItem>
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
          <DataTable columns={columns} data={filteredSessoes} loading={loading}
            emptyTitle="Sem sessões" emptyDescription="Ainda não existem sessões de Neurologia registadas."
            onRowClick={canEdit ? openEditModal : undefined} />
        </div>
        {!loading && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t bg-muted/20">
            <span>A mostrar <span className="font-semibold text-foreground">{filteredSessoes.length}</span> de <span className="font-semibold text-foreground">{sessoes.length}</span> sessões</span>
            {selectedIds.length > 0 && <span className="text-primary font-medium">{selectedIds.length} selecionada(s)</span>}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
          <div className="max-h-[90vh] overflow-y-auto px-6 py-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Brain className="w-5 h-5 text-primary" />
                {isEditing ? 'Editar Sessão' : 'Nova Sessão — Neurologia'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                {isEditing ? 'Atualize os dados da sessão' : 'Agende uma sessão de Neurologia'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Local */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Local *</Label>
                <Select value={formData.local} onValueChange={(v) => setFormData({ ...formData, local: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                  <SelectContent>
                    {LOCAIS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Data *</Label>
                  <DatePickerInput value={formData.data} onChange={(v) => setFormData({ ...formData, data: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Hora Início *</Label>
                  <Input type="time" value={formData.hora_inicio} onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Hora Fim *</Label>
                  <Input type="time" value={formData.hora_fim} onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })} />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(v: ConsultaStatus) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="remarcada">Remarcada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Notas</Label>
                <Textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observações..." rows={3} className="resize-none" />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end mt-8 border-t pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Guardar' : 'Criar Sessão'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} loading={deleting}
        title="Eliminar Sessão" description="Tem a certeza que deseja eliminar esta sessão? Esta ação não pode ser desfeita." />
      <DeleteConfirmationDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen} onConfirm={handleBulkDelete} loading={bulkDeleting}
        title="Eliminar Sessões Selecionadas" description={`Tem a certeza que deseja eliminar ${selectedIds.length} sessão(ões)?`} />
    </div>
  );
}
