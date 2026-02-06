import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Loader2, Calendar, Briefcase, Check, ChevronsUpDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FuncionarioMT, ConsultaStatus, CartaoSaudePorNif } from '@/types/database';

export type AppointmentType = 'consulta' | 'consulta_mt';

interface AppointmentData {
  id?: string;
  type: AppointmentType;
  // NIF-based for consulta
  nif?: string;
  // Legacy support for editing
  cartao_saude_id?: string;
  servico_id?: string;
  origem?: string;
  // MT fields
  funcionario_id?: string;
  tipo_exame?: string;
  // Common fields
  data: string;
  hora: string;
  status: ConsultaStatus;
  notas?: string;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AppointmentData | null;
  initialDate?: Date;
  onSuccess: () => void;
}

const tiposExame = [
  'Periódico',
  'Admissão',
  'Demissional',
  'Retorno ao Trabalho',
  'Mudança de Função',
  'Avaliação Especial',
];

export function AppointmentModal({
  open,
  onOpenChange,
  initialData,
  initialDate,
  onSuccess,
}: AppointmentModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data for MT
  const [funcionarios, setFuncionarios] = useState<FuncionarioMT[]>([]);
  const [funcionarioOpen, setFuncionarioOpen] = useState(false);

  // NIF lookup state for consulta
  const [nifValue, setNifValue] = useState('');
  const [nifLookup, setNifLookup] = useState<CartaoSaudePorNif | null>(null);
  const [nifError, setNifError] = useState('');
  const [nifSearching, setNifSearching] = useState(false);

  // Form state
  const [formData, setFormData] = useState<AppointmentData>({
    type: 'consulta',
    data: '',
    hora: '09:00',
    status: 'agendada',
    tipo_exame: 'Periódico',
  });

  useEffect(() => {
    if (open) {
      fetchData();
      if (initialData) {
        setFormData(initialData);
        // If editing a consulta, try to lookup the NIF
        if (initialData.type === 'consulta' && initialData.nif) {
          setNifValue(initialData.nif);
          lookupNif(initialData.nif);
        } else {
          setNifValue('');
          setNifLookup(null);
          setNifError('');
        }
      } else {
        const dateStr = initialDate
          ? initialDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        setFormData({
          type: 'consulta',
          data: dateStr,
          hora: '09:00',
          status: 'agendada',
          tipo_exame: 'Periódico',
        });
        setNifValue('');
        setNifLookup(null);
        setNifError('');
      }
    }
  }, [open, initialData, initialDate]);

  const fetchData = async () => {
    setLoading(true);
    const [funcionariosRes] = await Promise.all([
      supabase.from('funcionarios_mt').select('*').eq('estado', 'ativo').order('nome_completo'),
    ]);

    if (funcionariosRes.data) setFuncionarios(funcionariosRes.data as FuncionarioMT[]);
    setLoading(false);
  };

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

  const handleSave = async () => {
    if (formData.type === 'consulta') {
      const trimmedNif = nifValue.trim();
      if (!trimmedNif || trimmedNif.length !== 9) {
        toast.error('Introduza um NIF válido (9 dígitos)');
        return;
      }
      if (!nifLookup) {
        toast.error('Pesquise e valide o NIF primeiro');
        return;
      }
    } else {
      if (!formData.funcionario_id) {
        toast.error('Selecione um funcionário');
        return;
      }
    }

    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    setSaving(true);

    try {
      if (formData.type === 'consulta') {
        if (formData.id) {
          // Edit existing consulta
          const { error } = await supabase
            .from('consultas')
            .update({
              data: formData.data,
              hora: formData.hora,
              status: formData.status,
              notas: formData.notas?.trim() || null,
            })
            .eq('id', formData.id);
          if (error) throw error;
          toast.success('Consulta atualizada');
        } else {
          // Create via RPC
          const { error } = await supabase.rpc('criar_consulta_cs_por_nif', {
            p_nif: nifValue.trim(),
            p_data: formData.data,
            p_hora: formData.hora,
            p_status: formData.status.charAt(0).toUpperCase() + formData.status.slice(1),
          });
          if (error) throw error;
          toast.success('Consulta marcada com sucesso');
        }
      } else {
        const payload = {
          funcionario_id: formData.funcionario_id!,
          tipo_exame: formData.tipo_exame || 'Periódico',
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: formData.notas?.trim() || null,
          created_by: user?.id,
        };

        if (formData.id) {
          const { error } = await supabase
            .from('consultas_mt')
            .update(payload)
            .eq('id', formData.id);
          if (error) throw error;
          toast.success('Consulta MT atualizada');
        } else {
          const { error } = await supabase.from('consultas_mt').insert([payload]);
          if (error) throw error;
          toast.success('Consulta MT criada');
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Erro ao guardar marcação');
    }

    setSaving(false);
  };

  const selectedFuncionario = funcionarios.find((f) => f.id === formData.funcionario_id);
  const isEditing = !!formData.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'consulta_mt' ? (
              <Briefcase className="w-5 h-5 text-accent-foreground" />
            ) : (
              <Calendar className="w-5 h-5 text-primary" />
            )}
            {isEditing ? 'Editar Marcação' : 'Nova Marcação'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da marcação'
              : 'Crie uma nova marcação no calendário'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Tipo (only when creating) */}
            {!isEditing && (
              <div className="space-y-2">
                <Label>Tipo de Marcação *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => {
                    setFormData({
                      ...formData,
                      type: v as AppointmentType,
                      funcionario_id: undefined,
                    });
                    setNifValue('');
                    setNifLookup(null);
                    setNifError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Consulta
                      </span>
                    </SelectItem>
                    <SelectItem value="consulta_mt">
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Medicina do Trabalho
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Consulta Fields - NIF based */}
            {formData.type === 'consulta' && (
              <>
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

                {/* Patient Info (read-only) */}
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
              </>
            )}

            {/* MT Fields */}
            {formData.type === 'consulta_mt' && (
              <>
                {/* Funcionário */}
                <div className="space-y-2">
                  <Label>Funcionário *</Label>
                  <Popover open={funcionarioOpen} onOpenChange={setFuncionarioOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {selectedFuncionario
                          ? `${selectedFuncionario.nome_completo} (${selectedFuncionario.numero_funcionario})`
                          : 'Selecione um funcionário...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Pesquisar funcionário..." />
                        <CommandList>
                          <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                          <CommandGroup>
                            {funcionarios.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={`${f.nome_completo} ${f.numero_funcionario}`}
                                onSelect={() => {
                                  setFormData({ ...formData, funcionario_id: f.id });
                                  setFuncionarioOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.funcionario_id === f.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <p>{f.nome_completo}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {f.numero_funcionario}
                                    {f.departamento && ` • ${f.departamento}`}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tipo de Exame */}
                <div className="space-y-2">
                  <Label>Tipo de Exame</Label>
                  <Select
                    value={formData.tipo_exame || 'Periódico'}
                    onValueChange={(v) => setFormData({ ...formData, tipo_exame: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposExame.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
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
                onValueChange={(v) =>
                  setFormData({ ...formData, status: v as ConsultaStatus })
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
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar' : 'Criar Marcação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
