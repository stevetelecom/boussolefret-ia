import { AfterViewInit, Component, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { ModalComponent } from '../../components/shared/modal.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { LangService } from '../../core/lang.service';
import { ToastService } from '../../core/toast.service';

declare const $: any;

interface Doc {
  id: number;
  name: string;
  status: string;
  file_name?: string;
  file_size?: number;
  content_type?: string;
  has_file: boolean;
}
interface SourceSummary { source: string; chunks: number }

// Whitelist stricte côté client (miroir de allowedDocumentExtensions côté
// go-api) — c'est un confort d'UX (retour immédiat), PAS un contrôle de
// sécurité : le backend revalide systématiquement extension + taille, jamais
// confiance dans ce qui vient du navigateur.
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo, doit rester identique à maxDocumentUploadBytes (main.go)

// ⚠️ Les valeurs de statut ('Validé', 'À vérifier', 'À risque') sont des
// DONNÉES métier échangées telles quelles avec l'API Go (voir statusClass()
// et AlertsService, qui comparent ces chaînes en dur) — elles ne sont
// volontairement PAS traduites : seuls les libellés d'interface autour
// (colonne "Statut", etc.) passent par lang.t(...).

// jQuery DataTables a son PROPRE système i18n, indépendant de LangService —
// sans ceci, "Show entries / Search / No data available / Showing X to Y /
// Previous / Next" restent figés en anglais même en mode FR.
const DATATABLES_LANG_FR = {
  sProcessing: 'Traitement en cours...',
  sSearch: 'Rechercher\u00a0:',
  sLengthMenu: 'Afficher _MENU_ éléments',
  sInfo: 'Affichage de l\u2019élément _START_ à _END_ sur _TOTAL_ éléments',
  sInfoEmpty: 'Affichage de l\u2019élément 0 à 0 sur 0 élément',
  sInfoFiltered: '(filtré de _MAX_ éléments au total)',
  sInfoPostFix: '',
  sLoadingRecords: 'Chargement en cours...',
  sZeroRecords: 'Aucun élément à afficher',
  sEmptyTable: 'Aucune donnée disponible dans le tableau',
  oPaginate: {
    sFirst: 'Premier',
    sPrevious: 'Précédent',
    sNext: 'Suivant',
    sLast: 'Dernier',
  },
  oAria: {
    sSortAscending: ' : activer pour trier la colonne par ordre croissant',
    sSortDescending: ' : activer pour trier la colonne par ordre décroissant',
  },
};

const DATATABLES_LANG_EN = {
  sProcessing: 'Processing...',
  sSearch: 'Search:',
  sLengthMenu: 'Show _MENU_ entries',
  sInfo: 'Showing _START_ to _END_ of _TOTAL_ entries',
  sInfoEmpty: 'Showing 0 to 0 of 0 entries',
  sInfoFiltered: '(filtered from _MAX_ total entries)',
  sInfoPostFix: '',
  sLoadingRecords: 'Loading...',
  sZeroRecords: 'No matching records found',
  sEmptyTable: 'No data available in table',
  oPaginate: {
    sFirst: 'First',
    sPrevious: 'Previous',
    sNext: 'Next',
    sLast: 'Last',
  },
  oAria: {
    sSortAscending: ': activate to sort column ascending',
    sSortDescending: ': activate to sort column descending',
  },
};

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [LayoutShellComponent, ModalComponent, FormsModule, CommonModule],
  template: `
    <app-layout-shell>
      <section class="page animate-in">
        <header class="page-header card">
          <div>
            <p class="eyebrow">{{ lang.t('documents.eyebrow') }}</p>
            <h2>{{ lang.t('documents.title') }}</h2>
            <p>{{ lang.t('documents.subtitle') }}</p>
          </div>
          <div class="header-actions">
            <button class="btn" (click)="openSources()">
              <span class="material-icons-outlined">source</span>
              {{ lang.t('dashboard.view_sources') }}
            </button>
            <button class="btn primary" (click)="openAdd()">
              <span class="material-icons-outlined">add</span>
              {{ lang.t('documents.add') }}
            </button>
          </div>
        </header>

        <p class="form-error" *ngIf="loadError">{{ loadError }}</p>

        <section class="card panel">
          <div class="panel__header">
            <h3>{{ lang.t('documents.incoming_docs') }}</h3>
            <span>{{ docs.length }} {{ lang.t('documents.files_word') }}</span>
          </div>

          <table id="docs-table" class="display" style="width:100%">
            <thead>
              <tr>
                <th>{{ lang.t('documents.col_id') }}</th>
                <th>{{ lang.t('documents.col_name') }}</th>
                <th>{{ lang.t('documents.col_file') }}</th>
                <th>{{ lang.t('documents.col_status') }}</th>
                <th>{{ lang.t('documents.col_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of docs">
                <td>{{d.id}}</td>
                <td>{{d.name}}</td>
                <td>
                  <span class="file-chip" *ngIf="d.has_file" [title]="d.content_type">
                    <span class="material-icons-outlined">description</span>
                    {{ formatSize(d.file_size) }}
                  </span>
                  <span class="file-chip file-chip--missing" *ngIf="!d.has_file">
                    <span class="material-icons-outlined">block</span>
                    {{ lang.t('documents.no_file') }}
                  </span>
                </td>
                <td><span class="status-badge" [class]="statusClass(d.status)">{{d.status}}</span></td>
                <td class="actions-cell">
                  <button class="btn icon-only" (click)="download(d)" [disabled]="!d.has_file" [attr.aria-label]="lang.t('documents.download')">
                    <span class="material-icons-outlined">download</span>
                  </button>
                  <button class="btn icon-only" (click)="openEdit(d)" [attr.aria-label]="lang.t('documents.edit')">
                    <span class="material-icons-outlined">edit</span>
                  </button>
                  <button class="btn icon-only danger" (click)="openDelete(d)" [attr.aria-label]="lang.t('documents.delete')">
                    <span class="material-icons-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <app-modal [title]="modalTitle" [(show)]="showModal" (save)="onModalSave()" (close)="onModalClose()">
          <form class="modal-form">
            <label>
              <span>{{ lang.t('documents.form_name') }}</span>
              <input type="text" [(ngModel)]="form.name" name="docName" [placeholder]="lang.t('documents.form_name_placeholder')" />
            </label>
            <label>
              <span>{{ lang.t('documents.form_status') }}</span>
              <select [(ngModel)]="form.status" name="docStatus">
                <option>Validé</option>
                <option>À vérifier</option>
                <option>À risque</option>
              </select>
            </label>

            <label>
              <span>{{ lang.t('documents.form_file_label') }} {{ editingId ? lang.t('documents.form_file_keep_hint') : '' }}</span>
              <div class="file-drop" [class.file-drop--filled]="!!selectedFile" (click)="fileInput.click()">
                <span class="material-icons-outlined">{{ selectedFile ? 'task' : 'upload_file' }}</span>
                <span *ngIf="!selectedFile">{{ lang.t('documents.file_drop_hint') }}</span>
                <span *ngIf="selectedFile">{{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}</span>
              </div>
              <input #fileInput type="file" hidden
                     accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                     (change)="onFileSelected($event)" />
            </label>

            <p class="form-error" *ngIf="modalError">{{ modalError }}</p>
          </form>
        </app-modal>

        <app-modal [title]="lang.t('documents.delete_title')" [(show)]="showDeleteModal" (save)="confirmDelete()" (close)="showDeleteModal=false">
          <p>
            {{ lang.t('documents.delete_confirm', { name: docToDelete?.name || '' }) }}
            {{ docToDelete?.has_file ? lang.t('documents.delete_file_note') : '' }}.
          </p>
        </app-modal>

        <app-modal [title]="lang.t('documents.sources_title')" [(show)]="showSourcesModal" (save)="showSourcesModal=false" (close)="showSourcesModal=false">
          <div *ngIf="sourcesLoading">{{ lang.t('common.loading') }}</div>
          <div *ngIf="!sourcesLoading && sources.length === 0" class="empty-state">
            {{ lang.t('documents.empty_corpus') }}
          </div>
          <ul class="sources-list" *ngIf="!sourcesLoading && sources.length > 0">
            <li *ngFor="let s of sources">
              <span class="material-icons-outlined">description</span>
              <span class="sources-list__name">{{ s.source }}</span>
              <span class="sources-list__count">{{ s.chunks }} {{ lang.t('documents.fragments_word') }}</span>
            </li>
          </ul>
        </app-modal>
      </section>
    </app-layout-shell>
  `,
  styles: [
    `
      .page { display: flex; flex-direction: column; gap: 1rem; }
      .page-header { padding: 1.2rem 1.25rem; display:flex; justify-content:space-between; align-items:center; gap: 1rem; flex-wrap: wrap; }
      .page-header h2 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.3rem, 2vw, 1.8rem); }
      .page-header p { margin: 0; color: var(--muted); line-height: 1.6; }
      .header-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
      .panel { padding: 1rem; }
      .panel__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
      table.dataTable { color: var(--text); }
      .modal-form { display:flex; flex-direction:column; gap:0.6rem; }
      .modal-form label { display:flex; flex-direction:column; gap: 0.3rem; }
      input, select { padding:0.6rem; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.03); color:var(--text); }
      .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding:0.6rem 0.9rem; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text); cursor: pointer; }
      .btn.primary { background:linear-gradient(135deg,var(--accent),var(--accent-strong)); color:var(--bg); border:0; font-weight: 700; }
      .btn .material-icons-outlined { font-size: 1.1rem; }
      .btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .actions-cell { display: flex; gap: 0.4rem; }
      .btn.icon-only { padding: 0.45rem; }
      .btn.icon-only.danger { color: #ff8f8f; border-color: rgba(255,143,143,0.35); }
      .btn.icon-only.danger:hover { background: rgba(255,143,143,0.1); }
      .status-badge { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.82rem; }
      .status-badge.status-valide { background: rgba(46, 213, 115, 0.14); color: #2ed573; }
      .status-badge.status-a-verifier { background: rgba(255, 195, 0, 0.14); color: #ffc300; }
      .status-badge.status-a-risque { background: rgba(255, 107, 107, 0.14); color: #ff6b6b; }
      .form-error { color: #ff8f8f; margin: 0; font-size: 0.9rem; }
      .empty-state { color: var(--muted); line-height: 1.6; }
      .sources-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; max-height: 320px; overflow: auto; }
      .sources-list li { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.2rem; border-bottom: 1px solid var(--border); }
      .sources-list__name { flex: 1; }
      .sources-list__count { color: var(--muted); font-size: 0.85rem; }
      .file-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.6rem; border-radius: 999px; background: rgba(61,215,198,0.12); color: var(--accent); font-size: 0.8rem; }
      .file-chip .material-icons-outlined { font-size: 1rem; }
      .file-chip--missing { background: rgba(255,255,255,0.05); color: var(--muted); }
      .file-drop { display:flex; align-items:center; gap:0.6rem; padding: 0.9rem 1rem; border: 1.5px dashed var(--border); border-radius: 12px; color: var(--muted); cursor: pointer; transition: border-color 0.2s ease, color 0.2s ease; }
      .file-drop:hover { border-color: var(--accent); color: var(--text); }
      .file-drop--filled { border-style: solid; border-color: var(--accent); color: var(--text); }
      .file-drop .material-icons-outlined { color: var(--accent); }
    `,
  ],
})
export class DocumentsPageComponent implements AfterViewInit, OnDestroy, OnInit {
  readonly lang = inject(LangService);
  readonly toast = inject(ToastService);

