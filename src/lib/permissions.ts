import { UserRole } from '@/context/AuthContext';

export type PermissionAction =
  | 'VIEW_ORDERS'
  | 'MANAGE_MENU'
  | 'MANAGE_USERS'
  | 'ASSIGN_ROLES'
  | 'VIEW_ANALYTICS'
  | 'SYSTEM_SETTINGS'
  | 'VIEW_LOGS'
  | 'STAFF_CHAT'
  | 'DRIVER_DELIVERIES';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  OWNER: [
    'VIEW_ORDERS',
    'MANAGE_MENU',
    'MANAGE_USERS',
    'ASSIGN_ROLES',
    'VIEW_ANALYTICS',
    'SYSTEM_SETTINGS',
    'VIEW_LOGS',
    'STAFF_CHAT',
  ],
  ADMIN: [
    'VIEW_ORDERS',
    'MANAGE_MENU',
    'MANAGE_USERS',
    'ASSIGN_ROLES',
    'VIEW_ANALYTICS',
    'VIEW_LOGS',
    'STAFF_CHAT',
  ],
  DEVELOPER: [
    'VIEW_ORDERS',
    'MANAGE_USERS',
    'VIEW_ANALYTICS',
    'SYSTEM_SETTINGS',
    'VIEW_LOGS',
  ],
  STAFF: [
    'VIEW_ORDERS',
    'STAFF_CHAT',
  ],
  DRIVER: [
    'DRIVER_DELIVERIES',
  ],
  CUSTOMER: [],
};

export function hasPermission(role: UserRole | null, action: PermissionAction): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(action) || false;
}
