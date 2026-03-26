import { useEffect, useRef, useState } from 'react';
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
  Stethoscope,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { CartaoSaudePorNif } from '@/types/database';
import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const SERVICO_NOME = 'Enfermagem';
const FIXED_LOCAL = 'Casa de Saúde';
const TIPO = 'enfermagem';

// -----------------------------------------------------------------------
// Row type for this page
// -----------------------------------------------------------------------
interface AtendimentoRow {
  id: string;
  paciente_nif: string;
  nome_completo: string | null;
  numero_cartao: string | null;
  data: string;
  hora: string | null;
  local: string;
  notas: string | null;
  created_at: string;
}

// Utility: current local time as HH:MM
const currentTimeHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export default function ConsultasEnfermagemPage() {
  const { canEdit, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([]);
  const [enfermagemServicoId, setEnfermagemServicoId] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dataFilter, setDataFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recentes');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<AtendimentoRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAtendimento, setDeletingAtendimento] = useState<AtendimentoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection
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
  const nifContainerRef = useRef<HTMLDivElement>(null);

  // Form
  const [formData, setFormData] = useState({
    data: '',
    hora: '',
    notas: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const [servicosRes, atendimentosRes] = await Promise.all([
      supabase
        .from('servicos')
        .select('id, nome')
        .eq('nome', SERVICO_NOME)
        .maybeSingle(),
      (supabase as any)
        .from('atendimentos')
        .select('*')
        .eq('tipo', TIPO)
        .eq('local', FIXED_LOCAL)
        .order('data', { ascending: false }),
    ]);

    if (servicosRes.data) {
      setEnfermagemServicoId((servicosRes.data as any).id);
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
        local: a.local ?? FIXED_LOCAL,
        notas: a.notas ?? null,
        created_at: a.created_at,
      }));

      // Batch NIF → name lookup
      const nifsUnicos = [...new Set(rows.map((r) => r.paciente_nif).filter(Boolean))];
      if (nifsUnicos.length > 0) {
        const { data: cartoes } = await supabase
          .from('cartao_saude')
          .select('nif, nome_completo, numero_cartao')
          .in('nif', nifsUnicos as any);

        const cartaoMap = new Map<string, any>();
        ((cartoes ?? []) as any[]).forEach((c) => cartaoMap.set(c.nif, c));
        rows.forEach((r) => {
          const cartao = cartaoMap.get(r.paciente_nif);
          if (cartao) {
            r.nome_completo = cartao.nome_completo;
            r.numero_cartao = cartao.numero_cartao;
          }
        });
      }

      setAtendimentos(rows);
    }

    setLoading(false);
  };

  // ------------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------------
  const filteredAtendimentos = (() => {
    let list = atendimentos.filter((a) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !a.nome_completo?.toLowerCase().includes(term) &&
          !a.paciente_nif?.toLowerCase().includes(term) &&
          !a.numero_cartao?.toLowerCase().includes(term)
        ) return false;
      }
      if (dataFilter && a.data !== dataFilter) return false;
      return true;
    });

    switch (sortBy) {
      case 'nome_asc':
        list = [...list].sort((a, b) =>
          (a.nome_completo ?? a.paciente_nif).localeCompare(b.nome_completo ?? b.paciente_nif, 'pt')
        );
        break;
      case 'recentes':
      default:
        list = [...list].sort((a, b) => {
          const cmp = b.data.localeCompare(a.data);
          if (cmp !== 0) return cmp;
          return (b.hora ?? '').localeCompare(a.hora ?? '');
        });
        break;
    }
    return list;
  })();

  // ------------------------------------------------------------------
  // NIF predictive search
  // ------------------------------------------------------------------
  const clearNifState = () => {
    setNifLookup(null);
    setNifSuggestions([]);
    setNifError('');
    setShowSuggestions(false);
  };

  const selectSuggestion = (cartao: CartaoSaudePorNif) => {
    setNifValue(cartao.nome_completo ?? cartao.nif);
    setNifLookup(cartao);
    setNifSuggestions([]);
    setShowSuggestions(false);
    setNifError('');
  };

  const handleNifChange = (raw: string) => {
    setNifValue(raw);
    setNifLookup(null);

    if (raw.trim().length === 0) {
      clearNifState();
      setNifSearching(false);
      if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
      return;
    }
    if (raw.trim().length < 3) { clearNifState(); return; }

    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
    setNifSearching(true);
    nifDebounceRef.current = setTimeout(async () => {
      try {
        const trimmed = raw.trim();
        const isExactNif = /^\d{9}$/.test(trimmed);

        if (isExactNif) {
          const { data, error } = await supabase
            .from('cartao_saude')
            .select('id, nif, nome_completo, numero_cartao, telefone, estado_entrega')
            .eq('nif', trimmed)
            .maybeSingle();

          if (error) {
            setNifError('Erro ao pesquisar: ' + error.message);
          } else if (!data) {
            setNifError('NIF não encontrado no Cartão de Saúde');
          } else {
            setNifLookup(data as unknown as CartaoSaudePorNif);
            setNifSuggestions([]);
            setShowSuggestions(false);
            setNifError('');
          }
        } else {
          const { data, error } = await supabase
            .from('cartao_saude')
            .select('id, nif, nome_completo, numero_cartao, telefone, estado_entrega')
            .or(`nome_completo.ilike.%${trimmed}%,nif.ilike.%${trimmed}%`)
            .limit(10);

          if (!error && data && data.length > 0) {
            setNifSuggestions(data as unknown as CartaoSaudePorNif[]);
            setShowSuggestions(true);
            setNifLookup(null);
            setNifError('');
          } else {
            setNifSuggestions([]);
            setShowSuggestions(false);
            setNifError(trimmed.length >= 4 ? 'Sem resultados para este NIF/nome' : '');
          }
        }
      } finally {
        setNifSearching(false);
      }
    }, 250);
  };

  // ------------------------------------------------------------------
  // Modal helpers
  // ------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingAtendimento(null);
    setNifValue('');
    clearNifState();
    setNifSearching(false);
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora: currentTimeHHMM(),
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (atendimento: AtendimentoRow) => {
    setEditingAtendimento(atendimento);
    setNifValue(atendimento.paciente_nif);
    setNifLookup(
      atendimento.nome_completo
        ? ({
            id: '',
            nif: atendimento.paciente_nif,
            nome_completo: atendimento.nome_completo,
            numero_cartao: atendimento.numero_cartao,
            telefone: null,
            estado_entrega: null,
          } as CartaoSaudePorNif)
        : null
    );
    setNifSuggestions([]);
    setShowSuggestions(false);
    setNifError('');
    setFormData({
      data: atendimento.data,
      hora: (atendimento.hora ?? currentTimeHHMM()).substring(0, 5),
      notas: atendimento.notas ?? '',
    });
    setModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    if (!formData.data) {
      toast.error('Preencha a data');
      return;
    }
    if (!nifLookup || !nifLookup.nif) {
      toast.error('Pesquise e selecione um utente da lista');
      return;
    }

    setSaving(true);

    if (editingAtendimento) {
      // Edit: only notas, data and hora are editable
      const { error } = await (supabase as any)
        .from('atendimentos')
        .update({
          data: formData.data,
          hora: formData.hora || null,
          notas: formData.notas.trim() || null,
        })
        .eq('id', editingAtendimento.id);

      if (error) {
        toast.error('Erro ao atualizar: ' + error.message);
      } else {
        toast.success('Registo atualizado com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      if (!enfermagemServicoId) {
        toast.error('Serviço "Enfermagem" não encontrado na base de dados');
        setSaving(false);
        return;
      }
      const { error } = await (supabase as any)
        .from('atendimentos')
        .insert([{
          paciente_nif: nifLookup.nif,
          servico_id: enfermagemServicoId,
          tipo: TIPO,
          local: FIXED_LOCAL,
          data: formData.data,
          hora: formData.hora || null,
          notas: formData.notas.trim() || null,
          created_by: user?.id ?? null,
        }]);

      if (error) {
        toast.error('Erro ao criar registo: ' + error.message);
      } else {
        toast.success('Registo criado com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  const openDeleteDialog = (atendimento: AtendimentoRow) => {
    setDeletingAtendimento(atendimento);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAtendimento) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from('atendimentos')
      .delete()
      .eq('id', deletingAtendimento.id);

    if (error) {
      toast.error(
        error.code === '42501'
          ? 'Não tem permissão para eliminar este registo.'
          : 'Erro ao eliminar: ' + error.message
      );
    } else {
      toast.success('Registo eliminado com sucesso');
      setDeleteDialogOpen(false);
      setDeletingAtendimento(null);
      fetchData();
    }
    setDeleting(false);
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  const handleExport = () => {
    const exportData = filteredAtendimentos.map((a) => ({
      'Data': a.data,
      'Hora': (a.hora ?? '').substring(0, 5),
      'Paciente': a.nome_completo ?? a.paciente_nif,
      'NIF': a.paciente_nif,
      'Nº Cartão': a.numero_cartao ?? '',
      'Local': a.local,
      'Notas': a.notas ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enfermagem');
    XLSX.writeFile(wb, `enfermagem_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  // ------------------------------------------------------------------
  // Bulk delete
  // ------------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await (supabase as any)
      .from('atendimentos')
      .delete()
      .in('id', selectedIds);
    if (error) {
      toast.error(
        error.code === '42501'
          ? 'Não tem permissão para eliminar os registos selecionados.'
          : 'Erro ao eliminar: ' + error.message
      );
    } else {
      toast.success(`${selectedIds.length} registo(s) eliminado(s)`);
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
  const allFilteredIds = filteredAtendimentos.map((a) => a.id);
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
  const columns: Column<AtendimentoRow>[] = [];

  if (canEdit) {
    columns.push({
      key: 'select' as any,
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-gray-300"
          aria-label="Selecionar todos"
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
      header: 'Data / Hora',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{formatData(item.data)}</p>
          {item.hora && (
            <p className="text-xs text-muted-foreground">{item.hora.substring(0, 5)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{item.nome_completo ?? item.paciente_nif}</p>
          <p className="text-xs text-muted-foreground">
            NIF: {item.paciente_nif}
            {item.numero_cartao ? ` • Cartão: ${item.numero_cartao}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'local',
      header: 'Local',
      cell: (item) => <p className="text-sm">{item.local}</p>,
    },
    {
      key: 'notas',
      header: 'Notas',
      cell: (item) => (
        <p className="text-sm text-muted-foreground truncate max-w-xs">
          {item.notas ?? '—'}
        </p>
      ),
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

  const isEditing = !!editingAtendimento;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="page-enter flex flex-col h-full gap-3">
      {/* BLOCO 1: PageHeader */}
      <PageHeader title="Enfermagem" description="Registo de atendimentos">
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="gap-2 h-10 shadow-sm">
              <FileDown className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2 h-10 shadow-sm">
              <Plus className="w-4 h-4" />
              Novo Registo
            </Button>
          </div>
        )}
      </PageHeader>

      {/* BLOCO 2: Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0 w-full">
        <div className="relative w-full sm:max-w-sm shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome ou NIF do utente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 shadow-sm"
          />
        </div>
        <Input
          type="date"
          value={dataFilter}
          onChange={(e) => setDataFilter(e.target.value)}
          className="w-full sm:w-40 h-10 shadow-sm shrink-0"
        />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 h-10 shadow-sm shrink-0">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais Recentes</SelectItem>
            <SelectItem value="nome_asc">Nome Utente (A-Z)</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && selectedIds.length > 0 && (
          <Button
            variant="destructive"
            className="gap-2 h-10 shadow-sm shrink-0 sm:ml-auto w-full sm:w-auto"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* BLOCO 3: Card da Tabela */}
      <div className="bg-card border border-border/50 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={filteredAtendimentos}
            loading={loading}
            emptyTitle="Sem registos"
            emptyDescription="Ainda não existem registos de Enfermagem."
            onRowClick={canEdit ? openEditModal : undefined}
          />
        </div>

        {!loading && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t bg-muted/20">
            <span>
              A mostrar{' '}
              <span className="font-semibold text-foreground">{filteredAtendimentos.length}</span> de{' '}
              <span className="font-semibold text-foreground">{atendimentos.length}</span> registos
            </span>
            {selectedIds.length > 0 && (
              <span className="text-primary font-medium">{selectedIds.length} selecionado(s)</span>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              {isEditing ? 'Editar Registo' : 'Novo Registo — Enfermagem'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Atualize os dados do atendimento'
                : 'Registe um atendimento de Enfermagem — o utente deve constar no Cartão de Saúde'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* NIF Lookup */}
            <div className="space-y-2" ref={nifContainerRef}>
              <Label>NIF / Cartão de Saúde *</Label>
              <div className="relative">
                <Input
                  placeholder="Pesquise por NIF ou nome (mín. 3 caracteres)"
                  value={nifValue}
                  onChange={(e) => handleNifChange(e.target.value)}
                  maxLength={9}
                  disabled={isEditing}
                  className={`pr-8 ${nifError ? 'border-destructive' : ''}`}
                />
                {nifSearching && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {showSuggestions && nifSuggestions.length > 0 && !isEditing && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg">
                    {nifSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSuggestion(s);
                        }}
                      >
                        <span className="font-medium truncate">{s.nome_completo}</span>
                        <span className="text-muted-foreground ml-2 shrink-0 text-xs">{s.nif}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {nifError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {nifError}
                </p>
              )}
            </div>

            {/* Patient info card */}
            {nifLookup && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm flex items-center gap-1.5 text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Utente encontrado
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome: </span>
                    <span className="font-medium">{nifLookup.nome_completo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nº Cartão: </span>
                    <span className="font-medium">{nifLookup.numero_cartao || '—'}</span>
                  </div>
                  {nifLookup.telefone && (
                    <div>
                      <span className="text-muted-foreground">Telefone: </span>
                      <span className="font-medium">{nifLookup.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Local fixo */}
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={FIXED_LOCAL} disabled className="bg-muted/50 cursor-not-allowed" />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <DatePickerInput
                  value={formData.data}
                  onChange={(v) => setFormData({ ...formData, data: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações, procedimentos efectuados..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar' : 'Registar Atendimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Registo"
        description="Tem a certeza que deseja eliminar este registo? Esta ação não pode ser desfeita."
      />

      {/* Bulk Delete */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Eliminar Registos Selecionados"
        description={`Tem a certeza que deseja eliminar ${selectedIds.length} registo(s)? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
