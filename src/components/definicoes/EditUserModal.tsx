import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Pencil } from 'lucide-react';
import type { AppRole } from '@/types/database';

interface UserToEdit {
    id: string;
    nome: string | null;
    email: string;
    role: AppRole | null;
}

interface EditUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserToEdit | null;
    onSuccess: () => void;
    currentUserId: string | undefined;
}

const roleLabels: Record<AppRole, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    colaborador: 'Colaborador',
    visualizador: 'Visualizador',
};

export function EditUserModal({ open, onOpenChange, user, onSuccess, currentUserId }: EditUserModalProps) {
    const [nome, setNome] = useState('');
    const [role, setRole] = useState<AppRole>('visualizador');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (user) {
            setNome(user.nome || '');
            setRole(user.role || 'visualizador');
            setErrors({});
        }
    }, [user]);

    const isSelf = user?.id === currentUserId;

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!nome.trim()) newErrors.nome = 'Nome é obrigatório';
        return newErrors;
    };

    const handleSubmit = async () => {
        if (!user) return;
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setLoading(true);

        try {
            if (nome.trim() !== (user.nome || '')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: profileError } = await (supabase.rpc as any)('update_user_profile', {
                    _target_user_id: user.id,
                    _new_nome: nome.trim(),
                });
                if (profileError) throw new Error(`Erro ao atualizar nome: ${profileError.message}`);
            }

            if (!isSelf && role !== user.role) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: roleError } = await (supabase.rpc as any)('update_user_role', {
                    _target_user_id: user.id,
                    _new_role: role,
                });
                if (roleError) throw new Error(`Erro ao atualizar permissão: ${roleError.message}`);
            }

            toast({
                title: 'Utilizador atualizado',
                description: `${nome} foi atualizado para ${roleLabels[role]}.`,
            });

            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('Error updating user:', error);
            toast({
                title: 'Erro ao atualizar utilizador',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => { if (!loading) onOpenChange(o); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Editar Utilizador
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">{user?.email}</p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-nome">Nome *</Label>
                        <Input
                            id="edit-nome"
                            placeholder="Nome completo"
                            value={nome}
                            onChange={e => { setNome(e.target.value); setErrors(p => ({ ...p, nome: '' })); }}
                            disabled={loading}
                        />
                        {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-role">Permissão</Label>
                        <Select
                            value={role}
                            onValueChange={v => setRole(v as AppRole)}
                            disabled={loading || isSelf}
                        >
                            <SelectTrigger id="edit-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="visualizador">Visualizador — só leitura</SelectItem>
                                <SelectItem value="colaborador">Colaborador — ver e editar consultas</SelectItem>
                                <SelectItem value="gestor">Gestor — gerir dados, sem admin</SelectItem>
                                <SelectItem value="admin">Administrador — acesso total</SelectItem>
                            </SelectContent>
                        </Select>
                        {isSelf && (
                            <p className="text-xs text-muted-foreground">Não pode alterar a sua própria permissão.</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'A guardar...' : 'Guardar Alterações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}