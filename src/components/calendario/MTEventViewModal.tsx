import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Briefcase, User, Phone, Calendar, Clock, FileText, Activity } from 'lucide-react';
import type { ConsultaStatus } from '@/types/database';

interface MTEventData {
  consulta_id: string;
  funcionario_id: string;
  numero_funcionario: string;
  nome_completo: string;
  telefone: string | null;
  idade: number | null;
  data_consulta: string;
  hora_consulta: string;
  tipo_exame: string | null;
  status: ConsultaStatus;
  notas: string | null;
  resultado: string | null;
}

interface MTEventViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: MTEventData | null;
}

const statusLabels: Record<ConsultaStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  falta: 'Falta',
  remarcada: 'Remarcada',
};

const statusColors: Record<ConsultaStatus, string> = {
  agendada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  confirmada: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  concluida: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
  cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  falta: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  remarcada: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export function MTEventViewModal({ open, onOpenChange, event }: MTEventViewModalProps) {
  if (!event) return null;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />
            Consulta Medicina do Trabalho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Funcionário Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Nº Funcionário</p>
                <p className="font-semibold">{event.numero_funcionario}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-semibold">{event.nome_completo}</p>
              </div>
            </div>

            {event.telefone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-semibold">{event.telefone}</p>
                </div>
              </div>
            )}

            {event.idade !== null && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Idade</p>
                  <p className="font-semibold">{event.idade} anos</p>
                </div>
              </div>
            )}
          </div>

          {/* Consulta Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-semibold">{formatDate(event.data_consulta)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Hora</p>
                <p className="font-semibold">{event.hora_consulta?.substring(0, 5)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Exame</p>
              <p className="font-semibold">{event.tipo_exame || 'Periódico'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[event.status]}>
                {statusLabels[event.status]}
              </Badge>
            </div>
          </div>

          {event.resultado && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Resultado</p>
                <p className="font-semibold">{event.resultado}</p>
              </div>
            </div>
          )}

          {event.notas && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{event.notas}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
