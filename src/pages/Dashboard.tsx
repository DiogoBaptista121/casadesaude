import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Activity, AlertTriangle, CheckCircle, Clock,
  Building2, Truck, Stethoscope, FileDown, Loader2,
  Check, ChevronsUpDown, SlidersHorizontal,
} from 'lucide-react';
import {
  startOfToday, endOfToday, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  format, parseISO,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getExamStatus } from '@/lib/examUtils';
import MapaIdanha from '@/components/Mapa';
import { MapPin, TrendingUp, Users2 } from 'lucide-react';
import { resolveFreguesia } from '@/lib/unidadeMovelUtils';

// ─── Mock geographic data (consultas por freguesia e tipo de serviço) ─────────
const MOCK_GEO: Record<string, { medico: number; enfermagem: number }> = {
  'Idanha-a-Nova': { medico: 42, enfermagem: 58 },
  'Ladoeiro': { medico: 18, enfermagem: 24 },
  'Monsanto e Idanha-a-Velha': { medico: 31, enfermagem: 19 },
  'Zebreira e Segura': { medico: 14, enfermagem: 22 },
  'Penha Garcia': { medico: 20, enfermagem: 11 },
  'Rosmaninhal': { medico: 9, enfermagem: 15 },
  'Monfortinho e Salvaterra do Extremo': { medico: 27, enfermagem: 33 },
  'Oledo': { medico: 12, enfermagem: 8 },
  'São Miguel de Acha': { medico: 16, enfermagem: 20 },
  'Aldeia de Santa Margarida': { medico: 8, enfermagem: 10 },
  'Medelim': { medico: 11, enfermagem: 14 },
  'Proença-a-Velha': { medico: 7, enfermagem: 9 },
  'Toulões': { medico: 5, enfermagem: 7 },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Periodo = 'mes' | 'ano' | 'personalizado';
type TipoServico = 'todos' | 'medico' | 'enfermagem';

interface FuncionarioRow { ultimo_exame: string | null; data_nascimento: string | null }
interface ConsultaRow {
  id: string; data: string;
  local?: string | null; origem?: string | null;
  servicos?: { nome: string } | null;
  servico?: { nome: string } | null;
  freguesia?: string | null;
}
interface MTCounts { em_dia: number; a_vencer: number; vencido: number; sem_data: number; total: number }
interface ChartPoint { label: string; 'Casa de Saúde': number; 'Unidade Móvel': number }
interface ServicoStats { total: number; casaSaude: number; unidadeMovel: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');

function getRange(p: Periodo, inicio = '', fim = ''): [string, string] {
  const now = new Date();
  if (p === 'personalizado' && inicio && fim) return [inicio, fim];
  if (p === 'ano') return [isoDate(startOfYear(now)), isoDate(endOfYear(now))];
  return [isoDate(startOfMonth(now)), isoDate(endOfMonth(now))];
}

function getLocalLabel(c: ConsultaRow): 'Casa de Saúde' | 'Unidade Móvel' {
  const raw = (c.local || c.origem || '').toLowerCase();
  return raw.includes('móvel') || raw.includes('movel') || raw === 'unidade_movel'
    ? 'Unidade Móvel' : 'Casa de Saúde';
}

function getServicoNome(c: ConsultaRow) {
  return (c.servicos?.nome || c.servico?.nome || 'Sem Serviço').trim();
}

function buildChart(consultas: ConsultaRow[], periodo: Periodo): ChartPoint[] {
  const map = new Map<string, ChartPoint>();
  for (const c of consultas) {
    const date = parseISO(c.data);
    const label = periodo === 'ano'
      ? format(date, 'MMM yyyy', { locale: pt })
      : format(date, 'dd/MM', { locale: pt });
    if (!map.has(label)) map.set(label, { label, 'Casa de Saúde': 0, 'Unidade Móvel': 0 });
    map.get(label)![getLocalLabel(c)]++;
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

const PRIORITY = ['medicina geral', 'enfermagem'];
const FREGUESIAS = [
  'Idanha-a-Nova', 'Ladoeiro', 'Monsanto', 'Zebreira',
  'Penha Garcia', 'Rosmaninhal', 'Monfortinho', 'Oledo',
];

function buildPeriodoLabel(p: Periodo, inicio: string, fim: string) {
  if (p === 'personalizado' && inicio && fim) return `${inicio} → ${fim}`;
  if (p === 'ano') return `Ano ${new Date().getFullYear()}`;
  return format(new Date(), "MMMM yyyy", { locale: pt }).replace(/^\w/, c => c.toUpperCase());
}

// ─── Small MT stat card ───────────────────────────────────────────────────────
function MtCard({ icon: Icon, label, value, ring, loading }: {
  icon: React.ElementType; label: string; value: number; ring: string; loading: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 p-3 print:p-1.5 rounded-xl border ${ring} bg-card`}>
      <Icon className="w-4 h-4 shrink-0 print:w-3 print:h-3" />
      <div>
        <p className="text-[11px] print:text-[9px] text-muted-foreground leading-none mb-0">{label}</p>
        {loading
          ? <div className="h-6 w-10 bg-muted rounded animate-pulse" />
          : <p className="text-xl print:text-sm font-bold leading-none">{value}</p>
        }
      </div>
    </div>
  );
}

// ─── Specialty card ───────────────────────────────────────────────────────────
function EspecialidadeCard({ nome, stats }: { nome: string; stats: ServicoStats }) {
  const pctCS = stats.total > 0 ? Math.round((stats.casaSaude / stats.total) * 100) : 0;
  const pctUM = 100 - pctCS;
  return (
    <div className="rounded-xl p-2.5 print:p-1.5 bg-card border border-border/50 flex flex-col gap-1.5 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-[11px] print:text-[9px] text-muted-foreground leading-tight truncate">{nome}</p>
        <span className="text-base print:text-xs font-bold text-foreground shrink-0 leading-none">{stats.total}</span>
      </div>
      {/* Split bar — teal for CS, rose for UM */}
      <div className="h-0.5 rounded-full overflow-hidden flex gap-px">
        <div className="h-full rounded-l-full" style={{ width: `${pctCS}%`, background: '#0f766e' }} />
        <div className="h-full rounded-r-full flex-1" style={{ background: '#be123c' }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#0f766e' }} />
          CS {stats.casaSaude}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#be123c' }} />
          UM {stats.unidadeMovel}
        </span>
      </div>
    </div>
  );
}

// ─── Multi-select combobox ────────────────────────────────────────────────────
function ServicosFilter({ all, selected, onToggle }: {
  all: string[]; selected: string[]; onToggle: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? 'Todas as Especialidades'
    : selected.length === 1 ? selected[0]
      : `${selected.length} especialidades`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"
          className="h-9 min-w-52 justify-between font-normal text-sm gap-2 bg-card">
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>Sem especialidades</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { selected.forEach(s => onToggle(s)); }}>
                <Check className={cn('mr-2 h-4 w-4', selected.length === 0 ? 'opacity-100' : 'opacity-0')} />
                Todas as Especialidades
              </CommandItem>
              {all.map(s => (
                <CommandItem key={s} onSelect={() => onToggle(s)}>
                  <Check className={cn('mr-2 h-4 w-4', selected.includes(s) ? 'opacity-100' : 'opacity-0')} />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);
  const [servicosGlobais, setServicosGlobais] = useState<string[]>([]);
  const [selectedFreguesia, setSelectedFreguesia] = useState<string | null>(null);
  const [pdfOrientacao, setPdfOrientacao] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfEscala, setPdfEscala] = useState<'1' | '0.90' | '0.80'>('1');
  const [tipoServico, setTipoServico] = useState<TipoServico>('todos');
  const [hoveredFreguesia, setHoveredFreguesia] = useState<string | null>(null);

  const [loadingMT, setLoadingMT] = useState(true);
  const [loadingCS, setLoadingCS] = useState(true);
  const [funcionarios, setFuncionarios] = useState<FuncionarioRow[]>([]);
  const [consultas, setConsultas] = useState<ConsultaRow[]>([]);

  // ── Fetches ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingMT(true);
      const [{ data, error }, { data: servs }] = await Promise.all([
        supabase.from('funcionarios_mt').select('ultimo_exame, data_nascimento').eq('estado', 'Ativo' as any),
        supabase.from('servicos').select('nome').order('nome'),
      ]);
      if (error) console.error('MT:', error);
      else setFuncionarios((data ?? []) as FuncionarioRow[]);
      if (servs) setServicosGlobais(servs.map((s: { nome: string }) => s.nome));
      setLoadingMT(false);
    })();
  }, []);

  useEffect(() => {
    const ok = periodo !== 'personalizado' || (dataInicio && dataFim && dataInicio <= dataFim);
    if (!ok) return;
    (async () => {
      setLoadingCS(true);
      const [s, e] = getRange(periodo, dataInicio, dataFim);
      const { data, error } = await supabase
        .from('consultas').select('*, servicos(nome)')
        .gte('data', s).lte('data', e).order('data', { ascending: true });
      if (error) console.error('CS:', error);
      else setConsultas((data ?? []) as unknown as ConsultaRow[]);
      setLoadingCS(false);
    })();
  }, [periodo, dataInicio, dataFim]);

  // ── MT KPIs ───────────────────────────────────────────────────────────────
  const mtCounts = useMemo<MTCounts>(() => {
    const c: MTCounts = { em_dia: 0, a_vencer: 0, vencido: 0, sem_data: 0, total: funcionarios.length };
    for (const f of funcionarios) c[getExamStatus(f.ultimo_exame, f.data_nascimento)]++;
    return c;
  }, [funcionarios]);

  // ── Specialty breakdown ───────────────────────────────────────────────────
  const { allServicos, servicoStats } = useMemo(() => {
    const stats: Record<string, ServicoStats> = {};
    for (const c of consultas) {
      const nome = getServicoNome(c);
      if (!stats[nome]) stats[nome] = { total: 0, casaSaude: 0, unidadeMovel: 0 };
      stats[nome].total++;
      if (getLocalLabel(c) === 'Unidade Móvel') stats[nome].unidadeMovel++;
      else stats[nome].casaSaude++;
    }
    const sorted = Object.entries(stats).sort(([a, sa], [b, sb]) => {
      const ap = PRIORITY.some(p => a.toLowerCase().includes(p));
      const bp = PRIORITY.some(p => b.toLowerCase().includes(p));
      if (ap !== bp) return ap ? -1 : 1;
      return sb.total - sa.total;
    });
    return { allServicos: sorted.map(([n]) => n), servicoStats: Object.fromEntries(sorted) };
  }, [consultas]);

  // ── Parish stats — smart attribution via resolveFreguesia ───────────
  const frecuesiaStatsReal = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of consultas) {
      // Prefers DB 'freguesia'; falls back to smart 15-day route attribution
      const f = resolveFreguesia(c.data, c.local ?? c.origem, c.freguesia);
      if (!f) continue;
      counts[f] = (counts[f] ?? 0) + 1;
    }
    return counts;
  }, [consultas]);

  const geoStats = useMemo(() => {
    const hasReal = Object.keys(frecuesiaStatsReal).length > 0;
    if (hasReal) return frecuesiaStatsReal;
    return Object.fromEntries(
      Object.entries(MOCK_GEO).map(([f, v]) => [
        f,
        tipoServico === 'medico' ? v.medico
          : tipoServico === 'enfermagem' ? v.enfermagem
            : v.medico + v.enfermagem,
      ])
    );
  }, [frecuesiaStatsReal, tipoServico]);

  const geoRanking = useMemo(() =>
    Object.entries(geoStats)
      .filter(([f]) => f !== 'Não Indicada')
      .sort(([, a], [, b]) => b - a),
    [geoStats]
  );

  const geoTotal = useMemo(() => Object.values(geoStats).reduce((s, v) => s + v, 0), [geoStats]);
  const frecuesiaStats = geoStats;

  // ── Filter by selected services + parish ─────────────────────────────────
  const filteredConsultas = useMemo(() => {
    let data = consultas;
    if (selectedServicos.length > 0) data = data.filter(c => selectedServicos.includes(getServicoNome(c)));
    if (selectedFreguesia) data = data.filter(c => c.freguesia === selectedFreguesia);
    return data;
  }, [consultas, selectedServicos, selectedFreguesia]);

  const filteredStats = useMemo(() =>
    selectedServicos.length === 0 ? servicoStats
      : Object.fromEntries(Object.entries(servicoStats).filter(([n]) => selectedServicos.includes(n))),
    [servicoStats, selectedServicos]);

  const totalCS = useMemo(() => {
    let cs = 0, um = 0;
    for (const c of filteredConsultas) {
      if (getLocalLabel(c) === 'Unidade Móvel') um++; else cs++;
    }
    return { total: filteredConsultas.length, cs, um };
  }, [filteredConsultas]);

  const chartData = useMemo(() => buildChart(filteredConsultas, periodo), [filteredConsultas, periodo]);
  const toggleServico = (s: string) =>
    setSelectedServicos(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const periodoLabel = buildPeriodoLabel(periodo, dataInicio, dataFim);
  const servicosLabel = selectedServicos.length === 0 ? 'Todas as Especialidades' : selectedServicos.join(', ');
  const today = new Date();

  return (
    <>
      {/* ── Print CSS ──────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 8mm; /* Margem ligeiramente reduzida para respirar melhor */
          }
          
          /* O SEGREDO PARA ELIMINAR A 2ª PÁGINA: 
             Forçar a altura máxima de 1 ecrã e cortar lixo invisível */
          body, html, #root { 
            background-color: white !important; 
            height: 100vh !important; 
            overflow: hidden !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Esconder tudo (Menu lateral, etc) */
          body * { visibility: hidden; }
          
          /* Mostrar apenas o relatório */
          #report-sheet, #report-sheet * { visibility: visible; }
          
          /* O SEGREDO DO ZOOM: Forçar largura de desktop. 
             O browser vai encolher tudo proporcionalmente para caber no A4! */
          #report-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 1024px !important; 
            max-width: 1024px !important;
            max-height: 280mm !important; /* Limite de segurança extra para a folha A4 */
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .no-print { display: none !important; }
          * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="page-enter flex flex-col gap-4 overflow-y-auto pb-12">

        {/* ══════════════════════════════════════════════════════════════════
            CONTROL PANEL (no-print)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="no-print bg-muted/60 dark:bg-slate-900 border border-border rounded-2xl p-4">
          <div className="flex flex-wrap gap-4 items-end justify-between">

            {/* Left: filters */}
            <div className="flex flex-wrap gap-3 items-end">

              {/* Tipo de Serviço */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo de Serviço</Label>
                <Select value={tipoServico} onValueChange={(v) => setTipoServico(v as TipoServico)}>
                  <SelectTrigger className="w-40 h-9 text-sm bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="enfermagem">Enfermagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Período</Label>
                <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
                  <SelectTrigger className="w-44 h-9 text-sm bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="ano">Este Ano</SelectItem>
                    <SelectItem value="personalizado">Intervalo Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodo === 'personalizado' && (
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">De</Label>
                    <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                      className="h-9 text-sm w-36 bg-card border-border" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Até</Label>
                    <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                      className="h-9 text-sm w-36 bg-card border-border" />
                  </div>
                </div>
              )}

              {/* Specialties multi-select */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Especialidade(s)</Label>
                <ServicosFilter all={servicosGlobais} selected={selectedServicos} onToggle={toggleServico} />
              </div>

              {(loadingMT || loadingCS) && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400 self-end mb-2" />
              )}
            </div>

            {/* Right: export + pdf config */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 border-border bg-card shrink-0" title="Configurar PDF">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="end">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Configurar PDF</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Orientação</Label>
                      <Select value={pdfOrientacao} onValueChange={v => setPdfOrientacao(v as 'portrait' | 'landscape')}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Vertical (Portrait)</SelectItem>
                          <SelectItem value="landscape">Horizontal (Landscape)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Ajuste de Escala</Label>
                      <Select value={pdfEscala} onValueChange={v => setPdfEscala(v as '1' | '0.90' | '0.80')}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Tamanho Real (100%)</SelectItem>
                          <SelectItem value="0.90">Ajustar Página (90%)</SelectItem>
                          <SelectItem value="0.80">Compacto (80%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={() => window.print()} className="h-10 px-5 gap-2 text-sm font-semibold ">
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            REPORT SHEET (A4 preview)
        ══════════════════════════════════════════════════════════════════ */}
        {/* CORPO DO RELATÓRIO */}
        <div
          id="report-sheet"
          className="bg-card dark:bg-slate-900 rounded-2xl border border-border/60 p-8 space-y-6"
        >
          {/* ... cabeçalho com a imagem, cartões, etc ... */}
          {/* ── Institutional header ─────────────────────────────────── */}
          <div className="avoid-break border-b-2 print:break-inside-avoid border-slate-800 pb-5 print:pb-2">
            <div className="flex items-start gap-4">
              <img
                src="/logo-idanha.png" /* Vai buscar exatamente à pasta public */
                alt="Câmara Municipal de Idanha-a-Nova"
                className="h-10 w-auto object-contain print:h-12"
              />
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Câmara Municipal de Idanha-a-Nova
                </p>
                <h1 className="text-xl font-bold text-foreground leading-tight mt-0.5">
                  Relatório Integrado de Saúde e Segurança no Trabalho
                </h1>
              </div>
              <div className="text-right text-[11px] text-slate-500 shrink-0">
                <p className="font-semibold">{format(today, "dd 'de' MMMM yyyy", { locale: pt })}</p>
                <p>{format(today, 'HH:mm', { locale: pt })}</p>
              </div>
            </div>
            {/* Applied filters summary */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium text-muted-foreground">
                📅 {periodoLabel}
              </span>
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium text-muted-foreground">
                🩺 {servicosLabel}
              </span>
            </div>
          </div>

          {/* ── Section 1: Medicina do Trabalho ─────────────────────── */}
          <div className="avoid-break print:break-inside-avoid">
            <SectionTitle>🏥 Medicina do Trabalho — Estado dos Exames</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MtCard icon={Activity} label="Funcionários Ativos" value={mtCounts.total} ring="border-border" loading={loadingMT} />
              <MtCard icon={CheckCircle} label="Em Dia 🟢" value={mtCounts.em_dia} ring="border-emerald-300" loading={loadingMT} />
              <MtCard icon={Clock} label="A Vencer (30d) 🟠" value={mtCounts.a_vencer} ring="border-amber-300" loading={loadingMT} />
              <MtCard icon={AlertTriangle} label="Vencidos 🔴" value={mtCounts.vencido} ring="border-red-300" loading={loadingMT} />
            </div>
          </div>

          {/* ── Section 2: Cartão de Saúde — summary ────────────────── */}
          <div className="avoid-break print:break-inside-avoid">
            <SectionTitle>💳 Cartão de Saúde — Resumo ({periodoLabel})</SectionTitle>
            <div className="grid grid-cols-3 gap-4 mb-6 print:gap-2 print:mb-2">
              {[
                { icon: Stethoscope, label: 'Total Consultas', value: totalCS.total, cls: 'bg-primary/8 border-primary/20 text-primary' },
                { icon: Building2, label: 'Casa de Saúde', value: totalCS.cs, cls: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400' },
                { icon: Truck, label: 'Unidade Móvel', value: totalCS.um, cls: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400' },
              ].map(({ icon: Icon, label, value, cls }) => (
                <div key={label} className={`flex items-center gap-3 p-4 print:p-2 rounded-xl border-2 ${cls}`}>
                  <Icon className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium opacity-70 leading-none mb-1">{label}</p>
                    {loadingCS
                      ? <div className="h-7 w-12 bg-current/10 rounded animate-pulse" />
                      : <p className="text-3xl font-bold leading-none">{value}</p>
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Specialty cards */}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Distribuição por Especialidade
            </p>
            {loadingCS ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : Object.keys(filteredStats).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Sem dados para o período / filtro selecionado.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 gap-3 print:gap-2 mt-3">
                {Object.entries(filteredStats).map(([nome, stats]) => (
                  <EspecialidadeCard key={nome} nome={nome} stats={stats} />
                ))}
              </div>
            )}
          </div>

          {/* ── Section 3: Análise Geográfica ──────────────────────── */}
          <div className="avoid-break print:break-inside-avoid">
            <SectionTitle>🗺️ Análise Geográfica por Freguesia</SectionTitle>

            <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 print:flex-row gap-4 items-start">

              {/* Left card: Map */}
              <div className="bg-card border border-border rounded-xl p-4 relative print:break-inside-avoid">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Mapa do Concelho</p>
                  </div>
                  {selectedFreguesia && (
                    <button onClick={() => setSelectedFreguesia(null)}
                      className="text-xs text-teal-600 dark:text-teal-400 underline hover:no-underline">
                      Limpar seleção
                    </button>
                  )}
                </div>

                {hoveredFreguesia && (
                  <div className="absolute top-12 right-4 z-10 bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none">
                    <p className="font-semibold text-foreground">{hoveredFreguesia}</p>
                    <p className="text-muted-foreground">
                      {tipoServico === 'todos' ? 'Total' : tipoServico === 'medico' ? 'Médico' : 'Enfermagem'}:{' '}
                      <span className="font-bold text-foreground">{geoStats[hoveredFreguesia] ?? 0}</span> consultas
                    </p>
                  </div>
                )}

                <div onMouseLeave={() => setHoveredFreguesia(null)}>
                  <MapaIdanha
                    stats={geoStats}
                    selected={selectedFreguesia}
                    onSelect={(f) => {
                      setSelectedFreguesia(prev => prev === f ? null : f);
                      setHoveredFreguesia(f);
                    }}
                  />
                </div>

                {selectedFreguesia && (
                  <p className="mt-2 text-xs text-teal-600 dark:text-teal-400 font-medium">
                    A filtrar por: <strong>{selectedFreguesia}</strong>
                  </p>
                )}
              </div>

              {/* Right card: Parish ranking */}
              <div className="bg-card border border-border rounded-xl overflow-hidden print:break-inside-avoid">
                <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Consultas por Freguesia</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">{geoTotal} total</span>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[440px] print:max-h-none print:overflow-visible divide-y divide-border/60">
                  {geoRanking.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                      <MapPin className="w-6 h-6 opacity-40" />
                      <p className="text-sm">Sem dados para o período.</p>
                    </div>
                  ) : (
                    geoRanking.map(([freguesia, total], idx) => {
                      const pct = geoTotal > 0 ? Math.round((total / geoTotal) * 100) : 0;
                      const isSelected = selectedFreguesia === freguesia;
                      return (
                        <button
                          key={freguesia}
                          onClick={() => setSelectedFreguesia(prev => prev === freguesia ? null : freguesia)}
                          onMouseEnter={() => setHoveredFreguesia(freguesia)}
                          onMouseLeave={() => setHoveredFreguesia(null)}
                          className={cn(
                            'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/30 border-l-2 border-teal-600'
                              : 'hover:bg-muted/60 border-l-2 border-transparent'
                          )}
                        >
                          <span className={cn(
                            'text-xs font-bold w-5 text-center shrink-0',
                            idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-700' : 'text-muted-foreground'
                          )}>{idx + 1}</span>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                'text-sm font-medium truncate',
                                isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-foreground'
                              )}>{freguesia}</span>
                              <span className="text-sm font-bold text-foreground shrink-0">{total}</span>
                            </div>
                            <div className="h-px bg-muted overflow-hidden rounded-full mt-1">
                              <div
                                className="h-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: isSelected ? '#0f766e' : '#0f766e99' }}
                              />
                            </div>
                          </div>

                          <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* PDF: compact table */}
            <div className="print-only hidden print:hidden">
              <table className="w-full text-[9px] border-collapse">
                <tbody>
                  {geoRanking.reduce((rows: JSX.Element[], [f, n], i) => {
                    if (i % 2 === 0) {
                      const [f2, n2] = geoRanking[i + 1] ?? [null, null];
                      rows.push(
                        <tr key={f} className={i % 4 === 0 ? 'bg-muted/50' : ''}>
                          <td className="py-0.5 px-1 font-medium border border-border">{f}</td>
                          <td className="py-0.5 px-1 text-right font-bold border border-border">{n}</td>
                          {f2 ? <>
                            <td className="py-0.5 px-1 font-medium border border-border">{f2}</td>
                            <td className="py-0.5 px-1 text-right font-bold border border-border">{n2}</td>
                          </> : <><td className="border border-border" /><td className="border border-border" /></>}
                        </tr>
                      );
                    }
                    return rows;
                  }, [])}
                </tbody>
              </table>
            </div>
          </div>


          {/* ── Section 4: Evolução ──────────────────────────────────── */}
          <div className="avoid-break print:break-inside-avoid">
            <SectionTitle>📈 Evolução — Casa de Saúde vs Unidade Móvel</SectionTitle>
            {loadingCS ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="w-8 h-8 opacity-30" />
                <p className="text-sm">Sem dados para o período selecionado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 2, right: 12, left: -16, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  {/* ADICIONA isAnimationActive={false} NAS DUAS LINHAS */}
                  <Line
                    type="monotone"
                    dataKey="Casa de Saúde"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Unidade Móvel"
                    stroke="#be123c"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Report footer ─────────────────────────────────────────── */}
          <div className="pt-4 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Câmara Municipal de Idanha-a-Nova · Sistema de Gestão de Saúde e Segurança</span>
            <span className="font-semibold">Documento confidencial</span>
          </div>
        </div>
      </div >
    </>
  );
}

// ─── Section divider (used only once — no duplicate) ─────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 print:mb-1 flex items-center gap-2">
      <span className="flex-1 h-px bg-border" />
      {children}
      <span className="flex-1 h-px bg-border" />
    </h2>
  );
}
