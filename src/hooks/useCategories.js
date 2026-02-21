import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

/**
 * Fetches the list of categories from the server.
 * Returns { categories: string[], loading: boolean, refetch: () => void }
 * Always ensures 'Uncategorized' is present as the first item.
 */
export function useCategories() {
  const [categories, setCategories] = useState(['Uncategorized']);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    api
      .get('/categories')
      .then((res) => {
        const names = res.data.map((c) => c.name);
        const sorted = ['Uncategorized', ...names.filter((n) => n !== 'Uncategorized')];
        setCategories(sorted);
      })
      .catch(() => {
        setCategories(['Uncategorized']);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}
