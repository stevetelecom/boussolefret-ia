import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

interface DocAlert {
  id: number;
  name: string;
  status: string;
}

/**
 * Alimente la cloche de notifications à partir des documents déjà marqués
 * "À risque" (endpoint /documents existant). Pas de nouvelle table ni de
 * nouvel endpoint pour rester MVP : on réutilise une donnée réelle plutôt
 * qu'une notification mockée.
 */
@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly auth = inject(AuthService);

  readonly items = signal<DocAlert[]>([]);
  readonly count = signal(0);

  async refresh(): Promise<void> {
    try {
      const res = await this.auth.authFetch('/documents');
      if (!res.ok) return;
      const docs: DocAlert[] = await res.json();
      const risky = docs.filter((d) => d.status === 'À risque');
      this.items.set(risky);
      this.count.set(risky.length);
    } catch (e) {
      console.error('AlertsService.refresh error', e);
    }
  }
}
