import { Injectable, effect, signal } from '@angular/core';

export type Lang = 'fr' | 'en';

const STORAGE_KEY = 'bf_lang';

// Dictionnaire minimal pour la navbar/sidebar. On ajoute une clé ici pour
// chaque nouveau texte à traduire, puis on l'utilise via lang.t('ma.cle')
// dans les templates — pas de traduction en dur ailleurs dans le code.
const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    'brand.tagline': 'Assistant conformité',
    'brand.phase': 'Phase 1 · MVP',
    'brand.sourced': 'Réponses sourcées',
    'nav.dashboard': 'Tableau de bord',
    'nav.ask': 'Ask (RAG)',
    'nav.documents': 'Documents & anomalies',
    'nav.logout': 'Déconnexion',
    'navbar.notifications': 'Notifications',
    'navbar.no_notifications': 'Aucune notification pour le moment.',
    'navbar.theme_light': 'Passer en thème clair',
    'navbar.theme_dark': 'Passer en thème sombre',
    'navbar.lang_switch': 'Switch to English',
  },
  en: {
    'brand.tagline': 'Compliance assistant',
    'brand.phase': 'Phase 1 · MVP',
    'brand.sourced': 'Sourced answers',
    'nav.dashboard': 'Dashboard',
    'nav.ask': 'Ask (RAG)',
    'nav.documents': 'Documents & anomalies',
    'nav.logout': 'Log out',
    'navbar.notifications': 'Notifications',
    'navbar.no_notifications': 'No notifications for now.',
    'navbar.theme_light': 'Switch to light theme',
    'navbar.theme_dark': 'Switch to dark theme',
    'navbar.lang_switch': 'Passer en français',
  },
};

/**
 * Gère la langue de l'interface (FR/EN). MVP : couvre la navbar et la
 * sidebar. Pour traduire un nouveau texte ailleurs dans l'app, ajouter la clé
 * dans DICT ci-dessus puis appeler lang.t('ma.cle') dans le template.
 */
@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>(this.readInitial());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, this.lang());
      } catch {
        // ignore
      }
    });
  }

  toggle(): void {
    this.lang.set(this.lang() === 'fr' ? 'en' : 'fr');
  }

  t(key: string): string {
    return DICT[this.lang()][key] ?? key;
  }

  private readInitial(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'fr';
  }
}
