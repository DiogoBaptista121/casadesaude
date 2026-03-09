/**
 * unidadeMovelUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared source-of-truth for Unidade Móvel route data and the smart
 * parish-attribution helper `getAldeiaPorData`.
 *
 * Rule:
 *   • local === 'Casa de Saúde' (or similar) → freguesia = 'Idanha-a-Nova'
 *   • local === 'Unidade Móvel' (or similar)  → look up the route active on
 *     that date, using the 14-day recurrence algorithm.
 */

// ─── Route data ───────────────────────────────────────────────────────────────
// Kept in sync with src/pages/AgendaUnidadeMovel.tsx
// dataInicio: first real occurrence (YYYY-MM-DD). The system repeats every 15 days.

export interface Rota {
    local: string;
    freguesia: string;
    dataInicio: string; // YYYY-MM-DD
    horario: string;
}

export const rotasUnidadeMovel: Rota[] = [
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a date string to YYYY-MM-DD, safely handles both ISO and Date */
function toYMD(d: string | Date): string {
    if (typeof d === 'string') return d.slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Returns true if `candidate` matches `target` on 14-day recurrence from `origin`. */
function isRouteActiveOn(origin: string, candidate: string): boolean {
    const o = new Date(origin + 'T12:00:00');
    const c = new Date(candidate + 'T12:00:00');
    const diffMs = c.getTime() - o.getTime();
    const diffDays = Math.round(diffMs / 86_400_000);
    return diffDays >= 0 && diffDays % 14 === 0;
}

/**
 * Returns all Unidade Móvel routes active on a given date.
 * Multiple routes may be active on the same day (morning + afternoon stops).
 */
export function getRotasAtivas(dateStr: string): Rota[] {
    const ymd = toYMD(dateStr);
    return rotasUnidadeMovel.filter(r => isRouteActiveOn(r.dataInicio, ymd));
}

/**
 * getAldeiaPorData — the main attribution function.
 *
 * @param dataConsulta  YYYY-MM-DD date of the consultation
 * @param localConsulta raw value of the 'local' / 'origem' field from the DB
 * @returns  The **freguesia** string to attribute the consultation to, or null
 *           if the location cannot be determined.
 *
 * Logic:
 *   1. If the local indicates "Casa de Saúde" → always 'Idanha-a-Nova'
 *   2. If the local indicates "Unidade Móvel"  → find which routes were active
 *      on that date. If all active routes share the same freguesia, return it.
 *      If there are multiple different parishes, return the most frequent one
 *      (ties broken by alphabetical order).
 *   3. Otherwise fall back to null so callers can keep the DB value.
 */
export function getAldeiaPorData(
    dataConsulta: string,
    localConsulta: string | null | undefined,
): string | null {
    const raw = (localConsulta ?? '').toLowerCase().trim();

    // ── Casa de Saúde ─────────────────────────────────────────────────────────
    if (
        raw.includes('casa') ||
        raw.includes('saúde') ||
        raw === 'casa_saude' ||
        raw === 'cs'
    ) {
        return 'Idanha-a-Nova';
    }

    // ── Unidade Móvel ─────────────────────────────────────────────────────────
    if (
        raw.includes('móvel') ||
        raw.includes('movel') ||
        raw === 'unidade_movel' ||
        raw === 'um'
    ) {
        const rotas = getRotasAtivas(dataConsulta);
        if (rotas.length === 0) return null;

        // Count occurrences per freguesia
        const freq: Record<string, number> = {};
        for (const r of rotas) freq[r.freguesia] = (freq[r.freguesia] ?? 0) + 1;

        // Return the most frequent parish (alphabetical tie-break)
        return Object.entries(freq)
            .sort(([fa, ca], [fb, cb]) => cb - ca || fa.localeCompare(fb))[0][0];
    }

    return null;
}

/**
 * Resolves the parish for a consultation row, preferring the DB value when
 * available and non-null.
 *
 * @param data      consultation date (YYYY-MM-DD)
 * @param local     raw 'local' or 'origem' field value
 * @param freguesia existing DB 'freguesia' value (may be null)
 */
export function resolveFreguesia(
    data: string,
    local: string | null | undefined,
    freguesia: string | null | undefined,
): string | null {
    if (freguesia && freguesia.trim() !== '') return freguesia.trim();
    return getAldeiaPorData(data, local);
}
