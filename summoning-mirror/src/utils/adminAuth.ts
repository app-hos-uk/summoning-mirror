export function getAdminToken(): string | null {
  return sessionStorage.getItem('admin_token');
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem('admin_token', token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem('admin_token');
}

export function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAdminToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export function adminJsonHeaders(): Record<string, string> {
  return adminHeaders({ 'Content-Type': 'application/json' });
}

export function isUnauthorizedResponse(status: number): boolean {
  return status === 401;
}

export async function verifyAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/admin/session', { headers: adminHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}
