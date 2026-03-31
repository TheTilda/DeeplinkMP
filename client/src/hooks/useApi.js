import { useState, useEffect, useCallback } from 'react';
import { useApiFetch } from './useAuth';

export function useLinks() {
  const apiFetch = useApiFetch();
  const [links,   setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/links');
      setLinks(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);
  return { links, loading, error, refetch: fetchLinks };
}

export function useCreateLink() {
  const apiFetch = useApiFetch();
  return useCallback(async (payload) => {
    const res  = await apiFetch('/api/links', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка при создании ссылки');
    return data;
  }, [apiFetch]);
}

export function useDeleteLink() {
  const apiFetch = useApiFetch();
  return useCallback(async (id) => {
    const res = await apiFetch(`/api/links/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка при удалении');
  }, [apiFetch]);
}

export function useLinkAnalytics(id, period = '30') {
  const apiFetch = useApiFetch();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/links/${id}/analytics?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, period, apiFetch]);

  return { data, loading, error };
}

export function useMultiLinks() {
  const apiFetch = useApiFetch();
  const [multiLinks, setMultiLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMultiLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/multilinks');
      setMultiLinks(await res.json());
    } catch {
      setMultiLinks([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchMultiLinks(); }, [fetchMultiLinks]);
  return { multiLinks, loading, refetch: fetchMultiLinks };
}

export function useCreateMultiLink() {
  const apiFetch = useApiFetch();
  return useCallback(async (payload) => {
    const res = await apiFetch('/api/multilinks', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка при создании');
    return data;
  }, [apiFetch]);
}

export function useDeleteMultiLink() {
  const apiFetch = useApiFetch();
  return useCallback(async (id) => {
    const res = await apiFetch(`/api/multilinks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка при удалении');
  }, [apiFetch]);
}

export function useAnalytics(period = '30') {
  const apiFetch = useApiFetch();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period, apiFetch]);

  return { data, loading };
}
