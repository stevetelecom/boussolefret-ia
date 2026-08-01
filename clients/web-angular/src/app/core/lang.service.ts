import { Injectable, effect, signal } from '@angular/core';

export type Lang = 'fr' | 'en';

const STORAGE_KEY = 'bf_lang';

// Dictionnaire pour la navbar/sidebar, l'écran de connexion, et le contenu
// du dashboard, d'Ask (RAG) et de Documents. On ajoute une clé ici pour
// chaque nouveau texte à traduire, puis on l'utilise via lang.t('ma.cle')
// dans les templates — pas de traduction en dur ailleurs dans le code.
//
// ⚠️ Important : les VALEURS métier (statuts de document 'Validé' /
// 'À vérifier' / 'À risque', envoyées et reçues telles quelles par
// l'API Go) ne sont volontairement PAS traduites ici : ce sont des
// données, pas du texte d'interface. AlertsService et statusClass()
// comparent ces chaînes en dur ; les traduire casserait ce filtrage.
// Seuls les LIBELLÉS autour (colonne "Statut", etc.) sont traduits.
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
    'toast.doc_added': 'Document ajouté avec succès.',
    'toast.doc_added_indexed': 'Document ajouté · {{count}} fragment(s) indexé(s) dans le corpus.',
    'toast.doc_updated': 'Document mis à jour avec succès.',
    'toast.doc_deleted': 'Document supprimé avec succès.',
    'toast.doc_action_failed': "L'action a échoué : {{reason}}",
    'toast.download_failed': 'Échec du téléchargement.',
    'toast.doc_saved_index_failed': "Document enregistré, mais l'indexation corpus a échoué : {{reason}}",
    'nav.history': 'Historique',
    'history.title': 'Historique des questions',
    'history.subtitle': 'Toutes les questions posées à Ask (RAG), avec leurs sources.',
    'history.restricted': "Cette page est réservée aux rôles Responsable conformité et Administrateur.",
    'history.empty': 'Aucune question posée pour le moment.',
    'history.err_load': "Impossible de charger l'historique.",
    'history.col_question': 'Question',
    'history.col_answer': 'Réponse',
    'history.col_user': 'Utilisateur',
    'history.col_date': 'Date',
    'history.col_status': 'Statut',
    'history.status_sourced': 'Sourcée',
    'history.status_abstained': 'Abstention',
    'history.back': 'Retour au tableau de bord',
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

    'common.loading': 'Chargement…',

    'dashboard.eyebrow': 'Conseil de conformité',
    'dashboard.greeting': 'Bonjour',
    'dashboard.subtitle': 'Posez vos questions réglementaires, consultez les sources et identifiez les documents atypiques.',
    'dashboard.new_request': 'Nouvelle requête',
    'dashboard.view_sources': 'Voir les sources',
    'dashboard.stat_questions_today': "Questions aujourd'hui",
    'dashboard.stat_sourced_answers': 'Réponses avec source',
    'dashboard.stat_docs_to_review': 'Documents à reviewer',
    'dashboard.recent_questions': 'Dernières questions',
    'dashboard.view_all': 'Tout voir',
    'dashboard.history_restricted': 'Réservé aux rôles Responsable conformité et Administrateur corpus.',
    'dashboard.abstained_label': 'Abstention · aucune source fiable',
    'dashboard.sourced_label': 'Réponse citée · {{count}} document(s)',
    'dashboard.no_questions': 'Aucune question posée pour le moment.',
    'dashboard.alerts_title': 'Alertes documentaires',
    'dashboard.manage': 'Gérer',
    'dashboard.alert_text': 'Un document présente un écart significatif par rapport au corpus habituel.',
    'dashboard.examine': 'Examiner',
    'dashboard.err_invalid_docs': 'Réponse documents invalide.',
    'dashboard.err_load_docs': 'Impossible de charger les documents.',
    'dashboard.err_load_history': "Impossible de charger l'historique des questions.",

    'ask.eyebrow': 'Assistant réglementaire',
    'ask.title': 'Posez votre question',
    'ask.subtitle': 'Réponse sourcée (RAG) ou abstention explicite si le corpus ne couvre pas la question.',
    'ask.greeting': 'Bonjour — comment puis-je vous aider ?',
    'ask.placeholder': 'Posez votre question...',
    'ask.send': 'Envoyer',
    'ask.searching': 'Recherche en cours...',
    'ask.err_service': 'Erreur service IA (voir logs go-api).',
    'ask.err_service_detail': 'Erreur service IA : {{reason}}',
    'ask.sources_prefix': ' · Sources : ',
    'ask.err_network': "Erreur réseau vers l'API.",

    'documents.eyebrow': "Corpus & détection d'anomalies",
    'documents.title': "Documents sources et signalement d'écarts",
    'documents.subtitle': 'Le portail centralise les documents de référence et met en évidence les fichiers atypiques à valider.',
    'documents.add': 'Ajouter un document',
    'documents.incoming_docs': 'Documents en entrée',
    'documents.files_word': 'fichiers',
    'documents.col_id': 'ID',
    'documents.col_name': 'Nom',
    'documents.col_file': 'Fichier',
    'documents.col_status': 'Statut',
    'documents.col_actions': 'Actions',
    'documents.no_file': 'aucun fichier',
    'documents.download': 'Télécharger',
    'documents.edit': 'Modifier',
    'documents.delete': 'Supprimer',
    'documents.edit_title': 'Modifier le document',
    'documents.delete_title': 'Supprimer le document',
    'documents.sources_title': 'Sources indexées dans le corpus',
    'documents.form_name': 'Nom du document',
    'documents.form_name_placeholder': 'ex : LVO_2026.pdf',
    'documents.form_status': 'Statut',
    'documents.form_file_label': 'Fichier',
    'documents.form_file_keep_hint': '(laisser vide pour conserver le fichier actuel)',
    'documents.file_drop_hint': 'Cliquer pour choisir un fichier (PDF, Word, Excel, image — 20 Mo max)',
    'documents.delete_confirm': 'Supprimer définitivement {{name}} ? Cette action est irréversible',
    'documents.delete_file_note': ' (le fichier associé sera aussi supprimé du stockage)',
    'documents.empty_corpus': "Aucun texte réglementaire indexé pour l'instant. Le corpus est vide, donc l'assistant Ask (RAG) répondra systématiquement par une abstention (garde-fou EF-RAG-03).",
    'documents.err_sources_forbidden': "Seul le rôle Administrateur corpus peut consulter les sources indexées.",
    'documents.err_sources_load': "Impossible de charger les sources indexées.",
    'documents.err_sources_network': "Erreur réseau lors du chargement des sources.",
    'documents.fragments_word': 'fragment(s)',
    'documents.err_load': 'Impossible de charger les documents.',
    'documents.err_load_network': 'Erreur réseau lors du chargement des documents.',
    'documents.err_file_type': 'Type de fichier non autorisé (pdf, doc, docx, xls, xlsx, jpg, png uniquement).',
    'documents.err_file_size': 'Fichier trop volumineux (20 Mo maximum).',
    'documents.err_name_required': 'Le nom du document est obligatoire.',
    'documents.err_file_required': "Un fichier est obligatoire pour ajouter un document.",
    'documents.err_generic': 'Une erreur est survenue.',
    'documents.err_network': 'Erreur réseau.',
    'documents.err_download_link': 'Impossible de générer le lien de téléchargement.',
    'documents.err_download_network': 'Erreur réseau lors du téléchargement.',
    'documents.err_delete': 'Impossible de supprimer ce document.',
    'documents.err_delete_network': 'Erreur réseau lors de la suppression.',
    'documents.select_all_aria': 'Sélectionner tous les documents',
    'documents.select_row_aria': 'Sélectionner ce document',
    'documents.selected_count': '{{count}} sélectionné(s)',
    'documents.bulk_download': 'Télécharger la sélection',
    'documents.bulk_delete': 'Supprimer la sélection',
    'documents.bulk_clear': 'Désélectionner tout',
    'documents.bulk_delete_title': 'Supprimer plusieurs documents',
    'documents.bulk_delete_confirm': 'Supprimer définitivement {{count}} document(s) ? Cette action est irréversible.',
    'documents.bulk_delete_partial_fail': '{{failed}} document(s) sur {{total}} n\'ont pas pu être supprimés.',
    'documents.bulk_download_partial_fail': '{{failed}} document(s) sur {{total}} n\'ont pas pu être téléchargés.',

    'role.admin_corpus': 'Administrateur corpus',
    'role.responsable_conformite': 'Responsable conformité',
    'role.agent': 'Agent',
    'role.chargeur': 'Chargeur',
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
    'toast.doc_added': 'Document added successfully.',
    'toast.doc_added_indexed': 'Document added · {{count}} chunk(s) indexed in the corpus.',
    'toast.doc_updated': 'Document updated successfully.',
    'toast.doc_deleted': 'Document deleted successfully.',
    'toast.doc_action_failed': 'Action failed: {{reason}}',
    'toast.download_failed': 'Download failed.',
    'toast.doc_saved_index_failed': 'Document saved, but corpus indexing failed: {{reason}}',
    'nav.history': 'History',
    'history.title': 'Question history',
    'history.subtitle': 'All questions asked to Ask (RAG), with their sources.',
    'history.restricted': 'This page is reserved for Compliance Officer and Administrator roles.',
    'history.empty': 'No questions asked yet.',
    'history.err_load': 'Unable to load history.',
    'history.col_question': 'Question',
    'history.col_answer': 'Answer',
    'history.col_user': 'User',
    'history.col_date': 'Date',
    'history.col_status': 'Status',
    'history.status_sourced': 'Sourced',
    'history.status_abstained': 'Abstained',
    'history.back': 'Back to dashboard',
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

    'common.loading': 'Loading…',

    'dashboard.eyebrow': 'Compliance advisor',
    'dashboard.greeting': 'Hello',
    'dashboard.subtitle': 'Ask your regulatory questions, review sources and spot atypical documents.',
    'dashboard.new_request': 'New request',
    'dashboard.view_sources': 'View sources',
    'dashboard.stat_questions_today': 'Questions today',
    'dashboard.stat_sourced_answers': 'Sourced answers',
    'dashboard.stat_docs_to_review': 'Documents to review',
    'dashboard.recent_questions': 'Recent questions',
    'dashboard.view_all': 'View all',
    'dashboard.history_restricted': 'Restricted to Compliance Officer and Corpus Administrator roles.',
    'dashboard.abstained_label': 'Abstention · no reliable source',
    'dashboard.sourced_label': 'Cited answer · {{count}} document(s)',
    'dashboard.no_questions': 'No question asked yet.',
    'dashboard.alerts_title': 'Document alerts',
    'dashboard.manage': 'Manage',
    'dashboard.alert_text': 'A document shows a significant deviation from the usual corpus.',
    'dashboard.examine': 'Review',
    'dashboard.err_invalid_docs': 'Invalid documents response.',
    'dashboard.err_load_docs': 'Unable to load documents.',
    'dashboard.err_load_history': 'Unable to load question history.',

    'ask.eyebrow': 'Regulatory assistant',
    'ask.title': 'Ask your question',
    'ask.subtitle': 'Sourced answer (RAG) or explicit abstention if the corpus does not cover the question.',
    'ask.greeting': 'Hello — how can I help you?',
    'ask.placeholder': 'Ask your question...',
    'ask.send': 'Send',
    'ask.searching': 'Searching...',
    'ask.err_service': 'AI service error (see go-api logs).',
    'ask.err_service_detail': 'AI service error: {{reason}}',
    'ask.sources_prefix': ' · Sources: ',
    'ask.err_network': 'Network error reaching the API.',

    'documents.eyebrow': 'Corpus & anomaly detection',
    'documents.title': 'Source documents and deviation reporting',
    'documents.subtitle': 'The portal centralises reference documents and highlights atypical files to validate.',
    'documents.add': 'Add a document',
    'documents.incoming_docs': 'Incoming documents',
    'documents.files_word': 'files',
    'documents.col_id': 'ID',
    'documents.col_name': 'Name',
    'documents.col_file': 'File',
    'documents.col_status': 'Status',
    'documents.col_actions': 'Actions',
    'documents.no_file': 'no file',
    'documents.download': 'Download',
    'documents.edit': 'Edit',
    'documents.delete': 'Delete',
    'documents.edit_title': 'Edit document',
    'documents.delete_title': 'Delete document',
    'documents.sources_title': 'Sources indexed in the corpus',
    'documents.form_name': 'Document name',
    'documents.form_name_placeholder': 'e.g.: LVO_2026.pdf',
    'documents.form_status': 'Status',
    'documents.form_file_label': 'File',
    'documents.form_file_keep_hint': '(leave empty to keep the current file)',
    'documents.file_drop_hint': 'Click to choose a file (PDF, Word, Excel, image — 20 MB max)',
    'documents.delete_confirm': 'Permanently delete {{name}}? This action cannot be undone',
    'documents.delete_file_note': ' (the associated file will also be removed from storage)',
    'documents.empty_corpus': 'No regulatory text indexed yet. The corpus is empty, so the Ask (RAG) assistant will always abstain (EF-RAG-03 guardrail).',
    'documents.err_sources_forbidden': 'Only the Corpus Administrator role can view indexed sources.',
    'documents.err_sources_load': 'Unable to load indexed sources.',
    'documents.err_sources_network': 'Network error while loading sources.',
    'documents.fragments_word': 'fragment(s)',
    'documents.err_load': 'Unable to load documents.',
    'documents.err_load_network': 'Network error while loading documents.',
    'documents.err_file_type': 'File type not allowed (pdf, doc, docx, xls, xlsx, jpg, png only).',
    'documents.err_file_size': 'File too large (20 MB maximum).',
    'documents.err_name_required': 'Document name is required.',
    'documents.err_file_required': 'A file is required to add a document.',
    'documents.err_generic': 'Something went wrong.',
    'documents.err_network': 'Network error.',
    'documents.err_download_link': 'Unable to generate the download link.',
    'documents.err_download_network': 'Network error while downloading.',
    'documents.err_delete': 'Unable to delete this document.',
    'documents.err_delete_network': 'Network error while deleting.',
    'documents.select_all_aria': 'Select all documents',
    'documents.select_row_aria': 'Select this document',
    'documents.selected_count': '{{count}} selected',
    'documents.bulk_download': 'Download selection',
    'documents.bulk_delete': 'Delete selection',
    'documents.bulk_clear': 'Clear selection',
    'documents.bulk_delete_title': 'Delete multiple documents',
    'documents.bulk_delete_confirm': 'Permanently delete {{count}} document(s)? This action cannot be undone.',
    'documents.bulk_delete_partial_fail': '{{failed}} of {{total}} document(s) could not be deleted.',
    'documents.bulk_download_partial_fail': '{{failed}} of {{total}} document(s) could not be downloaded.',

    'role.admin_corpus': 'Corpus Administrator',
    'role.responsable_conformite': 'Compliance Officer',
    'role.agent': 'Agent',
    'role.chargeur': 'Shipper',
  },
};

/**
 * Gère la langue de l'interface (FR/EN). Couvre la navbar, la sidebar,
 * l'écran de connexion, et le contenu du dashboard/Ask/Documents. Pour
 * traduire un nouveau texte, ajouter la clé dans DICT ci-dessus puis
 * appeler lang.t('ma.cle') (ou lang.t('ma.cle', { var: valeur }) pour les
 * phrases avec une valeur dynamique) dans le template.
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

  t(key: string, vars?: Record<string, string | number>): string {
    let str = DICT[this.lang()][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      }
    }
    return str;
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
