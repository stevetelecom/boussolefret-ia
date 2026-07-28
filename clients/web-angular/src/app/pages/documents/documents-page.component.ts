import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { ModalComponent } from '../../components/shared/modal.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

declare const $: any;

interface Doc { id: number; name: string; status: string }

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [LayoutShellComponent, ModalComponent, FormsModule, CommonModule],
  template: `
    <app-layout-shell>
      <section class="page animate-in">
        <header class="page-header card">
          <div>
            <p class="eyebrow">Corpus & détection d’anomalies</p>
            <h2>Documents sources et signalement d’écarts</h2>
            <p>Le portail centralise les documents de référence et met en évidence les fichiers atypiques à valider.</p>
          </div>
          <div>
            <button class="btn primary" (click)="openAdd()">Ajouter un document</button>
          </div>
        </header>

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
                <td>{{d.status}}</td>
                <td>
                  <button class="btn" (click)="openEdit(d)">Modifier</button>
                  <button class="btn" (click)="onDelete(d)">Supprimer</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <app-modal [title]="modalTitle" [(show)]="showModal" (save)="onModalSave()" (close)="onModalClose()">
          <form class="modal-form">
            <label>
              <span>Nom du document</span>
              <input type="text" [(ngModel)]="form.name" />
            </label>
            <label>
              <span>Statut</span>
              <select [(ngModel)]="form.status">
                <option>Validé</option>
                <option>À vérifier</option>
                <option>À risque</option>
              </select>
            </label>
          </form>
        </app-modal>
      </section>
    </app-layout-shell>
  `,
  styles: [
    `
      .page { display: flex; flex-direction: column; gap: 1rem; }
      .page-header { padding: 1.2rem 1.25rem; display:flex; justify-content:space-between; align-items:center }
      .page-header h2 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.3rem, 2vw, 1.8rem); }
      .page-header p { margin: 0; color: var(--muted); line-height: 1.6; }
      .panel { padding: 1rem; }
      .panel__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
      table.dataTable { color: var(--text); }
      .modal-form { display:flex; flex-direction:column; gap:0.6rem; }
      .modal-form label { display:flex; flex-direction:column; }
      input, select { padding:0.6rem; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.03); color:var(--text); }
    `,
  ],
})
export class DocumentsPageComponent implements AfterViewInit, OnDestroy, OnInit {
  docs: Doc[] = [
    { id: 1, name: 'LVO_2026.pdf', status: 'Validé' },
    { id: 2, name: 'LVI_2026.pdf', status: 'À vérifier' },
    { id: 3, name: 'Mission_042.pdf', status: 'À risque' },
  ];

  showModal = false;
  modalTitle = '';
  form: Partial<Doc> = {};
  editingId: number | null = null;

  private dt: any;
  private apiBase = 'http://localhost:8080';

  async ngOnInit(): Promise<void> {
    await this.loadDocs();
  }

  private async loadDocs(): Promise<void> {
    try {
      const res = await fetch(`${this.apiBase}/documents`);
      if (!res.ok) return;
      const data = await res.json();
      this.docs = data || [];
      setTimeout(() => { this.rebuildTable(); }, 50);
    } catch (e) {
      console.error('loadDocs error', e);
    }
  }

  ngAfterViewInit(): void {
    // initialize DataTable (requires jQuery/DataTables loaded from index.html)
    try {
      this.dt = ($('#docs-table') as any).DataTable({
        paging: true,
        searching: true,
        info: true,
      });
    } catch (e) {
      // DataTables may not be available in some dev environments; fallback silently
      console.warn('DataTables init failed', e);
    }
  }

  ngOnDestroy(): void {
    try { if (this.dt) { this.dt.destroy(true); } } catch {}
  }

  openAdd() {
    this.modalTitle = 'Ajouter un document';
    this.form = { name: '', status: 'À vérifier' };
    this.editingId = null;
    this.showModal = true;
  }

  openEdit(d: Doc) {
    this.modalTitle = 'Modifier le document';
    this.form = { name: d.name, status: d.status };
    this.editingId = d.id;
    this.showModal = true;
  }

  onDelete(d: Doc) {
    if (!confirm(`Supprimer ${d.name} ?`)) return;
    try {
      fetch(`${this.apiBase}/documents/${d.id}`, { method: 'DELETE' }).then(async (r) => {
        if (r.ok) {
          this.docs = this.docs.filter(x => x.id !== d.id);
          this.rebuildTable();
        } else {
          alert('Impossible de supprimer');
        }
      });
    } catch (e) { console.error(e); alert('Erreur réseau'); }
  }

  onModalSave() {
    const payload = { name: this.form.name || '', status: this.form.status || '' };
    if (this.editingId) {
      fetch(`${this.apiBase}/documents/${this.editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(async r => { if (r.ok) { await this.loadDocs(); this.showModal=false; } else { alert('Impossible de modifier'); } });
    } else {
      fetch(`${this.apiBase}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(async r => { if (r.ok) { await this.loadDocs(); this.showModal=false; } else { alert('Impossible d\'ajouter'); } });
    }
  }

  onModalClose() { this.showModal = false; }

  private rebuildTable() {
    try {
      if (this.dt) { this.dt.destroy(); }
      setTimeout(() => { this.dt = ($('#docs-table') as any).DataTable(); }, 50);
    } catch (e) {
      // ignore
    }
  }
}
