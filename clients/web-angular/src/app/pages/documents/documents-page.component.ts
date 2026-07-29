import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { ModalComponent } from '../../components/shared/modal.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

declare const $: any;

interface Doc { id: number; name: string; status: string }
interface SourceSummary { source: string; chunks: number }

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [LayoutShellComponent, ModalComponent, FormsModule, CommonModule],
  template: `
    <app-layout-shell>
      <section class="page animate-in">
        <header class="page-header card">
          <div>
            <p class="eyebrow">Corpus &amp; détection d'anomalies</p>
            <h2>Documents sources et signalement d'écarts</h2>
            <p>Le portail centralise les documents de référence et met en évidence les fichiers atypiques à valider.</p>
          </div>
          <div class="header-actions">
            <button class="btn" (click)="openSources()">
              <span class="material-icons-outlined">source</span>
              Voir les sources
            </button>
            <button class="btn primary" (click)="openAdd()">
              <span class="material-icons-outlined">add</span>
              Ajouter un document
            </button>
          </div>
        </header>

        <p class="form-error" *ngIf="loadError">{{ loadError }}</p>

        <section class="card panel">
          <div class="panel__header">
            <h3>Documents en entrée</h3>
            <span>{{ docs.length }} fichiers</span>
          </div>

          <table id="docs-table" class="display" style="width:100%">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of docs">
                <td>{{d.id}}</td>
                <td>{{d.name}}</td>
                <td><span class="status-badge" [class]="statusClass(d.status)">{{d.status}}</span></td>
                <td class="actions-cell">
                  <button class="btn icon-only" (click)="openEdit(d)" aria-label="Modifier">
                    <span class="material-icons-outlined">edit</span>
                  </button>
                  <button class="btn icon-only danger" (click)="openDelete(d)" aria-label="Supprimer">
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
              <span>Nom du document</span>
              <input type="text" [(ngModel)]="form.name" name="docName" placeholder="ex: LVO_2026.pdf" />
            </label>
            <label>
              <span>Statut</span>
              <select [(ngModel)]="form.status" name="docStatus">
                <option>Validé</option>
                <option>À vérifier</option>
                <option>À risque</option>
              </select>
            </label>
            <p class="form-error" *ngIf="modalError">{{ modalError }}</p>
          </form>
        </app-modal>

        <app-modal title="Supprimer le document" [(show)]="showDeleteModal" (save)="confirmDelete()" (close)="showDeleteModal=false">
          <p>
            Supprimer définitivement <strong>{{ docToDelete?.name }}</strong> ? Cette action est irréversible.
          </p>
        </app-modal>

        <app-modal title="Sources indexées dans le corpus" [(show)]="showSourcesModal" (save)="showSourcesModal=false" (close)="showSourcesModal=false">
          <div *ngIf="sourcesLoading">Chargement…</div>
          <div *ngIf="!sourcesLoading && sources.length === 0" class="empty-state">
            Aucun texte réglementaire indexé pour l'instant. Le corpus est vide, donc l'assistant Ask (RAG) répondra
            systématiquement par une abstention (garde-fou EF-RAG-03).
          </div>
          <ul class="sources-list" *ngIf="!sourcesLoading && sources.length > 0">
            <li *ngFor="let s of sources">
              <span class="material-icons-outlined">description</span>
              <span class="sources-list__name">{{ s.source }}</span>
              <span class="sources-list__count">{{ s.chunks }} fragment(s)</span>
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
    `,
  ],
})
export class DocumentsPageComponent implements AfterViewInit, OnDestroy, OnInit {
  docs: Doc[] = [];
  loadError = '';

  showModal = false;
  modalTitle = '';
  modalError = '';
  form: Partial<Doc> = {};
  editingId: number | null = null;

  showDeleteModal = false;
  docToDelete: Doc | null = null;

  showSourcesModal = false;
  sourcesLoading = false;
  sources: SourceSummary[] = [];

  private dt: any;

  constructor(private readonly auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    await this.loadDocs();
  }

  private async loadDocs(): Promise<void> {
    try {
      const res = await this.auth.authFetch('/documents');
      if (!res.ok) {
        this.loadError = 'Impossible de charger les documents.';
        return;
      }
      this.loadError = '';
      const data = await res.json();
      this.docs = data || [];
      setTimeout(() => { this.rebuildTable(); }, 50);
    } catch (e) {
      console.error('loadDocs error', e);
      this.loadError = 'Erreur réseau lors du chargement des documents.';
    }
  }

  ngAfterViewInit(): void {
    try {
      this.dt = ($('#docs-table') as any).DataTable({
        paging: true,
        searching: true,
        info: true,
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

  openAdd() {
    this.modalTitle = 'Ajouter un document';
    this.modalError = '';
    this.form = { name: '', status: 'À vérifier' };
    this.editingId = null;
    this.showModal = true;
  }

  openEdit(d: Doc) {
    this.modalTitle = 'Modifier le document';
    this.modalError = '';
    this.form = { name: d.name, status: d.status };
    this.editingId = d.id;
    this.showModal = true;
  }

  openDelete(d: Doc) {
    this.docToDelete = d;
    this.showDeleteModal = true;
  }

  async confirmDelete(): Promise<void> {
    if (!this.docToDelete) return;
    try {
      const res = await this.auth.authFetch(`/documents/${this.docToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        this.docs = this.docs.filter(x => x.id !== this.docToDelete!.id);
        this.rebuildTable();
        this.showDeleteModal = false;
        this.docToDelete = null;
      } else {
        this.loadError = 'Impossible de supprimer ce document.';
      }
    } catch (e) {
      console.error(e);
      this.loadError = 'Erreur réseau lors de la suppression.';
    }
  }

  async onModalSave(): Promise<void> {
    const name = (this.form.name || '').trim();
    const status = this.form.status || '';
    if (!name) {
      this.modalError = 'Le nom du document est obligatoire.';
      return;
    }
    const payload = { name, status };
    try {
      const res = this.editingId
        ? await this.auth.authFetch(`/documents/${this.editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await this.auth.authFetch('/documents', { method: 'POST', body: JSON.stringify(payload) });

      if (res.ok) {
        await this.loadDocs();
        this.showModal = false;
      } else {
        const body = await res.json().catch(() => ({}));
        this.modalError = body.error || 'Une erreur est survenue.';
      }
    } catch (e) {
      console.error(e);
      this.modalError = 'Erreur réseau.';
    }
  }

  onModalClose() { this.showModal = false; }

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
      setTimeout(() => { this.dt = ($('#docs-table') as any).DataTable(); }, 50);
    } catch (e) {
      // ignore
    }
  }
}
