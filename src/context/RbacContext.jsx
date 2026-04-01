import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import api from '../services/api.js';

const RbacContext = createContext();

export function RbacProvider({ children }) {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  const [actions, setActions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setPages([]);
      setActions([]);
      setLoaded(false);
      return;
    }

    
    api
      .get('/rbac')
      .then((res) => {
        setPages(res.data.pages || []);
        setActions(res.data.actions || []);
      })
      .catch(() => {
        // If RBAC fetch fails, default to allowing everything (graceful degradation)
        setPages([]);
        setActions([]);
      })
      .finally(() => setLoaded(true));
  }, [user]);

  /**
   * Check if the current user's role can access a page.
   * If RBAC hasn't loaded yet or the key isn't found, defaults to true (permissive).
   */
  const canAccessPage = useCallback(
    (key) => {
      if (!user) return false;
      // Admins always have access
      if (user.role === 'admin') return true;
      if (!loaded || pages.length === 0) return true; // graceful default
      const entry = pages.find((p) => p.key === key);
      if (!entry) return true; // unknown key → allow
      return !!entry.roles?.[user.role];
    },
    [user, pages, loaded]
  );

  /**
   * Check if the current user's role can perform an action.
   */
  const canPerformAction = useCallback(
    (key) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (!loaded || actions.length === 0) return true;
      const entry = actions.find((a) => a.key === key);
      if (!entry) return true;
      return !!entry.roles?.[user.role];
    },
    [user, actions, loaded]
  );

  /** Force re-fetch (called after admin saves RBAC config) */
  const refreshRbac = useCallback(async () => {
    try {
      const res = await api.get('/rbac');
      setPages(res.data.pages || []);
      setActions(res.data.actions || []);
    } catch {
      // silent
    }
  }, []);

  return (
    <RbacContext.Provider value={{ canAccessPage, canPerformAction, refreshRbac, loaded }}>
      {children}
    </RbacContext.Provider>
  );
}

export const useRbac = () => useContext(RbacContext);
