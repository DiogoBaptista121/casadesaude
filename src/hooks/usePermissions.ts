import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
    // Role flags
    isAdmin: boolean;
    isManager: boolean;
    isStaff: boolean;
    isViewer: boolean;

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
 * Hook that returns granular permission flags based on the current user's role.
 *
 * Role hierarchy:
 *   admin    → full access
 *   manager  → can edit data, cannot manage users or advanced settings
 *   staff    → can view/edit assigned data, cannot delete
 *   viewer   → read-only
 */
export function usePermissions(): Permissions {
    const { role } = useAuth();

    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isStaff = role === 'staff';
    const isViewer = role === 'viewer';

    return {
        isAdmin,
        isManager,
        isStaff,
        isViewer,

        // Only admin can manage users
        canCreateUsers: isAdmin,
        canEditUsers: isAdmin,
        canDeleteUsers: isAdmin,
        canManageUsers: isAdmin,

        // Admin, manager, staff can edit data
        canEdit: isAdmin || isManager || isStaff,

        // Only admin can delete records
        canDelete: isAdmin,

        // Only admin can view audit logs
        canViewAudit: isAdmin,

        // Admin and manager can access general settings
        canEditSettings: isAdmin || isManager,
    };
}
