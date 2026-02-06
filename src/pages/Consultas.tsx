import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
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
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Servico, ConsultaStatus, ConsultaOrigem, ConsultaCSFichaView, CartaoSaudePorNif } from '@/types/database';
import * as XLSX from 'xlsx';

export default function ConsultasPage() {
  const { canEdit, user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaCSFichaView[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<ConsultaCSFichaView | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConsulta, setDeletingConsulta] = useState<ConsultaCSFichaView | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // NIF lookup state
  const [nifValue, setNifValue] = useState('');
  const [nifLookup, setNifLookup] = useState<CartaoSaudePorNif | null>(null);
  const [nifError, setNifError] = useState('');
  const [nifSearching, setNifSearching] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    data: '',
    hora: '',
    status: 'agendada' as ConsultaStatus,
    notas: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [consultasRes, servicosRes] = await Promise.all([
      supabase
        .from('consultas_cs_ficha_vw')
        .select('*')
        .order('data_consulta', { ascending: false })
        .order('hora_consulta', { ascending: true }),
      supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ]);

    if (consultasRes.error) {
      console.error('Error fetching consultas:', consultasRes.error);
      toast.error('Erro ao carregar consultas');
    } else {
      const mapped = (consultasRes.data || []).map((c: any) => ({
        ...c,
        id: c.consulta_id, // DataTable requires `id`
      }));
      setConsultas(mapped as ConsultaCSFichaView[]);
    }

    if (servicosRes.data) setServicos(servicosRes.data as Servico[]);
    
    setLoading(false);
  };

  const filteredConsultas = consultas.filter((c) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nomeMatch = c.nome_completo?.toLowerCase().includes(term);
      const cartaoMatch = c.numero_cartao?.toLowerCase().includes(term);
      const nifMatch = c.nif?.toLowerCase().includes(term);
      if (!nomeMatch && !cartaoMatch && !nifMatch) {
        return false;
      }
    }
    
    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (dataFilter && c.data_consulta !== dataFilter) return false;
    
    return true;
  });

  const lookupNif = async (nif: string) => {
    const trimmed = nif.trim();
    if (trimmed.length !== 9 || !/^\d{9}$/.test(trimmed)) {
      setNifLookup(null);
      if (trimmed.length > 0) {
        setNifError('NIF deve ter 9 dígitos');
      }
      return;
    }

    setNifSearching(true);
    setNifError('');
    setNifLookup(null);

    const { data, error } = await supabase
      .rpc('get_cartao_saude_por_nif', { p_nif: trimmed });

    if (error) {
      console.error('Error looking up NIF:', error);
      setNifError('Erro ao pesquisar NIF');
    } else if (!data || data.length === 0) {
      setNifError('Cartão de saúde não encontrado para este NIF');
    } else {
      setNifLookup(data[0] as CartaoSaudePorNif);
      setNifError('');
    }

    setNifSearching(false);
  };

  const openCreateModal = () => {
    setEditingConsulta(null);
    const today = new Date().toISOString().split('T')[0];
    setNifValue('');
    setNifLookup(null);
    setNifError('');
    setFormData({
      data: today,
      hora: '09:00',
      status: 'agendada',
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (consulta: ConsultaCSFichaView) => {
    setEditingConsulta(consulta);
    setNifValue(consulta.nif || '');
    setNifLookup({
      cartao_saude_id: consulta.cartao_saude_id,
      numero_cartao: consulta.numero_cartao || '',
      nif: consulta.nif,
      nome_completo: consulta.nome_completo,
      telefone: consulta.telefone,
      estado_entrega: consulta.estado_entrega,
    });
    setNifError('');
    setFormData({
      data: consulta.data_consulta,
      hora: consulta.hora_consulta?.substring(0, 5) || '09:00',
      status: consulta.status as ConsultaStatus,
      notas: '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    const trimmedNif = nifValue.trim();
    if (!trimmedNif || trimmedNif.length !== 9) {
      toast.error('Introduza um NIF válido (9 dígitos)');
      return;
    }

    if (!nifLookup) {
      toast.error('Pesquise e valide o NIF primeiro');
      return;
    }

    setSaving(true);

    if (editingConsulta) {
      // For edit, update directly on the consultas table
      const { error } = await supabase
        .from('consultas')
        .update({
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: formData.notas.trim() || null,
        })
        .eq('id', editingConsulta.consulta_id);

      if (error) {
        console.error('Error updating consulta:', error);
        toast.error('Erro ao atualizar consulta');
      } else {
        toast.success('Consulta atualizada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      // Create via RPC
      const { error } = await supabase.rpc('criar_consulta_cs_por_nif', {
        p_nif: trimmedNif,
        p_data: formData.data,
        p_hora: formData.hora,
        p_status: formData.status.charAt(0).toUpperCase() + formData.status.slice(1),
      });

      if (error) {
        console.error('Error creating consulta:', error);
        toast.error('Erro ao criar consulta: ' + (error.message || ''));
      } else {
        toast.success('Consulta marcada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const openDeleteDialog = (consulta: ConsultaCSFichaView) => {
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
      console.error('Error deleting consulta:', error);
      toast.error('Erro ao eliminar consulta');
    } else {
      toast.success('Consulta eliminada com sucesso');
      setDeleteDialogOpen(false);
      setDeletingConsulta(null);
      fetchData();
    }
    setDeleting(false);
  };

  const handleExport = () => {
    const exportData = filteredConsultas.map((c) => ({
      'Data': c.data_consulta,
      'Hora': c.hora_consulta?.substring(0, 5) || '',
      'Paciente': c.nome_completo || '',
      'NIF': c.nif || '',
      'Nº Cartão': c.numero_cartao || '',
      'Status': c.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultas');
    XLSX.writeFile(wb, `consultas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  const formatData = (data: string) => {
    return format(new Date(data), "dd 'de' MMM, yyyy", { locale: pt });
  };

  const columns: Column<ConsultaCSFichaView>[] = [
    {
      key: 'data',
      header: 'Data/Hora',
      cell: (item) => (
        <div>
          <p className="font-medium">{formatData(item.data_consulta)}</p>
          <p className="text-sm text-muted-foreground">{item.hora_consulta?.substring(0, 5)}</p>
        </div>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.nome_completo}</p>
          <p className="text-sm text-muted-foreground">NIF: {item.nif} | Cartão: {item.numero_cartao}</p>
        </div>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(item);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(item);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
      className: 'w-20',
    },
  ];

  const isEditing = !!editingConsulta;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Consultas"
        description="Gestão de marcações de consultas"
      >
        {canEdit && (
          <>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Marcação
            </Button>
          </>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, NIF ou nº cartão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="date"
          value={dataFilter}
          onChange={(e) => setDataFilter(e.target.value)}
          className="w-full"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="falta">Falta</SelectItem>
            <SelectItem value="remarcada">Remarcada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredConsultas}
        loading={loading}
        emptyTitle="Sem consultas"
        emptyDescription="Ainda não existem consultas registadas."
        onRowClick={canEdit ? openEditModal : undefined}
      />

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isEditing ? 'Editar Consulta' : 'Nova Marcação'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Atualize os dados da consulta'
                : 'Agende uma nova consulta identificando o paciente pelo NIF'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* NIF Lookup */}
            <div className="space-y-2">
              <Label>NIF do Paciente *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Introduza o NIF (9 dígitos)"
                  value={nifValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setNifValue(val);
                    if (val.length === 9) {
                      lookupNif(val);
                    } else {
                      setNifLookup(null);
                      setNifError('');
                    }
                  }}
                  onBlur={() => {
                    if (nifValue.length === 9) {
                      lookupNif(nifValue);
                    }
                  }}
                  maxLength={9}
                  disabled={isEditing}
                  className="flex-1"
                />
                {nifSearching && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-2" />}
              </div>
              {nifError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {nifError}
                </p>
              )}
            </div>

            {/* Patient Info (read-only, filled by RPC) */}
            {nifLookup && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm flex items-center gap-1.5 text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Paciente encontrado
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>{' '}
                    <span className="font-medium">{nifLookup.nome_completo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nº Cartão:</span>{' '}
                    <span className="font-medium">{nifLookup.numero_cartao || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>{' '}
                    <span className="font-medium">{nifLookup.telefone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado Entrega:</span>{' '}
                    <span className="font-medium">{nifLookup.estado_entrega || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ConsultaStatus) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : isEditing ? (
                'Guardar'
              ) : (
                'Criar Marcação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Consulta"
        description="Tem a certeza que deseja eliminar esta consulta? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
