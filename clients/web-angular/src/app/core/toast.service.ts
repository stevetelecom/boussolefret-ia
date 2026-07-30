import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  text: string;
}

const AUTO_DISMISS_MS = 4500;

/**
 * File de notifications toast (empilées, auto-disparition). Utilisé après
 * chaque action CRUD (documents) pour donner un retour visuel immédiat,
 * en plus des messages d'erreur déjà affichés inline dans les formulaires.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(type: ToastType, text: string): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, type, text }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }
}
