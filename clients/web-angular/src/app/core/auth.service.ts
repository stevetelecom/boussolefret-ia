import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageKey = 'bf_user_token';
  readonly apiBase = 'http://localhost:8080';

  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.token) {
        localStorage.setItem(this.storageKey, data.token);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error', e);
      return false;
    }
  }

  async validate(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${this.apiBase}/auth/validate`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.valid;
    } catch (e) {
      console.error('validate error', e);
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.storageKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Enrobe fetch() en y ajoutant automatiquement le jeton Bearer.
   * Toute route protégée du backend DOIT passer par ici — jamais un fetch()
   * nu vers l'API, sinon la requête échoue silencieusement en 401.
   * Sur un 401, on déconnecte et on renvoie vers /login plutôt que de
   * laisser l'écran dans un état incohérent.
   */
  async authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const res = await fetch(`${this.apiBase}${path}`, { ...options, headers });
    if (res.status === 401) {
      this.logout();
      window.location.href = '/login';
    }
    return res;
  }
}
