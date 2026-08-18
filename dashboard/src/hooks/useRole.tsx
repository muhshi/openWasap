import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserRole, RoleContextType } from '../types/role';

export type { UserRole, RoleContextType } from '../types/role';

export interface ExtendedRoleContextType extends RoleContextType {
  apiKeyId: string | null;
  setApiKeyId: (id: string | null) => void;
}

const RoleContext = createContext<ExtendedRoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('openwa_user_role');
    return (saved as UserRole) || null;
  });

  const setRole = useCallback((newRole: UserRole | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('openwa_user_role', newRole);
    } else {
      localStorage.removeItem('openwa_user_role');
    }
  }, []);

  const [apiKeyId, setApiKeyIdState] = useState<string | null>(() => {
    return localStorage.getItem('openwa_api_key_id');
  });

  const setApiKeyId = useCallback((id: string | null) => {
    setApiKeyIdState(id);
    if (id) {
      localStorage.setItem('openwa_api_key_id', id);
    } else {
      localStorage.removeItem('openwa_api_key_id');
    }
  }, []);

  const value: ExtendedRoleContextType = {
    role,
    setRole,
    apiKeyId,
    setApiKeyId,
    isAdmin: role === 'admin',
    isOperator: role === 'operator' || role === 'user',
    isViewer: role === 'viewer' || role === 'readonly',
    canWrite: role === 'admin' || role === 'operator' || role === 'user',
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): ExtendedRoleContextType {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
