import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { AuthService } from '../../core/auth.service';

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

interface DocSummary {
  id: number;
  name: string;
  status: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [LayoutShellComponent, CommonModule, RouterLink],
  template: `
    <app-layout-shell>
      <section class="page animate-in">
        <header class="hero card">
          <div>
            <p class="eyebrow">Conseil de conformité</p>
            <h2>Bonjour, agent conformité</h2>
            <p>Posez vos questions réglementaires, consultez les sources et identifiez les documents atypiques.</p>
          </div>
          <div class="hero__actions">
            <button class="primary" routerLink="/ask">
              <span class="material-icons-outlined">add</span>
              Nouvelle requête
            </button>
            <button class="secondary" routerLink="/documents">
              <span class="material-icons-outlined">source</span>
              Voir les sources
            </button>
          </div>
        </header>

        <p class="form-error" *ngIf="loadError">{{ loadError }}</p>

        <div class="stats-grid">
          <article class="card stat-card">
            <strong>{{ questionsToday }}</strong>
            <span>Questions aujourd'hui</span>
          </article>
          <article class="card stat-card">
            <strong>{{ sourcedPct }}%</strong>
            <span>Réponses avec source</span>
          </article>
          <article class="card stat-card">
            <strong>{{ docsToReview }}</strong>
            <span>Documents à reviewer</span>
          </article>
        </div>

        <div class="panel-grid">
          <section class="card panel">
            <div class="panel__header">
              <h3>Dernières questions</h3>
              <a routerLink="/ask">Tout voir</a>
            </div>
            <ul *ngIf="recentQuestions.length; else noHistory">
              <li *ngFor="let q of recentQuestions">
                <strong>{{ q.question }}</strong>
                <span>{{ q.abstained ? 'Abstention · aucune source fiable' : ('Réponse citée · ' + q.sources.length + ' document(s)') }}</span>
              </li>
            </ul>
            <ng-template #noHistory>
              <p class="empty-state">Aucune question posée pour le moment.</p>
            </ng-template>
          </section>

          <section class="card panel">
            <div class="panel__header">
              <h3>Alertes documentaires</h3>
              <a routerLink="/documents">Gérer</a>
            </div>
            <div class="alert-box">
              <p>Un document présente un écart significatif par rapport au corpus habituel.</p>
              <button>Examiner</button>
            </div>
          </section>
        </div>
      </section>
    </app-layout-shell>
  `,
  styles: [
    `
      .page { display: flex; flex-direction: column; gap: 1rem; }
      .hero {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 1.4rem;
      }
      .hero h2 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.3rem, 2vw, 1.8rem); }
      .hero p { margin: 0; color: var(--muted); line-height: 1.6; }
      .hero__actions { display: flex; gap: 0.7rem; flex-wrap: wrap; }
      .hero__actions button, .alert-box button {
        border: 0;
        border-radius: 999px;
        padding: 0.8rem 1rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
      }
      .hero__actions .primary, .alert-box button { background: linear-gradient(135deg, var(--accent), var(--accent-strong)); color: var(--bg); }
      .hero__actions .secondary { background: rgba(255,255,255,0.06); color: var(--text); }
      .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
      .stat-card { padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.3rem; }
      .stat-card strong { font-size: 1.4rem; color: var(--accent); }
      .stat-card span { color: var(--muted); }
      .panel-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem; }
      .panel { padding: 1.1rem; }
      .panel__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
      .panel__header a { color: var(--accent); font-size: 0.94rem; }
      .panel ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.7rem; }
      .panel li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.85rem 0; border-bottom: 1px solid var(--border); }
      .panel li span { color: var(--muted); font-size: 0.9rem; }
      .empty-state { color: var(--muted); padding: 0.85rem 0; }
      .alert-box { padding: 1rem; border-radius: 16px; background: rgba(255, 107, 107, 0.12); border: 1px solid rgba(255, 107, 107, 0.2); }
      .form-error { color: #ff8080; }
      @media (max-width: 900px) { .stats-grid, .panel-grid { grid-template-columns: 1fr; } }
      @media (max-width: 640px) { .hero { flex-direction: column; align-items: flex-start; } }
    `,
  ],
})
export class DashboardPageComponent implements OnInit {
  loadError = '';
  history: HistoryEntry[] = [];
  documents: DocSummary[] = [];

  constructor(private readonly auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    try {
      const [historyRes, docsRes] = await Promise.all([
        this.auth.authFetch('/history?limit=50'),
        this.auth.authFetch('/documents'),
      ]);
      if (!historyRes.ok || !docsRes.ok) {
        this.loadError = 'Impossible de charger les données du dashboard.';
        return;
      }
      this.history = await historyRes.json();
      this.documents = await docsRes.json();
      this.loadError = '';
    } catch (e) {
      console.error(e);
      this.loadError = 'Erreur réseau lors du chargement du dashboard.';
    }
  }

  get recentQuestions(): HistoryEntry[] {
    return this.history.slice(0, 3);
  }

  get questionsToday(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.history.filter((h) => h.created_at && h.created_at.startsWith(today)).length;
  }

  get sourcedPct(): number {
    if (this.history.length === 0) return 0;
    const sourced = this.history.filter((h) => !h.abstained).length;
    return Math.round((sourced / this.history.length) * 100);
  }

  get docsToReview(): number {
    return this.documents.filter((d) => d.status !== 'Validé').length;
  }
}
