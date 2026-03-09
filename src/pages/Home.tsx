import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Calendar,
  CreditCard,
  Clock,
  MapPin,
  ArrowRight,
  UserPlus,
  Stethoscope,
  Briefcase,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import type { ConsultaStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgendaItem {
  id: string;
  hora: string;
  paciente_nif: string;
  nome_completo: string | null;
  servico_nome: string | null;
  servico_cor: string | null;
  local: string | null;
  status: ConsultaStatus;
}

interface ChartPoint {
  dia: string;   // 'Seg', 'Ter', etc.
  consultas: number;
  cartoes: number;
}

// ─── KPI card config ──────────────────────────────────────────────────────────
const KPI_CONFIG = [
  {
    key: 'consultasHoje' as const,
    label: 'Consultas Hoje',
    description: 'Marcadas para hoje',
    icon: Calendar,
    iconBg: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-500',
    accent: 'from-blue-500/10 to-transparent',
  },
  {
    key: 'totalCartoes' as const,
    label: 'Cartões de Saúde',
    description: 'Total registados',
    icon: CreditCard,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-500',
    accent: 'from-emerald-500/10 to-transparent',
  },
  {
    key: 'localHoje' as const,
    label: 'Unidade Móvel',
    description: 'Consultas hoje',
    icon: MapPin,
    iconBg: 'bg-violet-50 dark:bg-violet-950/30',
    iconColor: 'text-violet-500',
    accent: 'from-violet-500/10 to-transparent',
  },
  {
    key: 'pendentes' as const,
    label: 'Pendentes',
    description: 'Agendadas / confirmadas',
    icon: Clock,
    iconBg: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-500',
    accent: 'from-amber-500/10 to-transparent',
  },
] as const;

// ─── Status colors for timeline dots ──────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  agendada: 'bg-blue-400',
  confirmada: 'bg-emerald-400',
  concluida: 'bg-slate-400',
  cancelada: 'bg-red-400',
  falta: 'bg-orange-400',
  remarcada: 'bg-purple-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />;
}

function formatDate() {
  return new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 19) return 'Boa tarde';
  return 'Boa noite';
}

/** Build the last 7 days label array starting from Monday direction */
function getLast7DaysLabels(): string[] {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return labels[d.getDay()];
  });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur border border-border/50 shadow-xl rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state SVG ──────────────────────────────────────────────────────────
