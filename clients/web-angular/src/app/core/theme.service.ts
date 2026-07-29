import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'bf_theme';

/**
 * Gère le thème clair/sombre. La préférence est appliquée en ajoutant/retirant
 * la classe `theme-light` sur <html> (voir styles.scss pour les variables CSS
 * de chaque thème), et persistée en localStorage (donnée non sensible).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readInitial());

  constructor() {
    effect(() => {
      const mode = this.mode();
      document.documentElement.classList.toggle('theme-light', mode === 'light');
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // localStorage indisponible (navigation privée stricte) : on ignore,
        // le thème par défaut sera simplement recalculé à chaque chargement.
      }
    });
  }

  toggle(): void {
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private readInitial(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    const prefersLight = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }
}
