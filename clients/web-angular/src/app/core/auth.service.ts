import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageKey = 'bf_user_token';
  private apiBase = 'http://localhost:8080';

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
}
