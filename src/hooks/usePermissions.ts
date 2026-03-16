import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
    // Role flags
    isAdmin: boolean;
    isGestor: boolean;
    isColaborador: boolean;
    isVisualizador: boolean;

    // User management
    canCreateUsers: boolean;
    canEditUsers: boolean;
    canDeleteUsers: boolean;

    // Data access
    canEdit: boolean;        // can create/edit records
    canDelete: boolean;      // can delete records
    canViewAudit: boolean;   // can view audit logs

    // Settings
    canEditSettings: boolean;       // general settings
    canManageUsers: boolean;        // user management tab
}

/**
 * Role hierarchy:
 *   admin        → acesso total
 *   gestor       → pode ver dashboard e editar dados, não gere utilizadores
 *   colaborador  → pode criar cartões e marcar consultas, não pode apagar
 *   visualizador → só leitura
 */
export function usePermissions(): Permissions {
    const { role } = useAuth();

    const isAdmin = role === 'admin';
    const isGestor = role === 'gestor';
    const isColaborador = role === 'colaborador';
    const isVisualizador = role === 'visualizador';

    return {
        isAdmin,
        isGestor,
        isColaborador,
        isVisualizador,

        // Só admin gere utilizadores
        canCreateUsers: isAdmin,
        canEditUsers: isAdmin,
        canDeleteUsers: isAdmin,
        canManageUsers: isAdmin,

        // Admin, gestor e colaborador podem criar/editar
        canEdit: isAdmin || isGestor || isColaborador,

        // Só admin pode apagar registos
        canDelete: isAdmin,

        // Só admin vê logs de auditoria
        canViewAudit: isAdmin,

        // Admin e gestor acedem às definições gerais
        canEditSettings: isAdmin || isGestor,
    };
}