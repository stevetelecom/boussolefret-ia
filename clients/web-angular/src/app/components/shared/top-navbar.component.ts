import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/theme.service';
import { LangService } from '../../core/lang.service';
import { AlertsService } from '../../core/alerts.service';
import { UserAvatarMenuComponent } from './user-avatar-menu.component';

interface CemacCountry {
  code: string;
  name: string;
}

// Décoratif uniquement (confirmé) : simple rappel visuel du bureau pilote.
const CEMAC_COUNTRIES: CemacCountry[] = [
  { code: 'cm', name: 'Cameroun' },
];

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [CommonModule, UserAvatarMenuComponent],
  template: `
    <header class="topbar">
      <div class="topbar__spacer"></div>

      <div class="topbar__actions">
        <div class="topbar__zone" aria-label="Bureau">
          <img
            *ngFor="let c of countries"
            [src]="'https://flagcdn.com/24x18/' + c.code + '.png'"
            [alt]="c.name"
            [title]="c.name"
            width="22"
            height="16"
            loading="lazy"
          />
        </div>

        <div class="segmented" role="group" aria-label="Langue">
          <button [class.active]="lang.lang() === 'fr'" (click)="lang.setLang('fr')">FR</button>
          <button [class.active]="lang.lang() === 'en'" (click)="lang.setLang('en')">EN</button>
        </div>

        <div class="segmented" role="group" aria-label="Thème">
          <button [class.active]="theme.mode() === 'light'" (click)="theme.setMode('light')" [attr.aria-label]="lang.t('navbar.theme_light')">
            <span class="material-icons-outlined">light_mode</span>
          </button>
          <button [class.active]="theme.mode() === 'dark'" (click)="theme.setMode('dark')" [attr.aria-label]="lang.t('navbar.theme_dark')">
            <span class="material-icons-outlined">dark_mode</span>
          </button>
        </div>

        <div class="notif-wrap">
          <button class="icon-btn" type="button" (click)="showNotif = !showNotif" [attr.aria-label]="lang.t('navbar.notifications')">
            <span class="material-icons-outlined">notifications</span>
            <span class="badge" *ngIf="alerts.count() > 0">{{ alerts.count() }}</span>
          </button>

          <div class="notif-backdrop" *ngIf="showNotif" (click)="showNotif = false"></div>
          <section class="notif-panel" *ngIf="showNotif" role="dialog" [attr.aria-label]="lang.t('navbar.notifications')">
            <header>
              <h4>{{ lang.t('navbar.notifications') }}</h4>
            </header>
            <ul *ngIf="alerts.items().length; else emptyNotif">
              <li *ngFor="let doc of alerts.items()">
                <span class="material-icons-outlined warn">error_outline</span>
                <div>
                  <strong>{{ doc.name }}</strong>
                  <span>{{ doc.status }}</span>
                </div>
              </li>
            </ul>
            <ng-template #emptyNotif>
              <p class="notif-empty">{{ lang.t('navbar.no_notifications') }}</p>
            </ng-template>
          </section>
        </div>

        <app-user-avatar-menu />
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        position: relative;
        z-index: 100;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.85rem 1.25rem;
        border-radius: 20px;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        /* pas de background/backdrop-filter directement ici : ça transformerait
           .topbar en bloc de référence pour tout descendant position:fixed
           (le modal profil se retrouverait centré sur la topbar, pas sur
           l'écran). L'effet verre dépoli est isolé sur ::before à la place. */
        isolation: isolate;
      }
      .topbar::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 20px;
        background: var(--bg-elevated);
        backdrop-filter: blur(18px);
        z-index: -1;
      }
      .topbar__zone { display: flex; gap: 0.35rem; align-items: center; opacity: 0.9; }
      .topbar__zone img { border-radius: 3px; box-shadow: 0 0 0 1px var(--border); display: block; }
      .topbar__spacer { flex: 1; }
      .topbar__actions { display: flex; align-items: center; gap: 0.6rem; }
      .segmented { display: flex; gap: 0.2rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem; }
      .segmented button { border: 0; background: transparent; color: var(--muted); padding: 0.5rem 0.7rem; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; }
      .segmented button .material-icons-outlined { font-size: 1.1rem; }
      .segmented button.active { background: var(--accent); color: var(--bg); }
      .icon-btn { position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.03); color: var(--text); transition: background 0.2s ease; }
      .icon-btn:hover { background: rgba(61, 215, 198, 0.12); }
      .badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: var(--danger); color: #fff; font-size: 0.68rem; font-weight: 800; display: grid; place-items: center; }
      .notif-wrap { position: relative; }
      .notif-backdrop { position: fixed; inset: 0; z-index: 998; }
      .notif-panel { position: absolute; right: 0; top: calc(100% + 0.6rem); z-index: 999; width: 300px; max-height: 360px; overflow-y: auto; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 16px; padding: 0.9rem; box-shadow: var(--shadow); }
      .notif-panel header h4 { margin: 0 0 0.6rem; font-size: 0.95rem; }
      .notif-panel ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
      .notif-panel li { display: flex; gap: 0.6rem; padding: 0.5rem; border-radius: 10px; background: rgba(255, 255, 255, 0.03); }
      .notif-panel li div { display: flex; flex-direction: column; }
      .notif-panel li strong { font-size: 0.85rem; }
      .notif-panel li span { font-size: 0.75rem; color: var(--muted); }
      .warn { color: #ffb020; }
      .notif-empty { margin: 0; color: var(--muted); font-size: 0.85rem; text-align: center; padding: 1rem 0; }
    `,
  ],
})
export class TopNavbarComponent {
  readonly theme = inject(ThemeService);
  readonly lang = inject(LangService);
  readonly alerts = inject(AlertsService);
  readonly countries = CEMAC_COUNTRIES;
  showNotif = false;

  constructor() {
    this.alerts.refresh();
  }
}
