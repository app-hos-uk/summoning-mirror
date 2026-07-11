import { useState, useEffect, useCallback } from 'react';
import type { Fandom } from '../types/fandom';
import { adminHeaders } from '../utils/adminAuth';

export function useFandoms() {
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFandoms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fandoms');
      if (!res.ok) throw new Error('Failed to fetch fandoms');
      const data = await res.json();
      setFandoms(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFandoms();
  }, [fetchFandoms]);

  return { fandoms, loading, error, refetch: fetchFandoms };
}

export function useAllFandoms() {
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/fandoms', {
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch fandoms');
      const data = await res.json();
      setFandoms(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { fandoms, loading, refetch: fetchAll };
}
