import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LangService } from '../../core/lang.service';
import { TopNavbarComponent } from './top-navbar.component';
import { LogoMarkComponent } from './logo-mark.component';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TopNavbarComponent, LogoMarkComponent],
  template: `
    <div class="shell">
      <aside class="sidebar card">
        <div class="brand">
          <app-logo-mark [size]="48" />
          <div>
            <h1>BoussoleFret IA</h1>
            <p>{{ lang.t('brand.tagline') }}</p>
          </div>
        </div>

        <nav class="nav-links" aria-label="Navigation principale">
          <a routerLink="/dashboard" routerLinkActive="active">
            <span class="material-icons-outlined">dashboard</span>
            {{ lang.t('nav.dashboard') }}
          </a>
          <a routerLink="/ask" routerLinkActive="active">
            <span class="material-icons-outlined">question_answer</span>
            {{ lang.t('nav.ask') }}
          </a>
          <a routerLink="/documents" routerLinkActive="active">
            <span class="material-icons-outlined">folder</span>
            {{ lang.t('nav.documents') }}
          </a>
          <a (click)="logout()" style="cursor:pointer">
            <span class="material-icons-outlined">logout</span>
            {{ lang.t('nav.logout') }}
          </a>
        </nav>

        <!-- Avatar déplacé dans la top navbar (cf. top-navbar.component.ts) ;
             la sidebar ne garde que le rappel de phase, pas d'action utilisateur. -->
        <div class="sidebar__footer">
          <p>{{ lang.t('brand.phase') }}</p>
          <strong>{{ lang.t('brand.sourced') }}</strong>
        </div>
      </aside>

      <div class="main-col">
        <app-top-navbar />

        <main class="content">
          <ng-content />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 1.25rem;
        padding: 1.25rem;
      }
      .sidebar {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        margin-bottom: 1.5rem;
      }
      .brand__mark {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: var(--bg);
        font-weight: 800;
      }
      .brand h1 { margin: 0; font-size: 1rem; }
      .brand p { margin: 0.2rem 0 0; color: var(--muted); font-size: 0.9rem; }
      .nav-links { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
      .nav-links a {
        padding: 0.85rem 0.95rem;
        border-radius: 14px;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 0.7rem;
        transition: all 0.25s ease;
      }
      .nav-links a:hover, .nav-links a.active {
        background: rgba(61, 215, 198, 0.16);
        color: var(--text);
      }
      .sidebar__footer {
        padding-top: 1rem;
        border-top: 1px solid var(--border);
        color: var(--muted);
      }
      .main-col { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
      .content { min-width: 0; }
      @media (max-width: 900px) {
        .shell { grid-template-columns: 1fr; }
        /* Pas de "order" ici : on garde l'ordre naturel du DOM (sidebar
           puis contenu) pour éviter l'inversion visuelle en mobile. */
      }
    `,
  ],
})
export class LayoutShellComponent {
  readonly lang = inject(LangService);
  constructor(private readonly router: Router, private readonly auth: AuthService) {}
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