  docs: Doc[] = [];
  loadError = '';

  showModal = false;
  modalTitle = '';
  modalError = '';
  form: Partial<Doc> = {};
  editingId: number | null = null;
  selectedFile: File | null = null;

  showDeleteModal = false;
  docToDelete: Doc | null = null;

  showSourcesModal = false;
  sourcesLoading = false;
  sources: SourceSummary[] = [];

  private dt: any;
  private isFirstLangEffectRun = true;

  constructor(private readonly auth: AuthService) {
    // DataTables ne réagit pas tout seul à un changement de signal Angular :
    // il faut détruire/recréer l'instance avec la bonne config `language`
    // à chaque bascule FR/EN.
    effect(() => {
      this.lang.lang();
      if (this.isFirstLangEffectRun) {
        this.isFirstLangEffectRun = false;
        return;
      }
      this.rebuildTable();
    });
  }

  private dataTableLanguage() {
    return this.lang.lang() === 'fr' ? DATATABLES_LANG_FR : DATATABLES_LANG_EN;
  }

  async ngOnInit(): Promise<void> {
    await this.loadDocs();
  }

  private async loadDocs(): Promise<void> {
    try {
      const res = await this.auth.authFetch('/documents');
      if (!res.ok) {
        this.loadError = this.lang.t('documents.err_load');
        return;
      }
      this.loadError = '';
      const data = await res.json();
      this.docs = data || [];
      setTimeout(() => { this.rebuildTable(); }, 50);
    } catch (e) {
      console.error('loadDocs error', e);
      this.loadError = this.lang.t('documents.err_load_network');
    }
  }

