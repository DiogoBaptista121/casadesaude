import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { UserPlus, Users, Shield, Search, Trash2, Pencil, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { AppRole } from '@/types/database';

interface UserWithRole {
  id: string;
  nome: string | null;
  email: string;
  ativo: boolean | null;
  role: AppRole | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  colaborador_casa_saude: 'Colaborador Casa de Saúde',
  colaborador_unidade_movel: 'Colaborador Unidade Móvel',
  psicologa: 'Psicóloga',
  visualizador: 'Visualizador',
};

const roleBadgeColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  gestor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  colaborador_casa_saude: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  colaborador_unidade_movel: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  psicologa: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  visualizador: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const { canManageUsers } = usePermissions();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_all_users');

      if (error) {
        console.error('[UsersTab] get_all_users error:', error);
        throw new Error(error.message);
      }

      type RawUser = { id: string; email: string; nome: string | null; ativo: boolean | null; role: string | null; };
      const usersWithRoles: UserWithRole[] = ((data as RawUser[]) || []).map((row) => ({
        id: row.id,
        email: row.email,
        nome: row.nome,
        ativo: row.ativo,
        role: (row.role as AppRole) || null,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setLoadError(msg);
      toast({
        title: 'Erro ao carregar utilizadores',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, ativo: boolean) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('toggle_user_active', {
        _target_user_id: userId,
        _ativo: ativo,
      });
      if (error) throw new Error(error.message);

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ativo } : u));
      toast({
        title: 'Estado atualizado',
        description: `Utilizador ${ativo ? 'ativado' : 'suspenso'} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível alterar o estado.',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (user: UserWithRole) => {
    setEditingUser(user);
    setEditOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('delete_user_profile', {
        _target_user_id: deletingUser.id,
      });
      if (error) throw new Error(error.message);

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      toast({ title: 'Utilizador eliminado', description: 'O utilizador foi removido com sucesso.' });
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error) {
      toast({
        title: 'Erro ao eliminar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!canManageUsers) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Não tem permissão para gerir utilizadores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <div className="animate-pulse">A carregar utilizadores...</div>
      </div>
    );
  }

  return (
    <>
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestão de Utilizadores
              </CardTitle>
              <CardDescription>
                {users.length} utilizador{users.length !== 1 ? 'es' : ''} registado{users.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Utilizador
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{loadError}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={loadUsers}>
                Tentar novamente
              </Button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              title={search ? 'Sem resultados' : 'Sem utilizadores'}
              description={search ? 'Nenhum utilizador corresponde à pesquisa.' : 'Ainda não existem utilizadores registados.'}
            />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <TableRow key={user.id} className={!user.ativo ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {user.nome || <span className="text-muted-foreground italic">Sem nome</span>}
                          {isSelf && <Badge variant="outline" className="ml-2 text-xs">Você</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={roleBadgeColors[user.role || 'visualizador']}>
                            <Shield className="mr-1 h-3 w-3" />
                            {roleLabels[user.role || 'visualizador']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.ativo ? 'default' : 'secondary'}>
                            {user.ativo ? 'Ativo' : 'Suspenso'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title="Editar utilizador"
                              onClick={() => openEditModal(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            {!isSelf && (
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                title={user.ativo ? 'Suspender' : 'Ativar'}
                                onClick={() => updateUserStatus(user.id, !user.ativo)}
                              >
                                {user.ativo
                                  ? <ToggleRight className="h-4 w-4 text-green-600" />
                                  : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                }
                              </Button>
                            )}

                            {!isSelf && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Eliminar utilizador"
                                onClick={() => openDeleteDialog(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} onSuccess={loadUsers} />
      <EditUserModal open={editOpen} onOpenChange={setEditOpen} user={editingUser} onSuccess={loadUsers} currentUserId={currentUser?.id} />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        loading={deleting}
        title="Eliminar Utilizador"
        description={`Tem a certeza que deseja eliminar "${deletingUser?.nome || deletingUser?.email}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
}