function EmptyAgenda() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
      <svg
        width="72" height="72" viewBox="0 0 72 72" fill="none"
        xmlns="http://www.w3.org/2000/svg" className="opacity-20"
        aria-hidden="true"
      >
        <rect x="6" y="14" width="60" height="50" rx="8" stroke="currentColor" strokeWidth="2" />
        <rect x="6" y="14" width="60" height="16" rx="8" fill="currentColor" fillOpacity="0.1" />
        <line x1="22" y1="6" x2="22" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="6" x2="50" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="22" cy="44" r="3" fill="currentColor" fillOpacity="0.3" />
        <circle cx="36" cy="44" r="3" fill="currentColor" fillOpacity="0.3" />
        <circle cx="50" cy="44" r="3" fill="currentColor" fillOpacity="0.3" />
        <circle cx="22" cy="56" r="3" fill="currentColor" fillOpacity="0.3" />
        <circle cx="36" cy="56" r="3" fill="currentColor" fillOpacity="0.3" />
      </svg>
      <p className="text-sm font-medium text-foreground/50">Agenda limpa</p>
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Não existem consultas<br />agendadas para hoje
      </p>
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function PremiumCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card rounded-2xl ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { profile, canEdit } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ consultasHoje: 0, totalCartoes: 0, localHoje: 0, pendentes: 0 });
  const [agendaHoje, setAgendaHoje] = useState<AgendaItem[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const labels = getLast7DaysLabels();

    // Build date range for last 7 days
    const dateRange = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    try {
      const [
        consultasHojeRes,
        totalCartoesRes,
        pendentesRes,
        localRes,
        agendaRes,
        consultasWeekRes,
        cartoesWeekRes,
      ] = await Promise.all([
        supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('data', today),
        supabase.from('cartao_saude').select('id', { count: 'exact', head: true }),
        supabase.from('consultas').select('id', { count: 'exact', head: true }).in('status', ['agendada', 'confirmada', 'remarcada']),
        supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('data', today).eq('local', 'Unidade Móvel'),
        // Agenda today
        supabase.from('consultas')
          .select('id, hora, paciente_nif, status, local, servicos(nome, cor)')
          .eq('data', today)
          .order('hora', { ascending: true })
          .limit(10),
        // Weekly consultas counts by day
        supabase.from('consultas')
          .select('data')
          .gte('data', dateRange[0])
          .lte('data', dateRange[6]),
        // Weekly cartoes created by day
        supabase.from('cartao_saude')
          .select('created_at')
          .gte('created_at', dateRange[0])
          .lte('created_at', dateRange[6] + 'T23:59:59'),
      ]);

      setKpis({
        consultasHoje: consultasHojeRes.count ?? 0,
        totalCartoes: totalCartoesRes.count ?? 0,
        localHoje: localRes.count ?? 0,
        pendentes: pendentesRes.count ?? 0,
      });

      // Build chart data — count per day
      const consultasByDay: Record<string, number> = {};
      const cartoesByDay: Record<string, number> = {};
      dateRange.forEach((d) => { consultasByDay[d] = 0; cartoesByDay[d] = 0; });

      ((consultasWeekRes.data ?? []) as any[]).forEach((r) => {
        const d = (r.data ?? '').substring(0, 10);
        if (d in consultasByDay) consultasByDay[d]++;
      });
      ((cartoesWeekRes.data ?? []) as any[]).forEach((r) => {
        const d = (r.created_at ?? '').substring(0, 10);
        if (d in cartoesByDay) cartoesByDay[d]++;
      });

      setChartData(dateRange.map((d, i) => ({
        dia: labels[i],
        consultas: consultasByDay[d],
        cartoes: cartoesByDay[d],
      })));

      // Enrich agenda with patient names
      const rawAgenda = ((agendaRes.data ?? []) as any[]);
      if (rawAgenda.length > 0) {
        const nifsUnicos = [...new Set(rawAgenda.map((r: any) => r.paciente_nif).filter(Boolean))];
        const { data: cartoes } = await supabase
          .from('cartao_saude')
          .select('nif, nome_completo')
          .in('nif', nifsUnicos as any);
        const cartaoMap = new Map<string, string>();
        ((cartoes ?? []) as any[]).forEach((c) => cartaoMap.set(c.nif, c.nome_completo));

        setAgendaHoje(rawAgenda.map((r: any) => ({
          id: r.id,
          hora: (r.hora ?? '').substring(0, 5),
          paciente_nif: r.paciente_nif,
          nome_completo: cartaoMap.get(r.paciente_nif) ?? null,
          servico_nome: r.servicos?.nome ?? null,
          servico_cor: r.servicos?.cor ?? null,
          local: r.local ?? null,
          status: r.status ?? 'agendada',
        })));
      } else {
        setAgendaHoje([]);
      }
    } catch (err) {
      console.error('[Home] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.nome?.split(' ')[0] || 'Utilizador';

  const quickActions = [
    { label: 'Novo Paciente', icon: UserPlus, path: '/cartao-saude', show: canEdit },
    { label: 'Nova Consulta', icon: Stethoscope, path: '/consultas', show: canEdit },
    { label: 'Ficha MT', icon: Briefcase, path: '/medicina-trabalho', show: canEdit },
    { label: 'Calendário', icon: CalendarDays, path: '/calendario', show: true },
  ].filter((a) => a.show);

  return (
    <div className="page-enter space-y-6 w-full">

      {/* ── Greeting header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            Resumo do dia &nbsp;·&nbsp; {formatDate()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quickActions.slice(0, 2).map(({ label, icon: Icon, path }) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              onClick={() => navigate(path)}
              className="gap-2 rounded-xl text-xs"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map(({ key, label, description, icon: Icon, iconBg, iconColor }) => (
          <PremiumCard key={key} className="p-5 relative overflow-hidden">
            {/* Subtle accent gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${KPI_CONFIG.find(c => c.key === key)?.accent ?? ''} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${iconColor}`} style={{ width: 18, height: 18 }} />
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-14 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-foreground tracking-tight leading-none">
                  {kpis[key]}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* ── Main split: Agenda (1/3) + Chart (2/3) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Agenda de Hoje ──────────────────────────────────────── */}
        <PremiumCard className="lg:col-span-2 flex flex-col overflow-hidden min-h-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Agenda de Hoje</h2>
              {!loading && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {agendaHoje.length === 0 ? 'Nenhuma marcação' : `${agendaHoje.length} marcaç${agendaHoje.length === 1 ? 'ão' : 'ões'}`}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/consultas')}
              className="text-xs font-medium text-primary hover:text-primary/70 flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="space-y-3 pt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-2.5 w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : agendaHoje.length === 0 ? (
              <EmptyAgenda />
            ) : (
              <div className="space-y-1 py-1">
                {agendaHoje.map((item) => {
                  const barColor = item.servico_cor ?? '#94a3b8';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors group"
                      onClick={() => navigate('/consultas')}
                    >
                      {/* Colored service bar */}
                      <div
                        className="w-1 h-10 rounded-full shrink-0"
                        style={{ background: barColor }}
                      />
                      {/* Hour badge */}
                      <div className="w-11 text-center shrink-0">
                        <span className="text-xs font-mono font-bold text-foreground/70 tabular-nums">
                          {item.hora}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                          {item.nome_completo ?? item.paciente_nif}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.servico_nome ?? '—'}
                          {item.local && <span className="text-muted-foreground/50"> · {item.local}</span>}
                        </p>
                      </div>
                      {/* Status */}
                      <StatusBadge status={item.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions footer */}
          {canEdit && (
            <div className="px-4 py-3 border-t border-border/40">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 2).map(({ label, icon: Icon, path }) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted/80 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </PremiumCard>

        {/* ── Atividade Semanal ──────────────────────────────────── */}
        <PremiumCard className="lg:col-span-3 flex flex-col overflow-hidden min-h-[420px]">
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Atividade Semanal</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Evolução de consultas e cartões nos últimos 7 dias
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 rounded-full bg-blue-500 inline-block" />
                Consultas
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 rounded-full bg-emerald-500 inline-block" />
                Cartões
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-5 min-h-[360px]">
            {loading ? (
              <div className="h-full flex items-end gap-8 px-6 pb-4">
                {[6, 9, 5, 8, 10, 4, 7].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 animate-pulse rounded-t-md bg-muted"
                    style={{ height: `${h * 10}%` }}
                  />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                >
                  {/* Only faint horizontal dashes, no vertical lines */}
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="dia"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    dy={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    width={28}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                  {/* Consultas — blue */}
                  <Line
                    type="monotone"
                    dataKey="consultas"
                    name="Consultas"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'white' }}
                    activeDot={{ r: 5.5, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }}
                  />
                  {/* Cartões — emerald */}
                  <Line
                    type="monotone"
                    dataKey="cartoes"
                    name="Cartões"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'white' }}
                    activeDot={{ r: 5.5, fill: '#10b981', stroke: 'white', strokeWidth: 2 }}
                    strokeDasharray="0"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
