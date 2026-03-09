import React, { useState } from 'react';
import { MapPin, HeartHandshake, Stethoscope, Truck, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// IMPORTAMOS O TEU MAPA REAL
import MapaIdanha from '../components/Mapa';

// Função para obter o mês atual em português
const getMesAtual = () => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const hoje = new Date();
    return `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
};

// 📍 DADOS DOS HORÁRIOS
const mockHorarios: Record<string, any> = {
    "Idanha-a-Nova": {
        casaDeSaude: {
            titulo: "Idanha-a-Nova",
            enfermagem: "Todos os dias (Segunda a Sexta)",
            enfermagemhorario: "09:00 - 18:00",
            medicoDias: "2ª e 5ª Feira",
            medicoHorario: "14:00 - 17:00",
            Coordenadas: "39.924882304539636, -7.238617088158453"
        },
        unidadeMovel: [
            { titulo: "Alcafozes", dias: "De 15 em 15 dias (4ª Feira)", horario: "11:30 - 13:00", local: "Bar associação de Alcafozes", Coordenadas: "39.94933481720825, -7.120708400075429" }
        ]
    },
    "Ladoeiro": {
        unidadeMovel: [
            { titulo: "Ladoeiro", dias: "De 15 em 15 dias (4ª Feira)", horario: "14:30 - 16:30", local: "Largo Eng. Carlos da Costa 7", Coordenadas: "39.83262773427865, -7.26080566475782" }
        ]
    },
    "São Miguel de Acha": {
        unidadeMovel: [
            { titulo: "São Miguel de Acha", dias: "De 15 em 15 dias (5ª Feira)", horario: "09:00 - 11:00", local: "Junta de Freguesia de S.Miguel de Acha", Coordenadas: "40.01520365566882, -7.32139269293454" }
        ]
    },
    "Aldeia de Santa Margarida": {
        unidadeMovel: [
            { titulo: "Aldeia de Santa Margarida", dias: "De 15 em 15 dias (2ª Feira)", horario: "09:00 - 11:00", local: "Capela de Santo António", Coordenadas: "40.06215303619412, -7.27714234011014" }
        ]
    },
    "Medelim": {
        unidadeMovel: [
            { titulo: "Medelim", dias: "De 15 em 15 dias (4ª Feira)", horario: "09:00 - 11:00", local: "Junta de Freguesia de Medelim", Coordenadas: "40.04831218538679, -7.184300636363878" }
        ]
    },
    "Monfortinho e Salvaterra do Extremo": {
        unidadeMovel: [
            { titulo: "Termas de Monfortinho", dias: "De 15 em 15 dias (2ª Feira)", horario: "09:00 - 10:30", local: "Recinto Multiusos de Termas de Monfortinho", Coordenadas: "39.99819882348154, -6.877925277920968" },
            { titulo: "Salvaterra do Extremo", dias: "De 15 em 15 dias (3ª Feira)", horario: "11:30 - 13:00", local: "Igreja de Nossa Senhora da Conceição", Coordenadas: "39.88363348075896, -6.9144775974410155" },
            { titulo: "Monfortinho", dias: "De 15 em 15 dias (2ª Feira)", horario: "11:00 - 12:00", local: "Centro de Dia de Monfortinho", Coordenadas: "40.00289426565046, -6.915669736181063" },
            { titulo: "Torre", dias: "De 15 em 15 dias (2ª Feira)", horario: "12:10 - 13:00", local: "Recinto de Festas da Torre", Coordenadas: "39.963090058459805, -6.941695046882964" }
        ]
    },
    "Monsanto e Idanha-a-Velha": {
        unidadeMovel: [
            { titulo: "Monsanto", dias: "De 15 em 15 dias (3ª Feira)", horario: "09:00 - 13:00", local: "Estacionamento Largo da Relva", Coordenadas: "40.04592473762647, -7.116121197231134" },
            { titulo: "Idanha-a-Velha", dias: "De 15 em 15 dias (5ª Feira)", horario: "11:30 - 13:00", local: "Pelourinho de Idanha-a-Velha", Coordenadas: "39.99641932296016, -7.143627712956309" }
        ]
    },
    "Oledo": {
        unidadeMovel: [
            { titulo: "Oledo", dias: "De 15 em 15 dias (5ª Feira)", horario: "11:30 - 13:00", local: "Extensão de Saúde Oledo (C. São Idanha-a-Nova)", Coordenadas: "39.969614130083194, -7.301777291406872" }
        ]
    },
    "Penha Garcia": {
        unidadeMovel: [
            { titulo: "Penha Garcia", dias: "De 15 em 15 dias (6ª Feira)", horario: "09:00 - 13:00", local: "Junta de Freguesia de Penha Garcia", Coordenadas: "40.0377060614408, -7.019578772376582" }
        ]
    },
    "Proença-a-Velha": {
        unidadeMovel: [
            { titulo: "Proença-a-Velha", dias: "De 15 em 15 dias (2ª Feira)", horario: "11:30 - 13:00", local: "Cruzeiro dos Centenários de Proença-a-Velha", Coordenadas: "40.02617988418078, -7.240247558340521" }
        ]
    },
    "Rosmaninhal": {
        // AQUI ESTÃO AS CEGONHAS E SOALHEIRAS ADICIONADAS!
        unidadeMovel: [
            { titulo: "Rosmaninhal", dias: "De 15 em 15 dias (6ª Feira)", horario: "11:30 - 13:00", local: "Capela do Espírito Santo", Coordenadas: "39.72904339725393, -7.08943708455267" },
            { titulo: "Cegonhas", dias: "De 15 em 15 dias (6ª Feira)", horario: "09:00 - 10:00", local: "Associação de Melhoramento Cultural e R. Cegonhas", Coordenadas: "39.738227159755326, -7.198386963369458" },
            { titulo: "Soalheiras", dias: "De 15 em 15 dias (6ª Feira)", horario: "10:30 - 11:00", local: "Recinto das Festas Das Soalheiras", Coordenadas: "39.70283765606324, -7.175130885120402" }
        ]
    },
    "Toulões": {
        unidadeMovel: [
            { titulo: "Toulões", dias: "De 15 em 15 dias (5ª Feira)", horario: "09:00 - 11:00", local: "Centro Social e Cultural de Toulões", Coordenadas: "39.9231866232585, -7.035746750903527" }
        ]
    },
    "Zebreira e Segura": {
        unidadeMovel: [
            { titulo: "Zebreira", dias: "De 15 em 15 dias (4ª Feira)", horario: "09:00 - 13:00", local: "Centro de Dia", Coordenadas: "39.843993, -7.069288" },
            { titulo: "Segura", dias: "De 15 em 15 dias (3ª Feira)", horario: "09:00 - 11:00", local: "Igreja da Misericórdia", Coordenadas: "39.826249842741184, -6.977833331499199" }
        ]
    }
};

// Componente visual para as linhas de texto do painel
const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex items-start gap-2 py-1">
        <span className="text-muted-foreground text-sm w-16 flex-shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-card-foreground font-medium">{value}</span>
    </div>
);

export default function HorariosLocais() {
    const [freguesiaSelecionada, setFreguesiaSelecionada] = useState<string | null>(null);

    const chaveLimpa = freguesiaSelecionada ? freguesiaSelecionada.trim() : null;
    const horario = chaveLimpa ? mockHorarios[chaveLimpa] : null;

    const mesAtual = getMesAtual();

    return (
        <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto pb-20">
            {/* Cabeçalho da Página */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Horários e Locais</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Selecione uma freguesia no mapa para consultar os horários de atendimento.
                </p>
            </div>

            {/* Grelha de Duas Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* ── Esquerda: O TEU MAPA INTERATIVO ── */}
                <div className="w-full flex justify-center bg-card border border-border rounded-xl p-4 shadow-sm">
                    <MapaIdanha
                        stats={{}}
                        selected={freguesiaSelecionada}
                        onSelect={setFreguesiaSelecionada}
                    />
                </div>

                {/* ── Direita: Painel de Informação ── */}
                <div>
                    {!horario && freguesiaSelecionada ? (
                        <Card className="h-[500px] flex flex-col items-center justify-center text-center bg-card border-border">
                            <CardContent className="pt-6 space-y-3">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                    <MapPin className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-lg font-semibold text-card-foreground">
                                    {freguesiaSelecionada}
                                </p>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                    Ainda não inseriu os horários para esta freguesia no código (mockHorarios).
                                </p>
                            </CardContent>
                        </Card>
                    ) : !horario ? (
                        <Card className="h-[500px] flex flex-col items-center justify-center text-center bg-card border-border">
                            <CardContent className="pt-6 space-y-3">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                    <MapPin className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-lg font-semibold text-card-foreground">
                                    Nenhuma freguesia selecionada
                                </p>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                    Selecione uma freguesia no mapa para consultar os horários.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-card border-border shadow-sm">
                            <CardHeader className="pb-3 border-b border-border">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-xl text-card-foreground">{freguesiaSelecionada}</CardTitle>
                                        <p className="text-muted-foreground text-sm mt-0.5">{mesAtual}</p>
                                    </div>
                                    <Badge variant="outline" className="mt-1 border-primary text-primary bg-primary/10">
                                        Em serviço
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-5 space-y-6">

                                {/* 1. CASA DE SAÚDE (Apenas Idanha-a-Nova) */}
                                {horario.casaDeSaude && (
                                    <div className="space-y-5 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-border">
                                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                <HeartHandshake className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            </div>
                                            <h3 className="font-bold text-lg text-card-foreground">
                                                Casa de Saúde ({horario.casaDeSaude.titulo})
                                            </h3>
                                        </div>

                                        <div className="flex flex-col gap-4">

                                            {/* Médico */}
                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Médico</h4>
                                                <div className="rounded-lg bg-card px-4 py-3 border border-border/50 space-y-1 shadow-sm">
                                                    <InfoRow label="Dias" value={horario.casaDeSaude.medicoDias} />
                                                    <InfoRow label="Horário" value={horario.casaDeSaude.medicoHorario} />
                                                </div>
                                            </div>

                                            {/* Enfermagem */}
                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Enfermagem</h4>
                                                <div className="rounded-lg bg-card px-4 py-3 border border-border/50 space-y-1 shadow-sm">
                                                    <InfoRow label="Dias" value={horario.casaDeSaude.enfermagem} />

                                                    {horario.casaDeSaude.enfermagemhorario && (
                                                        <InfoRow label="Horário" value={horario.casaDeSaude.enfermagemhorario} />
                                                    )}

                                                    {/* Botão de GPS da Casa de Saúde - Corrigido */}
                                                    {horario.casaDeSaude.Coordenadas && (
                                                        <div className="flex items-start gap-2 py-1 mt-2 pt-2 border-t border-border/50">
                                                            <span className="text-muted-foreground text-sm w-16 flex-shrink-0 pt-0.5">GPS</span>
                                                            <a
                                                                href={`https://www.google.com/maps?q=${horario.casaDeSaude.Coordenadas.replace(/\s/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                                                                title="Ver no Google Maps"
                                                            >
                                                                <MapPin className="w-4 h-4" /> Ver localização no mapa
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}

                                {/* 2. UNIDADE MÓVEL (Restantes aldeias e Alcafozes) */}
                                {horario.unidadeMovel && horario.unidadeMovel.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                                <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-card-foreground">Unidade Móvel (Carrinha)</h3>
                                                <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                                                    Serviços de Médico e Enfermagem incluídos
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {horario.unidadeMovel.map((um: any, index: number) => (
                                                <div key={index} className="rounded-lg bg-muted px-4 py-3 space-y-1 border border-border/50">
                                                    <h4 className="font-semibold text-orange-700 dark:text-orange-500 mb-2 pb-1 border-b border-border/50">
                                                        {um.titulo}
                                                    </h4>
                                                    <InfoRow label="Dias" value={um.dias} />
                                                    <InfoRow label="Horário" value={um.horario} />

                                                    {/* GPS Link da Carrinha - Corrigido */}
                                                    {um.Coordenadas && (
                                                        <div className="flex items-start gap-2 py-1">
                                                            <span className="text-muted-foreground text-sm w-16 flex-shrink-0 pt-0.5">GPS</span>
                                                            <a
                                                                href={`https://www.google.com/maps?q=${um.Coordenadas.replace(/\s/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                                                                title="Ver no Google Maps"
                                                            >
                                                                {um.Coordenadas}
                                                            </a>
                                                        </div>
                                                    )}

                                                    <div className="flex items-start gap-2 py-1 mt-1 pt-2 border-t border-border/50">
                                                        <span className="text-muted-foreground text-sm w-16 flex-shrink-0 pt-0.5">Local</span>
                                                        <span className="text-sm text-card-foreground font-medium flex items-start gap-1">
                                                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                                                            {um.local}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Footer note */}
                                <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-sm mt-4">
                                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                        Os horários podem estar sujeitos a alterações. Para confirmação, contacte a Casa de Saúde.
                                    </p>
                                </div>

                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}