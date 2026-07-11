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
