import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit2, Loader2, Trash2, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CartaoSaude, EstadoEntrega } from '@/types/database';

const estadoEntregaLabelsMap: Record<string, string> = {
  PENDENTE: 'Pendente', ENTREGUE: 'Entregue', AGUARDAR_VALIDACAO: 'Aguardar Validação',
  NAO_ENTREGUE: 'Não Entregue', ERRO_DADOS: 'Erro nos Dados', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado'
};

const estadoEntregaColorsMap: Record<string, string> = {
  ENTREGUE: 'bg-green-100 text-green-800', NAO_ENTREGUE: 'bg-red-100 text-red-800',
  PENDENTE: 'bg-yellow-100 text-yellow-800', CANCELADO: 'bg-gray-100 text-gray-800',
  AGUARDAR_VALIDACAO: 'bg-blue-100 text-blue-800', ERRO_DADOS: 'bg-orange-100 text-orange-800',
  EXPIRADO: 'bg-slate-200 text-slate-800'
};

export default function CartaoSaudePage() {
  const { role, isSuperAdmin: authIsSuperAdmin } = useAuth() as any;
  const isAdmin = role === 'admin';
  const isSuperAdmin = authIsSuperAdmin ?? isAdmin;

  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<CartaoSaude[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<CartaoSaude | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const isDataLocked = !!editingCartao && !isSuperAdmin;
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Resolve initial state from URL query
  const initialFilter = () => {
    const f = searchParams.get('filter');
    if (f === 'validacao') return 'AGUARDAR_VALIDACAO';
    if (f === 'erros') return 'ERRO_DADOS';
    if (f === 'expirados') return 'EXPIRADO';
    if (f === 'cancelados') return 'CANCELADO';
    if (f === 'atencao') return 'requer_atencao';
    return 'todos';
  };
  const [estadoFilter, setEstadoFilter] = useState(initialFilter());

  // Atualizar URL baseada no estado
  useEffect(() => {
    if (estadoFilter === 'todos') {
      searchParams.delete('filter');
    } else if (estadoFilter === 'AGUARDAR_VALIDACAO') {
      searchParams.set('filter', 'validacao');
    } else if (estadoFilter === 'ERRO_DADOS') {
      searchParams.set('filter', 'erros');
    } else if (estadoFilter === 'EXPIRADO') {
      searchParams.set('filter', 'expirados');
    } else if (estadoFilter === 'CANCELADO') {
      searchParams.set('filter', 'cancelados');
    } else if (estadoFilter === 'requer_atencao') {
      searchParams.set('filter', 'atencao');
    } else {
      searchParams.set('filter', estadoFilter);
    }
    setSearchParams(searchParams);
  }, [estadoFilter, setSearchParams]);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCartao, setDeletingCartao] = useState<CartaoSaude | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchPage = async () => {
    setLoading(true);
    let query = supabase.from('cartao_saude').select('*');
    if (searchTerm) query = query.or(`nome_completo.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%`);
    
    if (estadoFilter === 'requer_atencao') {
      query = query.in('estado_entrega', ['AGUARDAR_VALIDACAO', 'ERRO_DADOS', 'EXPIRADO', 'CANCELADO']);
    } else if (estadoFilter !== 'todos') {
      query = query.eq('estado_entrega', estadoFilter);
    }

    const { data, error } = await query.order('numero_cartao', { ascending: true });
    if (!error) setCartoes(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchPage(); }, [searchTerm, estadoFilter]);

  // Contagem de cartões a aguardar validação
  const totalAguardarValidacao = cartoes.filter(c => c.estado_entrega === 'AGUARDAR_VALIDACAO').length;

  const handleSave = async () => {
    if (!formData.nif || !formData.nome_completo)
      return toast.error("NIF e Nome são obrigatórios");
    if (!/^\d{9}$/.test(formData.nif.toString().trim()))
      return toast.error("NIF inválido — deve ter exatamente 9 dígitos");
    if (formData.telefone && !/^\d{9}$/.test(formData.telefone.toString().trim()))
      return toast.error("Telefone inválido — deve ter exatamente 9 dígitos");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      return toast.error("Email inválido — formato esperado: exemplo@dominio.com");

    setSaving(true);

    const payload: any = {
      nif: formData.nif.toString().trim(),
      nome_completo: formData.nome_completo.trim(),
      email: formData.email?.trim() || null,
      telefone: formData.telefone?.toString().trim() || null,
      data_nascimento: formData.data_nascimento || null,
      morada: formData.morada?.trim() || null,
      freguesia: formData.freguesia?.trim() || null,
      tipo_documento: formData.tipo_documento || null,
      numero_documento: formData.numero_documento?.trim() || null,
      validade_documento: formData.tipo_documento === 'BI' ? null : (formData.validade_documento || null),
      estado_entrega: formData.estado_entrega || 'PENDENTE',
    };

    if (editingCartao) {
      const { error } = await supabase.from('cartao_saude').update(payload).eq('id', editingCartao.id);
      if (!error) { toast.success("Atualizado!"); setModalOpen(false); fetchPage(); }
      else toast.error(error.message);
    } else {
      const { error } = await supabase.from('cartao_saude').insert([payload]);
      if (!error) { toast.success("Novo cartão criado com sucesso!"); setModalOpen(false); fetchPage(); }
      else toast.error("Erro técnico: " + error.message);
    }
    setSaving(false);
  };

  const handleQuickAction = async (novoEstado: string) => {
    if (!editingCartao) return;
    setSaving(true);
    const { error } = await supabase.from('cartao_saude').update({ estado_entrega: novoEstado }).eq('id', editingCartao.id);
    if (!error) { 
      toast.success("Estado atualizado com sucesso!"); 
      setModalOpen(false); 
      fetchPage(); 
    }
    else toast.error(error.message);
    setSaving(false);
  };

  // Delete individual
  const handleDelete = async () => {
    if (!deletingCartao) return;
    setDeleting(true);
    const { error } = await supabase.from('cartao_saude').delete().eq('id', deletingCartao.id);
    if (!error) {
      toast.success("Cartão eliminado com sucesso");
      setDeleteDialogOpen(false);
      setDeletingCartao(null);
      fetchPage();
    } else toast.error(error.message);
    setDeleting(false);
  };

  // Delete selecionados
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase.from('cartao_saude').delete().in('id', selectedIds);
    if (!error) {
      toast.success(`${selectedIds.length} cartão(ões) eliminado(s)`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      fetchPage();
    } else toast.error(error.message);
    setBulkDeleting(false);
  };

  // Aprovar selecionados em massa
  const handleBulkAprovar = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from('cartao_saude').update({ estado_entrega: 'ENTREGUE' }).in('id', selectedIds);
    if (!error) {
      toast.success('Cartões validados com sucesso!');
      setSelectedIds([]);
      fetchPage();
    } else toast.error(error.message);
    setSaving(false);
  };

  // Delete todos (filtrados)
  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const ids = cartoes.map(c => c.id);
    const { error } = await supabase.from('cartao_saude').delete().in('id', ids);
    if (!error) {
      toast.success(`${ids.length} cartão(ões) eliminado(s)`);
      setSelectedIds([]);
      setDeleteAllDialogOpen(false);
      fetchPage();
    } else toast.error(error.message);
    setDeletingAll(false);
  };

  // Selecionar todos visíveis
  const allFilteredIds = cartoes.map(c => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...allFilteredIds])]);
  };

  const columns: Column<CartaoSaude>[] = [
    // Checkbox (só admin)
    ...(isAdmin ? [{
      key: 'select' as any,
      header: (
        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-gray-300" />
      ) as any,
      cell: (i: CartaoSaude) => (
        <input type="checkbox" checked={selectedIds.includes(i.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedIds(prev => e.target.checked ? [...prev, i.id] : prev.filter(id => id !== i.id));
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300" />
      ),
      className: 'w-10',
    }] : []),
    { key: 'numero_cartao', header: 'Nº Cartão', cell: (i) => <span className="font-bold text-primary">{i.numero_cartao}</span> },
    { key: 'nome_completo', header: 'Nome', cell: (i) => i.nome_completo },
    { key: 'nif', header: 'NIF', cell: (i) => i.nif },
    {
      key: 'estado_entrega', header: 'Estado', cell: (i) => (
        <div className="flex items-center gap-2">
          {i.estado_entrega === 'AGUARDAR_VALIDACAO' && (
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)] animate-pulse" title="Aguardar Validação" />
          )}
          <Badge className={estadoEntregaColorsMap[i.estado_entrega || 'PENDENTE']}>
            {estadoEntregaLabelsMap[i.estado_entrega || 'PENDENTE']}
          </Badge>
        </div>
      )
    },
    {
      key: 'actions', header: '', cell: (i) => (
        <div className="flex items-center gap-1 justify-end">
          {(!isSuperAdmin && (i.estado_entrega || 'PENDENTE') !== 'PENDENTE') ? null : (
            <Button variant="ghost" size="icon" onClick={() => { setEditingCartao(i); setFormData(i); setModalOpen(true); }}>
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); setDeletingCartao(i); setDeleteDialogOpen(true); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* BLOCO 1: PageHeader */}
      <PageHeader title="Cartão de Saúde" description="Gestão de aderentes">
        <div className="flex items-center gap-3">
          <Button className="h-10 gap-2 shrink-0 shadow-sm" onClick={() => { setEditingCartao(null); setFormData({ estado_entrega: 'PENDENTE' }); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Cartão
          </Button>
        </div>
      </PageHeader>

      {/* BLOCO 2: Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0 w-full">
        <div className="relative w-full sm:max-w-sm shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por NIF ou Nome..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 shadow-sm" />
        </div>

        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 shadow-sm shrink-0"><SelectValue placeholder="Filtrar Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            {Object.entries(estadoEntregaLabelsMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        {isSuperAdmin && (
          <Button 
            variant={estadoFilter === 'requer_atencao' ? 'default' : 'outline'} 
            className={`h-10 gap-2 shadow-sm ${estadoFilter === 'requer_atencao' ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'}`}
            onClick={() => setEstadoFilter(estadoFilter === 'requer_atencao' ? 'todos' : 'requer_atencao')}
          >
            <AlertTriangle className="w-4 h-4" /> Requer Atenção
          </Button>
        )}

        {isSuperAdmin && selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 sm:ml-auto w-full sm:w-auto">
            <Button
              className="h-10 gap-2 shadow-sm bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              onClick={handleBulkAprovar}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Aprovar ({selectedIds.length})
            </Button>
            <Button variant="destructive" className="h-10 gap-2 shadow-sm shrink-0 w-full sm:w-auto" onClick={() => setBulkDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* BLOCO 3: Card da Tabela */}
      <div className="bg-card border border-border/50 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <DataTable columns={columns} data={cartoes} loading={loading} />
        </div>
        {/* Rodapé contador */}
        {!loading && (
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t bg-muted/20 shrink-0">
            <span>A mostrar <span className="font-semibold text-foreground">{cartoes.length}</span> cartões</span>
            {selectedIds.length > 0 && <span className="text-primary font-medium">{selectedIds.length} selecionado(s)</span>}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCartao ? 'Editar' : 'Novo'} Cartão de Saúde</DialogTitle></DialogHeader>

          {isDataLocked && (
            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
              Apenas o Administrador pode alterar os dados inseridos. Tem apenas permissão para alterar o Estado de Entrega.
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NIF *</Label>
                <Input value={formData.nif || ''} maxLength={9} placeholder="9 dígitos" disabled={isDataLocked}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value.replace(/\D/g, '').slice(0, 9) })} />
              </div>
              <div className="space-y-2">
                <Label>Estado Entrega</Label>
                <Select value={formData.estado_entrega} onValueChange={(v) => setFormData({ ...formData, estado_entrega: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(estadoEntregaLabelsMap)
                      .filter(([k]) => isSuperAdmin || (k !== 'ENTREGUE' && k !== 'CANCELADO'))
                      .map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input disabled={isDataLocked} value={formData.nome_completo || ''} onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.data_nascimento && "text-muted-foreground"
                      )}
                      disabled={isDataLocked}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_nascimento ? format(new Date(formData.data_nascimento), "PPP", { locale: pt }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.data_nascimento ? new Date(formData.data_nascimento) : undefined}
                      onSelect={(date) => setFormData({ ...formData, data_nascimento: date ? date.toISOString() : '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input disabled={isDataLocked} value={formData.telefone || ''} maxLength={9} placeholder="9 dígitos"
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '').slice(0, 9) })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo Documento</Label>
                <Select disabled={isDataLocked} value={formData.tipo_documento} onValueChange={(v) => setFormData({ ...formData, tipo_documento: v, validade_documento: v === 'BI' ? '' : formData.validade_documento })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cartão Cidadão</SelectItem>
                    <SelectItem value="BI">BI (Vitalício)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº Documento</Label>
                <Input disabled={isDataLocked} value={formData.numero_documento || ''} onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.validade_documento && "text-muted-foreground"
                      )}
                      disabled={formData.tipo_documento === 'BI' || isDataLocked}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.validade_documento ? format(new Date(formData.validade_documento), "PPP", { locale: pt }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.validade_documento ? new Date(formData.validade_documento) : undefined}
                      onSelect={(date) => setFormData({ ...formData, validade_documento: date ? date.toISOString() : '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {formData.tipo_documento === 'BI' && <p className="text-red-600 text-[10px] font-bold mt-1">B.I. Vitalício: Validade não necessária.</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input disabled={isDataLocked} value={formData.morada || ''} onChange={(e) => setFormData({ ...formData, morada: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Freguesia</Label>
                <Input disabled={isDataLocked} value={formData.freguesia || ''} onChange={(e) => setFormData({ ...formData, freguesia: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input disabled={isDataLocked} type="email" placeholder="exemplo@dominio.com" value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              {isSuperAdmin && editingCartao?.estado_entrega === 'AGUARDAR_VALIDACAO' && (
                <Button type="button" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 w-full sm:w-auto" onClick={() => handleQuickAction('ENTREGUE')} disabled={saving}>
                  Aprovar Entrega
                </Button>
              )}
              {isSuperAdmin && editingCartao?.estado_entrega === 'ERRO_DADOS' && (
                <Button type="button" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full sm:w-auto" onClick={() => handleQuickAction('PENDENTE')} disabled={saving}>
                  Permitir Correção
                </Button>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete individual */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Cartão"
        description={`Tem a certeza que deseja eliminar o cartão de "${deletingCartao?.nome_completo}"? Esta ação não pode ser desfeita.`}
      />

      {/* Delete selecionados */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Eliminar Selecionados"
        description={`Tem a certeza que deseja eliminar ${selectedIds.length} cartão(ões)? Esta ação não pode ser desfeita.`}
      />

      {/* Delete todos */}
      <DeleteConfirmationDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        onConfirm={handleDeleteAll}
        loading={deletingAll}
        title="Eliminar Todos os Cartões"
        description={`Tem a certeza que deseja eliminar TODOS os ${cartoes.length} cartões da vista atual? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}