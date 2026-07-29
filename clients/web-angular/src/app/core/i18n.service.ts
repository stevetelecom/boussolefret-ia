import { Injectable, signal } from '@angular/core';

export type Lang = 'fr' | 'en';

/**
 * Dictionnaire minimal, en mémoire — pas de fichiers assets à charger (donc
 * pas de configuration angular.json "assets" à maintenir), pas de dépendance
 * externe. Suffisant pour un toggle FR/EN sur l'écran de connexion.
 */
const DICTIONARY: Record<string, Record<Lang, string>> = {
  eyebrow:        { fr: 'Phase 1 · MVP',                   en: 'Phase 1 · MVP' },
  loginTitle:     { fr: 'Accédez à votre copilote réglementaire', en: 'Access your regulatory copilot' },
  loginSubtitle:  { fr: "BoussoleFret IA aide les équipes conformité à répondre rapidement et avec sources aux questions du fret CEMAC.",
                    en: 'BoussoleFret IA helps compliance teams answer CEMAC freight regulatory questions quickly, with sources.' },
  email:          { fr: 'Email',        en: 'Email' },
  password:       { fr: 'Mot de passe', en: 'Password' },
  loginButton:    { fr: 'Se connecter', en: 'Log in' },
  loggingIn:      { fr: 'Connexion…',   en: 'Logging in…' },
  invalidCreds:   { fr: 'Identifiants invalides.', en: 'Invalid credentials.' },
  securityNote:   { fr: "Connexion protégée par jeton JWT ; journal d'audit prévu en phase 3.",
                    en: 'Login secured by JWT token; audit log planned for phase 3.' },
  demoAccounts:   { fr: 'Comptes démo', en: 'Demo accounts' },
  heroTitle:      { fr: 'Conformité fret CEMAC, sans hallucination', en: 'CEMAC freight compliance, no hallucination' },
  heroSubtitle:   { fr: "Posez une question réglementaire, obtenez une réponse sourcée ou une abstention explicite.",
                    en: 'Ask a regulatory question, get a sourced answer or an explicit abstention.' },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'bf_lang';
  readonly lang = signal<Lang>((localStorage.getItem(this.storageKey) as Lang) === 'en' ? 'en' : 'fr');

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(this.storageKey, lang);
  }

  t(key: keyof typeof DICTIONARY): string {
    return DICTIONARY[key]?.[this.lang()] ?? key;
  }
}
