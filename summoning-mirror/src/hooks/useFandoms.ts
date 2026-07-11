import { useState, useEffect, useCallback } from 'react';
import type { Fandom } from '../types/fandom';
import { adminHeaders, isUnauthorizedResponse } from '../utils/adminAuth';

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

export function useAllFandoms(onUnauthorized?: () => void) {
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/fandoms', {
        headers: adminHeaders(),
      });
      if (isUnauthorizedResponse(res.status)) {
        setUnauthorized(true);
        onUnauthorized?.();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch fandoms');
      const data = await res.json();
      setFandoms(data);
      setUnauthorized(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { fandoms, loading, refetch: fetchAll, unauthorized };
}
