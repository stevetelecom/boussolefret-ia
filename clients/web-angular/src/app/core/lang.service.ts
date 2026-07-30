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
    'login.eyebrow': 'Phase 1 · MVP',
    'login.title': 'Accédez à votre copilote réglementaire',
    'login.subtitle': "BoussoleFret IA aide les équipes conformité à répondre rapidement et avec sources aux questions du fret CEMAC.",
    'login.email': 'Email',
    'login.password': 'Mot de passe',
    'login.submit': 'Se connecter',
    'login.submitting': 'Connexion…',
    'login.invalid_credentials': 'Identifiants invalides.',
    'login.security_note': "Connexion protégée par jeton JWT ; journal d'audit prévu en phase 3.",
    'login.demo_accounts': 'Comptes démo',
    'login.hero_title': 'Conformité fret CEMAC, sans hallucination',
    'login.hero_subtitle': "Posez une question réglementaire, obtenez une réponse sourcée ou une abstention explicite.",
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
    'login.eyebrow': 'Phase 1 · MVP',
    'login.title': 'Access your regulatory copilot',
    'login.subtitle': 'BoussoleFret IA helps compliance teams answer CEMAC freight regulatory questions quickly, with sources.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Log in',
    'login.submitting': 'Logging in…',
    'login.invalid_credentials': 'Invalid credentials.',
    'login.security_note': 'Login secured by JWT token; audit log planned for phase 3.',
    'login.demo_accounts': 'Demo accounts',
    'login.hero_title': 'CEMAC freight compliance, no hallucination',
    'login.hero_subtitle': 'Ask a regulatory question, get a sourced answer or an explicit abstention.',
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

  setLang(value: Lang): void {
    this.lang.set(value);
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
