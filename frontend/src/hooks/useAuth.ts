import { useEffect, useState } from 'react';
import { getCurrentUser } from '../services/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const oauthToken = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (oauthToken) {
      localStorage.setItem('reachinbox-token', oauthToken);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    const token = oauthToken ?? localStorage.getItem('reachinbox-token');
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, setUser, loading };
}
