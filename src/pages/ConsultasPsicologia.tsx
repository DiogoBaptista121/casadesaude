import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
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
  Calendar,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { ConsultaStatus, Psicologa } from '@/types/database';
import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const SERVICO_NOME = 'Psicologia';
const FIXED_LOCAL = 'Casa de Saúde';

// -----------------------------------------------------------------------
// Row type for this page (no NIF lookup — uses free text)
// -----------------------------------------------------------------------
interface PsicologiaRow {
  id: string;
  consulta_id: string;
  paciente_nome: string;       // stored in paciente_nif column (free text)
  data_consulta: string;
  hora_consulta: string;
  status: string;
  local: string | null;
  psicologa_id: string | null;
  psicologa_nome: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function ConsultasPsicologiaPage() {
  const { role, user } = useAuth();
  const canEdit = ['admin', 'gestor', 'psicologa'].includes(role || '');
  const isPsicologa = role === 'psicologa';

  // For psicologa role: the linked psicologas record
  const [myPsicologa, setMyPsicologa] = useState<{ id: string; nome: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<PsicologiaRow[]>([]);
  const [psicologas, setPsicologas] = useState<Psicologa[]>([]);
  const [psicologiaServicoId, setPsicologiaServicoId] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');
  const [psicologaFilter, setPsicologaFilter] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<string>('recentes');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<PsicologiaRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConsulta, setDeletingConsulta] = useState<PsicologiaRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    paciente_nome: '',
    contacto: '',
    psicologa_id: '',
    data: '',
    hora: '',
    status: 'agendada' as ConsultaStatus,
    notas: '',
  });

  useEffect(() => {
    // If psicologa role, find my linked psicologas record first
    if (isPsicologa && user?.id) {
      (supabase as any)
        .from('psicologas')
        .select('id, nome')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }: { data: { id: string; nome: string } | null }) => {
          if (data) setMyPsicologa(data);
          fetchData();
        });
    } else {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const [servicosRes, psicologasRes, consultasRes] = await Promise.all([
      supabase
        .from('servicos')
        .select('id, nome')
        .eq('nome', SERVICO_NOME)
        .maybeSingle(),
      (supabase as any)
        .from('psicologas')
        .select('id, nome, email, telefone, ativo, created_at, updated_at')
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('consultas')
        .select('*, servicos(nome, cor)')
        .order('data', { ascending: false })
        .order('hora', { ascending: true }),
    ]);

    if (servicosRes.data) {
      setPsicologiaServicoId((servicosRes.data as any).id);
    }

    // Build psicologas map for name resolution
    const psicologasList = (psicologasRes.data ?? []) as unknown as Psicologa[];
    if (psicologasRes.data) {
      setPsicologas(psicologasList);
    }
    const psicologasMap = new Map<string, string>();
    psicologasList.forEach((p) => psicologasMap.set(p.id, p.nome));

    if (consultasRes.error) {
      toast.error('Erro ao carregar consultas: ' + consultasRes.error.message);
    } else {
      // Keep only Psicologia rows
      const rows = ((consultasRes.data ?? []) as any[])
        .filter((c) => c.servicos?.nome === SERVICO_NOME)
        .map((c) => ({
          id: c.id,
          consulta_id: c.id,
          paciente_nome: c.paciente_nif ?? '',   // free-text stored here
          data_consulta: c.data,
          hora_consulta: c.hora,
          status: c.status,
          local: c.local ?? null,
          psicologa_id: c.psicologa_id ?? null,
          psicologa_nome: c.psicologa_id ? (psicologasMap.get(c.psicologa_id) ?? null) : null,
          notas: c.notas ?? null,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));

      setConsultas(rows as PsicologiaRow[]);
    }

    setLoading(false);
  };

  // ------------------------------------------------------------------
  // Filters — auto-restrict for psicologa role
  // ------------------------------------------------------------------
  const filteredConsultas = (() => {
    let list = consultas.filter((c) => {
      // When psicologa role, only show own consultations
      if (isPsicologa && myPsicologa && c.psicologa_id !== myPsicologa.id) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !c.paciente_nome?.toLowerCase().includes(term) &&
          !c.psicologa_nome?.toLowerCase().includes(term)
        ) return false;
      }
      if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
      if (dataFilter && c.data_consulta !== dataFilter) return false;
      if (!isPsicologa && psicologaFilter !== 'todas' && c.psicologa_id !== psicologaFilter) return false;
      return true;
    });

    switch (sortBy) {
      case 'nome_asc':
        list = [...list].sort((a, b) =>
          (a.paciente_nome ?? '').localeCompare(b.paciente_nome ?? '', 'pt')
        );
        break;
      case 'status':
        list = [...list].sort((a, b) => a.status.localeCompare(b.status, 'pt'));
        break;
      case 'recentes':
      default:
        list = [...list].sort((a, b) => {
          const cmp = b.data_consulta.localeCompare(a.data_consulta);
          if (cmp !== 0) return cmp;
          return (b.hora_consulta ?? '').localeCompare(a.hora_consulta ?? '');
        });
        break;
    }
    return list;
  })();

  // ------------------------------------------------------------------
  // Modal helpers
  // ------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingConsulta(null);
    setFormData({
      paciente_nome: '',
      contacto: '',
      psicologa_id: isPsicologa && myPsicologa ? myPsicologa.id : '',
      data: new Date().toISOString().split('T')[0],
      hora: '09:00',
      status: 'agendada',
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (consulta: PsicologiaRow) => {
    setEditingConsulta(consulta);
    setFormData({
      paciente_nome: consulta.paciente_nome,
      contacto: '',
      psicologa_id: consulta.psicologa_id ?? '',
      data: consulta.data_consulta,
      hora: (consulta.hora_consulta ?? '09:00').substring(0, 5),
      status: consulta.status as ConsultaStatus,
      notas: consulta.notas ?? '',
    });
    setModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    if (!formData.paciente_nome.trim()) {
      toast.error('Introduza o nome do paciente');
      return;
    }
    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    setSaving(true);

    // paciente_nif stores the name (free text) for Psicologia
    // contacto is stored in notas prefixed if provided
    const notasComContacto = formData.contacto.trim()
      ? `Contacto: ${formData.contacto.trim()}${formData.notas.trim() ? '\n' + formData.notas.trim() : ''}`
      : formData.notas.trim() || null;

    if (editingConsulta) {
      const { error } = await supabase
        .from('consultas')
        .update({
          paciente_nif: formData.paciente_nome.trim(),
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: notasComContacto,
          local: FIXED_LOCAL,
          psicologa_id: formData.psicologa_id || null,
        } as any)
        .eq('id', editingConsulta.consulta_id);

      if (error) {
        toast.error('Erro ao atualizar: ' + error.message);
      } else {
        toast.success('Consulta atualizada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      if (!psicologiaServicoId) {
        toast.error('Serviço "Psicologia" não encontrado na base de dados');
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from('consultas')
        .insert([{
          paciente_nif: formData.paciente_nome.trim(),
          servico_id: psicologiaServicoId,
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: notasComContacto,
          local: FIXED_LOCAL,
          psicologa_id: formData.psicologa_id || null,
        }] as any);

      if (error) {
        toast.error('Erro ao criar marcação: ' + error.message);
      } else {
        toast.success('Marcação criada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  const openDeleteDialog = (consulta: PsicologiaRow) => {
    setDeletingConsulta(consulta);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingConsulta) return;
    setDeleting(true);
    const { error } = await supabase
      .from('consultas')
      .delete()
      .eq('id', deletingConsulta.consulta_id);

    if (error) {
      toast.error(
        error.code === '42501'
          ? 'Não tem permissão para eliminar esta marcação.'
          : 'Erro ao eliminar: ' + error.message
      );
    } else {
      toast.success('Marcação eliminada com sucesso');
      setDeleteDialogOpen(false);
      setDeletingConsulta(null);
      fetchData();
    }
    setDeleting(false);
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  const handleExport = () => {
    const exportData = filteredConsultas.map((c) => ({
      'Data': c.data_consulta,
      'Hora': (c.hora_consulta ?? '').substring(0, 5),
      'Paciente': c.paciente_nome,
      'Psicóloga': c.psicologa_nome ?? '',
      'Local': c.local ?? '',
      'Status': c.status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Psicologia');
    XLSX.writeFile(wb, `consultas_psicologia_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  // ------------------------------------------------------------------
  // Bulk delete
  // ------------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase
      .from('consultas')
      .delete()
      .in('id', selectedIds as any);
    if (error) {
      toast.error(
        error.code === '42501'
          ? 'Não tem permissão para eliminar as marcações selecionadas.'
          : 'Erro ao eliminar: ' + error.message
      );
    } else {
      toast.success(`${selectedIds.length} marcação(ões) eliminada(s)`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      fetchData();
    }
    setBulkDeleting(false);
  };

  const formatData = (data: string) => {
    try {
      return format(new Date(data), "dd 'de' MMM, yyyy", { locale: pt });
    } catch {
      return data;
    }
  };

  // Select-all helpers
  const allFilteredIds = filteredConsultas.map((c) => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  // ------------------------------------------------------------------
  // Table columns
  // ------------------------------------------------------------------
  const columns: Column<PsicologiaRow>[] = [];

  if (canEdit) {
    columns.push({
      key: 'select' as any,
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-gray-300"
          aria-label="Selecionar todas"
        />
      ) as any,
      cell: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedIds((prev) =>
              e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
            );
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      className: 'w-10',
    });
  }

  columns.push(
    {
      key: 'data',
      header: 'Data/Hora',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{formatData(item.data_consulta)}</p>
          <p className="text-xs text-muted-foreground">
            {(item.hora_consulta ?? '').substring(0, 5)}
          </p>
        </div>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      cell: (item) => (
        <p className="font-medium text-sm">{item.paciente_nome || '—'}</p>
      ),
    },
    {
      key: 'psicologa',
      header: 'Psicóloga',
      cell: (item) => (
        <p className="text-sm">{item.psicologa_nome ?? '—'}</p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status as ConsultaStatus} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); openDeleteDialog(item); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
      className: 'w-16',
    }
  );

  const isEditing = !!editingConsulta;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="page-enter flex flex-col h-full gap-3">
      {/* BLOCO 1: PageHeader */}
      <PageHeader title="Psicologia" description="Gestão de consultas por psicóloga">
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="gap-2 h-10 shadow-sm">
              <FileDown className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2 h-10 shadow-sm">
              <Plus className="w-4 h-4" />
              Nova Marcação
            </Button>
          </div>
        )}
      </PageHeader>

      {/* BLOCO 2: Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0 w-full flex-wrap bg-muted/40 py-3 px-4 rounded-xl">
        {/* Psicóloga — hidden for psicologa role (auto-filtered) */}
        {!isPsicologa && (
          <Select value={psicologaFilter} onValueChange={setPsicologaFilter}>
            <SelectTrigger className="w-full sm:w-48 h-9 shrink-0">
              <SelectValue placeholder="Todas as psicólogas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as psicólogas</SelectItem>
              {psicologas.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome do paciente ou psicóloga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Data */}
        <Input
          type="date"
          value={dataFilter}
          onChange={(e) => setDataFilter(e.target.value)}
          className="w-full sm:w-40 h-9 shrink-0"
        />

        {/* Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 h-9 shrink-0">
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

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 h-9 shrink-0">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais Recentes</SelectItem>
            <SelectItem value="nome_asc">Nome Paciente (A-Z)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        {canEdit && selectedIds.length > 0 && (
          <Button
            variant="destructive"
            className="gap-2 h-9 shrink-0 sm:ml-auto w-full sm:w-auto"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* BLOCO 3: Card da Tabela */}
      <div className="border border-border/50 rounded-lg overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={filteredConsultas}
            loading={loading}
            emptyTitle="Sem marcações"
            emptyDescription="Ainda não existem marcações de Psicologia registadas."
            onRowClick={canEdit ? openEditModal : undefined}
          />
        </div>

        {!loading && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t bg-muted/20">
            <span>
              A mostrar{' '}
              <span className="font-semibold text-foreground">{filteredConsultas.length}</span> de{' '}
              <span className="font-semibold text-foreground">{consultas.length}</span> marcações
            </span>
            {selectedIds.length > 0 && (
              <span className="text-primary font-medium">{selectedIds.length} selecionada(s)</span>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
          <div className="max-h-[90vh] overflow-y-auto px-6 py-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="w-5 h-5 text-primary" />
                {isEditing ? 'Editar Marcação' : 'Nova Marcação — Psicologia'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                {isEditing ? 'Atualize os dados da consulta' : 'Agende uma nova consulta de Psicologia'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
            {/* Nome do Paciente */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Nome completo do paciente *</Label>
              <Input
                placeholder="Nome completo..."
                value={formData.paciente_nome}
                onChange={(e) => setFormData({ ...formData, paciente_nome: e.target.value })}
              />
            </div>

            {/* Contacto e Psicóloga lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Contacto / Telefone</Label>
                <Input
                  placeholder="Nº de telemóvel ou email..."
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Psicóloga</Label>
                {isPsicologa && myPsicologa ? (
                  <Input value={myPsicologa.nome} disabled className="bg-muted/50 cursor-not-allowed" />
                ) : (
                  <Select
                    value={formData.psicologa_id}
                    onValueChange={(value) => setFormData({ ...formData, psicologa_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={psicologas.length === 0 ? 'Sem psicólogas ativas' : 'Selecione a psicóloga...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {psicologas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Data *</Label>
                <DatePickerInput
                  value={formData.data}
                  onChange={(v) => setFormData({ ...formData, data: v })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Hora *</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(value: ConsultaStatus) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="falta">Falta</SelectItem>
                  <SelectItem value="remarcada">Remarcada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Notas</Label>
              <Textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observações da consulta..." rows={3} className="resize-none" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end mt-8 border-t pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar' : 'Criar Marcação'}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Marcação"
        description="Tem a certeza que deseja eliminar esta marcação? Esta ação não pode ser desfeita."
      />

      {/* Bulk Delete */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Eliminar Marcações Selecionadas"
        description={`Tem a certeza que deseja eliminar ${selectedIds.length} marcação(ões)? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
