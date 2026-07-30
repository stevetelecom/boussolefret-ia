import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { AuthService } from '../../core/auth.service';
import { LangService } from '../../core/lang.service';

interface HistoryEntry {
  id: number;
  question: string;
  answer: string;
  sources: string[];
  best_similarity?: number;
  abstained: boolean;
  user_email: string;
  created_at: string;
}

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [LayoutShellComponent, CommonModule, RouterLink],
  template: `
    <app-layout-shell>
      <section class="page animate-in">
        <header class="page-header card">
          <div>
            <p class="eyebrow">{{ lang.t('nav.history') }}</p>
            <h2>{{ lang.t('history.title') }}</h2>
            <p>{{ lang.t('history.subtitle') }}</p>
          </div>
          <a class="btn" routerLink="/dashboard">
            <span class="material-icons-outlined">arrow_back</span>
            {{ lang.t('history.back') }}
          </a>
        </header>

        <p class="empty-state card" *ngIf="restricted">{{ lang.t('history.restricted') }}</p>
        <p class="form-error" *ngIf="loadError">{{ loadError }}</p>

        <section class="card panel" *ngIf="!restricted">
          <p class="empty-state" *ngIf="!loading && entries.length === 0">{{ lang.t('history.empty') }}</p>

          <ul class="history-list" *ngIf="entries.length > 0">
            <li *ngFor="let h of entries" class="history-item">
              <div class="history-item__top">
                <strong>{{ h.question }}</strong>
                <span class="status-badge" [class.status-abstained]="h.abstained" [class.status-sourced]="!h.abstained">
                  {{ h.abstained ? lang.t('history.status_abstained') : lang.t('history.status_sourced') }}
                </span>
              </div>
              <p class="history-item__answer">{{ h.answer }}</p>
              <div class="history-item__meta">
                <span><span class="material-icons-outlined">person</span>{{ h.user_email }}</span>
                <span><span class="material-icons-outlined">schedule</span>{{ h.created_at | date: 'dd/MM/yyyy HH:mm' }}</span>
                <span *ngIf="h.sources?.length"><span class="material-icons-outlined">description</span>{{ h.sources.length }}</span>
              </div>
            </li>
          </ul>
        </section>
      </section>
    </app-layout-shell>
  `,
  styles: [
    `
      .page { display: flex; flex-direction: column; gap: 1rem; }
      .page-header { padding: 1.2rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
      .page-header h2 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.3rem, 2vw, 1.8rem); }
      .page-header p { margin: 0; color: var(--muted); line-height: 1.6; }
      .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0.9rem; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; }
      .panel { padding: 1.1rem; }
      .empty-state { color: var(--muted); padding: 0.85rem 0; line-height: 1.6; }
      .form-error { color: #ff8f8f; }
      .history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
      .history-item { padding: 0.9rem; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); }
      .history-item__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.8rem; }
      .history-item__answer { margin: 0.5rem 0; color: var(--muted); line-height: 1.5; }
      .history-item__meta { display: flex; gap: 1rem; flex-wrap: wrap; color: var(--muted); font-size: 0.82rem; }
      .history-item__meta span { display: inline-flex; align-items: center; gap: 0.3rem; }
      .history-item__meta .material-icons-outlined { font-size: 1rem; }
      .status-badge { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.78rem; white-space: nowrap; }
      .status-sourced { background: rgba(46, 213, 115, 0.14); color: #2ed573; }
      .status-abstained { background: rgba(255, 195, 0, 0.14); color: #ffc300; }
    `,
  ],
})
export class HistoryPageComponent implements OnInit {
  readonly lang = inject(LangService);

  entries: HistoryEntry[] = [];
  loading = true;
  restricted = false;
  loadError = '';

  constructor(private readonly auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.auth.authFetch('/history?limit=100');
      if (res.status === 403) {
        this.restricted = true;
        return;
      }
      if (!res.ok) {
        this.loadError = this.lang.t('history.err_load');
        return;
      }
      this.entries = await res.json();
    } catch (e) {
      console.error('history load error', e);
      this.loadError = this.lang.t('history.err_load');
    } finally {
      this.loading = false;
    }
  }
}