  ngAfterViewInit(): void {
    try {
      this.dt = ($('#docs-table') as any).DataTable({
        paging: true,
        searching: true,
        info: true,
        language: this.dataTableLanguage(),
      });
    } catch (e) {
      console.warn('DataTables init failed', e);
    }
  }

  ngOnDestroy(): void {
    try { if (this.dt) { this.dt.destroy(true); } } catch {}
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Validé': return 'status-valide';
      case 'À vérifier': return 'status-a-verifier';
      case 'À risque': return 'status-a-risque';
      default: return '';
    }
  }

  formatSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  openAdd() {
    this.modalTitle = this.lang.t('documents.add');
    this.modalError = '';
    this.form = { name: '', status: 'À vérifier' };
    this.editingId = null;
    this.selectedFile = null;
    this.showModal = true;
  }

  openEdit(d: Doc) {
    this.modalTitle = this.lang.t('documents.edit_title');
    this.modalError = '';
    this.form = { name: d.name, status: d.status };
    this.editingId = d.id;
    this.selectedFile = null;
    this.showModal = true;
  }

  openDelete(d: Doc) {
    this.docToDelete = d;
    this.showDeleteModal = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.modalError = '';
    if (!file) {
      this.selectedFile = null;
      return;
    }
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      this.modalError = this.lang.t('documents.err_file_type');
      input.value = '';
      this.selectedFile = null;
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.modalError = this.lang.t('documents.err_file_size');
      input.value = '';
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
    if (!this.form.name || !this.form.name.trim()) {
      this.form.name = file.name;
    }
  }

  async download(d: Doc): Promise<void> {
    if (!d.has_file) return;
    try {
      const res = await this.auth.authFetch(`/documents/${d.id}/download`);
      if (!res.ok) {
        this.loadError = this.lang.t('documents.err_download_link');
        this.toast.error(this.lang.t('toast.download_failed'));
        return;
      }
      const data = await res.json();
      if (data && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('download error', e);
      this.loadError = this.lang.t('documents.err_download_network');
    }
  }

  async confirmDelete(): Promise<void> {
    if (!this.docToDelete) return;
    try {
      const res = await this.auth.authFetch(`/documents/${this.docToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        this.docs = this.docs.filter(x => x.id !== this.docToDelete!.id);
        this.rebuildTable();
        this.showDeleteModal = false;
        this.toast.success(this.lang.t('toast.doc_deleted'));
        this.docToDelete = null;
      } else {
        this.loadError = this.lang.t('documents.err_delete');
        this.toast.error(this.lang.t('toast.doc_action_failed', { reason: this.lang.t('documents.err_delete') }));
      }
    } catch (e) {
      console.error(e);
      this.loadError = this.lang.t('documents.err_delete_network');
    }
  }

  async onModalSave(): Promise<void> {
    const name = (this.form.name || '').trim();
    const status = this.form.status || '';
    if (!name) {
      this.modalError = this.lang.t('documents.err_name_required');
      return;
    }
    if (!this.editingId && !this.selectedFile) {
      this.modalError = this.lang.t('documents.err_file_required');
      return;
    }

    // multipart/form-data obligatoire dès qu'un fichier est en jeu — jamais
    // JSON.stringify ici, et authFetch ne doit PAS fixer Content-Type
    // lui-même (voir le correctif dans auth.service.ts).
    const payload = new FormData();
    payload.append('name', name);
    payload.append('status', status);
    if (this.selectedFile) {
      payload.append('file', this.selectedFile, this.selectedFile.name);
    }

    try {
      const res = this.editingId
        ? await this.auth.authFetch(`/documents/${this.editingId}`, { method: 'PUT', body: payload })
        : await this.auth.authFetch('/documents', { method: 'POST', body: payload });

      if (res.ok) {
        const wasEdit = !!this.editingId;
        await this.loadDocs();
        this.showModal = false;
        this.selectedFile = null;
        this.toast.success(this.lang.t(wasEdit ? 'toast.doc_updated' : 'toast.doc_added'));
      } else {
        const body = await res.json().catch(() => ({}));
        const reason = body.error || this.lang.t('documents.err_generic');
        this.modalError = reason;
        this.toast.error(this.lang.t('toast.doc_action_failed', { reason }));
      }
    } catch (e) {
      console.error(e);
      this.modalError = this.lang.t('documents.err_network');
    }
  }

  onModalClose() { this.showModal = false; this.selectedFile = null; }

  async openSources(): Promise<void> {
    this.showSourcesModal = true;
    this.sourcesLoading = true;
    try {
      const res = await this.auth.authFetch('/corpus');
      this.sources = res.ok ? await res.json() : [];
    } catch (e) {
      console.error(e);
      this.sources = [];
    } finally {
      this.sourcesLoading = false;
    }
  }

  private rebuildTable() {
    try {
      if (this.dt) { this.dt.destroy(); }
      setTimeout(() => {
        this.dt = ($('#docs-table') as any).DataTable({
          paging: true,
          searching: true,
          info: true,
          language: this.dataTableLanguage(),
        });
      }, 50);
    } catch (e) {
      // ignore
    }
  }
}
