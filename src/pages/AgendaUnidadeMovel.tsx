import { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    MapPin,
    Clock,
    Truck,
    ChevronLeft,
    ChevronRight,
    Route,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Dados das rotas ───────────────────────────────────────────────────────────
// dataInicio: primeira ocorrência real da rota (YYYY-MM-DD).
// O sistema calcula automaticamente a sua repetição quinzenal (a cada 14 dias).
const rotasUnidadeMovel = [
    {
        local: "Termas de Monfortinho",
        freguesia: "Monfortinho e Salvaterra do Extremo",
        dataInicio: "2026-03-02", // Uma segunda-feira (Semana A)
        horario: "09:00 - 10:30"
    },
    {
        local: "Monfortinho",
        freguesia: "Monfortinho e Salvaterra do Extremo",
        dataInicio: "2026-03-02",
        horario: "11:00 - 12:00"
    },
    {
        local: "Torre",
        freguesia: "Monfortinho e Salvaterra do Extremo",
        dataInicio: "2026-03-02",
        horario: "12:10 - 13:00"
    },
    {
        local: "Segura",
        freguesia: "Zebreira e Segura",
        dataInicio: "2026-03-03", // Uma terça-feira (Semana A)
        horario: "09:00 - 11:00"
    },
    {
        local: "Salvaterra do Extremo",
        freguesia: "Monfortinho e Salvaterra do Extremo",
        dataInicio: "2026-03-03",
        horario: "11:30 - 13:00"
    },
    {
        local: "Medelim",
        freguesia: "Medelim",
        dataInicio: "2026-03-04", // Uma quarta-feira (Semana A)
        horario: "09:00 - 11:00"
    },
    {
        local: "Alcafozes",
        freguesia: "Idanha-a-Nova e Alcafozes",
        dataInicio: "2026-03-04",
        horario: "11:30 - 13:00"
    },
    {
        local: "Toulões",
        freguesia: "Toulões",
        dataInicio: "2026-03-05", // Uma quinta-feira (Semana A)
        horario: "09:00 - 11:00"
    },
    {
        local: "Idanha-a-Velha",
        freguesia: "Monsanto e Idanha-a-Velha",
        dataInicio: "2026-03-05",
        horario: "11:30 - 13:00"
    },
    {
        local: "Penha Garcia",
        freguesia: "Penha Garcia",
        dataInicio: "2026-03-06", // Uma sexta-feira (Semana A)
        horario: "09:00 - 13:00"
    },
    {
        local: "Aldeia de Santa Margarida",
        freguesia: "Aldeia de Santa Margarida",
        dataInicio: "2026-03-09", // Uma segunda-feira (Semana B)
        horario: "09:00 - 11:00"
    },
    {
        local: "Proença-a-Velha",
        freguesia: "Proença-a-Velha",
        dataInicio: "2026-03-09",
        horario: "11:30 - 13:00"
    },
    {
        local: "Monsanto",
        freguesia: "Monsanto e Idanha-a-Velha",
        dataInicio: "2026-03-10", // Uma terça-feira (Semana B)
        horario: "09:00 - 13:00"
    },
    {
        local: "Zebreira",
        freguesia: "Zebreira e Segura",
        dataInicio: "2026-03-11", // Uma quarta-feira (Semana B)
        horario: "09:00 - 13:00"
    },
    {
        local: "Ladoeiro",
        freguesia: "Ladoeiro",
        dataInicio: "2026-03-11",
        horario: "14:30 - 16:30"
    },
    {
        local: "São Miguel de Acha",
        freguesia: "São Miguel de Acha",
        dataInicio: "2026-03-12", // Uma quinta-feira (Semana B)
        horario: "09:00 - 11:00"
    },
    {
        local: "Oledo",
        freguesia: "Oledo",
        dataInicio: "2026-03-12",
        horario: "11:30 - 13:00"
    },
    {
        local: "Cegonhas",
        freguesia: "Rosmaninhal",
        dataInicio: "2026-03-13", // Uma sexta-feira (Semana B)
        horario: "09:00 - 10:00"
    },
    {
        local: "Soalheiras",
        freguesia: "Rosmaninhal",
        dataInicio: "2026-03-13",
        horario: "10:30 - 11:00"
    },
    {
        local: "Rosmaninhal",
        freguesia: "Rosmaninhal",
        dataInicio: "2026-03-13",
        horario: "11:30 - 13:00"
    },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COR_DIA: Record<number, string> = {
    1: 'bg-violet-500/15 border-violet-400/40 text-violet-600 dark:text-violet-400',
    2: 'bg-sky-500/15 border-sky-400/40 text-sky-600 dark:text-sky-400',
    3: 'bg-teal-500/15 border-teal-400/40 text-teal-600 dark:text-teal-400',
    4: 'bg-amber-500/15 border-amber-400/40 text-amber-600 dark:text-amber-400',
    5: 'bg-rose-500/15 border-rose-400/40 text-rose-600 dark:text-rose-400',
    6: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-600 dark:text-emerald-400',
    0: 'bg-slate-500/15 border-slate-400/40 text-slate-600 dark:text-slate-400',
};

// ─── Componente principal ────────────────────────────────────────────────────────
export default function AgendaUnidadeMovel() {
    const hoje = new Date();
    const [mes, setMes] = useState(hoje.getMonth());
    const [ano, setAno] = useState(hoje.getFullYear());

    const mudarMes = (delta: number) => {
        setMes((m) => {
            const novo = m + delta;
            if (novo > 11) { setAno((a) => a + 1); return 0; }
            if (novo < 0) { setAno((a) => a - 1); return 11; }
            return novo;
        });
    };

    // Calcula os eventos do mês selecionado
    const eventos = useMemo(() => {
        const inicioMes = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59); // Fim exato do mês
        const lista: {
            local: string;
            freguesia: string;
            horario: string;
            data: Date;
            diaMes: number;
            diaSemana: number;
        }[] = [];

        rotasUnidadeMovel.forEach((rota) => {
            // T12:00:00 protege contra bugs nas mudanças de hora (horário de verão)
            const origem = new Date(rota.dataInicio + 'T12:00:00');
            let cursor = new Date(origem);

            // A repetição é a cada 14 dias (duas semanas).
            // NUNCA recuamos (a rota não existe antes da sua dataInicio).
            // Avançamos iterativamente de 14 em 14 dias até ultrapassar o fimMes selecionado.
            while (cursor <= fimMes) {
                // Só empurramos para a lista se o cursor estiver dentro do mês atual
                // (O cursor também é sempre >= origem, portanto regra matemática correta)
                if (cursor >= inicioMes) {
                    lista.push({
                        local: rota.local,
                        freguesia: rota.freguesia,
                        horario: rota.horario,
                        data: new Date(cursor),
                        diaMes: cursor.getDate(),
                        diaSemana: cursor.getDay(),
                    });
                }
                cursor.setDate(cursor.getDate() + 14);
            }
        });

        return lista.sort((a, b) => a.data.getTime() - b.data.getTime());
    }, [mes, ano]);

    // Agrupa por dia para exibir como timeline
    const porDia = useMemo(() => {
        const mapa = new Map<number, typeof eventos>();
        eventos.forEach((ev) => {
            if (!mapa.has(ev.diaMes)) mapa.set(ev.diaMes, []);
            mapa.get(ev.diaMes)!.push(ev);
        });
        return Array.from(mapa.entries()).sort((a, b) => a[0] - b[0]);
    }, [eventos]);

    return (
        <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto pb-20">

            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4
                      bg-card border border-border rounded-xl p-4 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Truck className="w-6 h-6 text-primary" />
                        Agenda da Unidade Móvel
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Rotas calculadas automaticamente a cada duas semanas.
                    </p>
                </div>

                {/* Navegação de mês */}
                <div className="flex items-center gap-2 bg-muted p-1.5 rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)} className="h-8 w-8">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="w-36 text-center font-semibold text-foreground text-sm">
                        {MESES[mes]} {ano}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => mudarMes(1)} className="h-8 w-8">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
                    <p className="text-3xl font-bold text-primary">{eventos.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Visitas este mês</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
                    <p className="text-3xl font-bold text-primary">{porDia.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Dias de saída</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm col-span-2 sm:col-span-1">
                    <p className="text-3xl font-bold text-primary">
                        {new Set(eventos.map((e) => e.freguesia)).size}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Freguesias cobertas</p>
                </div>
            </div>

            {/* Timeline por dia */}
            {porDia.length === 0 ? (
                <Card className="flex flex-col items-center justify-center h-40 bg-card border-dashed border-2">
                    <Truck className="w-10 h-10 text-muted-foreground mb-2 opacity-40" />
                    <p className="text-muted-foreground text-sm">Sem rotas agendadas para este mês.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {porDia.map(([dia, evs]) => {
                        const diaSemana = evs[0].diaSemana;
                        const corClasses = COR_DIA[diaSemana] ?? COR_DIA[0];

                        return (
                            <div key={dia} className="space-y-3">
                                {/* Separador de dia */}
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${corClasses}`}>
                                        <CalendarIcon className="w-4 h-4" />
                                        <span>{dia} de {MESES[mes]}</span>
                                        <span className="opacity-70">· {DIAS_SEMANA[diaSemana]}</span>
                                    </div>
                                    <div className="flex-1 h-px bg-border" />
                                    <Badge variant="outline" className="text-xs">
                                        {evs.length} {evs.length === 1 ? 'visita' : 'visitas'}
                                    </Badge>
                                </div>

                                {/* Cards das visitas desse dia */}
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {evs.map((ev, i) => (
                                        <Card
                                            key={i}
                                            className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors shadow-sm"
                                        >
                                            {/* Barra de cor do dia */}
                                            <div className={`h-1 w-full ${corClasses.split(' ')[0].replace('/15', '')}`} />

                                            <CardContent className="p-4 space-y-3">
                                                <h3
                                                    className="font-bold text-card-foreground truncate text-base"
                                                    title={ev.local}
                                                >
                                                    <Route className="w-4 h-4 inline mr-1.5 mb-0.5 text-muted-foreground" />
                                                    {ev.local}
                                                </h3>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                                                        <span className="font-medium text-foreground">{ev.horario}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 text-sm">
                                                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                                        <span className="text-muted-foreground leading-tight">{ev.freguesia}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
