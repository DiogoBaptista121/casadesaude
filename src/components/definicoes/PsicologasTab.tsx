import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, Column } from '@/components/ui/data-table';
import { Plus, Edit2, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Psicologa {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  user_id?: string | null;
  created_at: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const psicologasTable = () => supabase.from('psicologas' as any);

export function PsicologasTab() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [psicologas, setPsicologas] = useState<Psicologa[]>([]);
  const [psicologaUsers, setPsicologaUsers] = useState<{ id: string; nome: string | null; email: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Psicologa | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Psicologa | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    ativo: 'true',
    user_id: '',
  });

  useEffect(() => {
    fetchPsicologas();
    if (isAdmin) fetchPsicologaUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchPsicologas = async () => {
    setLoading(true);
    const { data, error } = await psicologasTable()
      .select('*')
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar psicólogas: ' + error.message);
    } else {
      setPsicologas((data as any[]) || []);
    }
    setLoading(false);
  };

  // Fetch all user profiles with role 'psicologa'
  const fetchPsicologaUsers = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)('get_all_users');
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (data as any[]).filter((u: any) => u.role === 'psicologa');
      setPsicologaUsers(filtered.map((u: any) => ({ id: u.id, nome: u.nome, email: u.email })));
    }
  };

  const filteredPsicologas = psicologas.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telefone?.includes(searchTerm)
  );

  const handleOpenCreate = () => {
    if (!isAdmin) return;
    setEditingItem(null);
    setFormData({ nome: '', email: '', telefone: '', ativo: 'true', user_id: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Psicologa) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      email: item.email || '',
      telefone: item.telefone || '',
      ativo: item.ativo ? 'true' : 'false',
      user_id: item.user_id || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      nome: formData.nome.trim(),
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      ativo: formData.ativo === 'true',
      user_id: formData.user_id || null,
    };

    if (editingItem) {
      const { error } = await psicologasTable()
        .update(payload)
        .eq('id', editingItem.id);

      if (error) toast.error('Erro ao atualizar: ' + error.message);
      else {
        toast.success('Psicóloga atualizada com sucesso');
        setModalOpen(false);
        fetchPsicologas();
      }
    } else {
      const { error } = await psicologasTable()
        .insert([payload] as any[]);

      if (error) toast.error('Erro ao criar: ' + error.message);
      else {
        toast.success('Psicóloga criada com sucesso');
        setModalOpen(false);
        fetchPsicologas();
      }
    }
    setSaving(false);
  };

  const handleOpenDelete = (item: Psicologa) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    
    // Check if there are consultations
    const { count } = await supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .eq('psicologa_id', deletingItem.id);
      
    if (count && count > 0) {
      toast.error(`Não é possível eliminar. Existem ${count} consulta(s) associada(s) a esta psicóloga.`);
      setDeleting(false);
      setDeleteDialogOpen(false);
      return;
    }

    const { error } = await psicologasTable()
      .delete()
      .eq('id', deletingItem.id);

    if (error) toast.error('Erro ao eliminar: ' + error.message);
    else {
      toast.success('Psicóloga eliminada com sucesso');
      setDeleteDialogOpen(false);
      fetchPsicologas();
    }
    setDeleting(false);
  };

  const baseColumns: Column<Psicologa>[] = [
    {
      key: 'nome',
      header: 'Nome',
      cell: (item) => <p className="font-medium text-sm">{item.nome}</p>,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (item) => <p className="text-sm text-muted-foreground">{item.email || '—'}</p>,
    },
    {
      key: 'telefone',
      header: 'Telefone',
      cell: (item) => <p className="text-sm text-muted-foreground">{item.telefone || '—'}</p>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (item) => (
        <Badge variant={item.ativo ? "default" : "secondary"} className={item.ativo ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-0" : ""}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  const columns: Column<Psicologa>[] = isAdmin
    ? [
        ...baseColumns,
        {
          key: 'actions',
          header: '',
          className: 'w-24 text-right',
          cell: (item) => (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(item)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleOpenDelete(item)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ),
        },
      ]
    : baseColumns;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-medium">Gestão de Psicólogas</h2>
          {isAdmin ? (
            <p className="text-sm text-muted-foreground">Adicione e faça a gestão das psicólogas para as consultas.</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Apenas administradores podem gerir psicólogas.</p>
          )}
        </div>
        {isAdmin && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Psicóloga
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="p-0">
          <DataTable
            columns={columns}
            data={filteredPsicologas}
            loading={loading}
            emptyTitle="Nenhuma psicóloga encontrada"
            emptyDescription="Não existem psicólogas registadas ou que correspondam à pesquisa."
          />
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Psicóloga' : 'Nova Psicóloga'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Atualize os dados da psicóloga selecionada.' : 'Preencha os dados para adicionar uma nova psicóloga.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Dra. Maria Silva"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="Ex: 912 345 678"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.ativo}
                  onValueChange={(value) => setFormData({ ...formData, ativo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: maria.silva@exemplo.pt"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Utilizador associado</Label>
              <Select
                value={formData.user_id || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, user_id: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum utilizador associado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem utilizador —</SelectItem>
                  {psicologaUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome || u.email} <span className="text-muted-foreground text-xs ml-1">({u.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Liga esta psicóloga a um perfil de utilizador com role "Psicóloga".</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Psicóloga"
        description={`Tem a certeza que deseja eliminar a psicóloga ${deletingItem?.nome}? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
