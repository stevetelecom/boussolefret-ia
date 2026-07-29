import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { I18nService, Lang } from '../../core/i18n.service';
import { LogoMarkComponent } from '../../components/shared/logo-mark.component';

interface DemoAccount {
  label: string;
  email: string;
  password: string;
  icon: string;
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoMarkComponent],
  template: `
    <section class="auth-screen">
      <div class="auth-panel">
        <div class="auth-card card animate-in">
          <app-logo-mark [size]="56" />
          <div class="auth-card__intro">
            <p class="eyebrow">{{ i18n.t('eyebrow') }}</p>
            <h1>{{ i18n.t('loginTitle') }}</h1>
            <p>{{ i18n.t('loginSubtitle') }}</p>
          </div>

          <form class="auth-form" (ngSubmit)="handleLogin()">
            <label>
              <span>{{ i18n.t('email') }}</span>
              <input type="email" placeholder="agent@bgft.cm" [(ngModel)]="email" name="email" autocomplete="username" />
            </label>
            <label>
              <span>{{ i18n.t('password') }}</span>
              <div class="password-field">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  [(ngModel)]="password"
                  name="password"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="icon-toggle"
                  (click)="togglePassword()"
                  [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                >
                  <span class="material-icons-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </label>

            <button type="submit" [disabled]="loading">
              {{ loading ? i18n.t('loggingIn') : i18n.t('loginButton') }}
            </button>
            <p class="form-error" *ngIf="errorMessage">{{ errorMessage }}</p>
          </form>

          <div class="demo-accounts">
            <p class="demo-accounts__title">{{ i18n.t('demoAccounts') }}</p>
            <div class="demo-accounts__grid">
              <button
                type="button"
                class="demo-btn"
                *ngFor="let acc of demoAccounts"
                (click)="quickLogin(acc)"
                [disabled]="loading"
              >
                <span class="material-icons-outlined">{{ acc.icon }}</span>
                {{ acc.label }}
              </button>
            </div>
          </div>

          <div class="security-note">
            <span class="material-icons-outlined">lock</span>
            <p>{{ i18n.t('securityNote') }}</p>
          </div>
        </div>
      </div>

      <div class="hero-panel">
        <video class="hero-video" autoplay loop muted playsinline
          poster="https://images.pexels.com/videos/17899033/pexels-photo-17899033.jpeg?auto=compress&cs=tinysrgb&h=900&fit=crop&w=1600">
          <source src="https://videos.pexels.com/video-files/17899033/17899033-hd_1920_1080_24fps.mp4" type="video/mp4" />
        </video>
        <div class="hero-overlay"></div>

        <div class="lang-toggle">
          <button [class.active]="i18n.lang() === 'fr'" (click)="setLang('fr')">FR</button>
          <button [class.active]="i18n.lang() === 'en'" (click)="setLang('en')">EN</button>
        </div>

        <div class="hero-copy">
          <h2>{{ i18n.t('heroTitle') }}</h2>
          <p>{{ i18n.t('heroSubtitle') }}</p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .auth-screen {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(360px, 480px) 1fr;
      }
      .auth-panel {
        display: grid;
        place-items: center;
        padding: 1.5rem;
      }
      .auth-card { width: min(460px, 100%); padding: 2rem; }
      app-logo-mark { display: block; margin-bottom: 1rem; }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--accent);
        font-size: 0.78rem;
        margin-bottom: 0.55rem;
      }
      h1 { font-size: clamp(1.4rem, 2.4vw, 1.9rem); margin: 0 0 0.75rem; }
      .auth-card__intro p { color: var(--muted); line-height: 1.6; }
      .auth-form { display: flex; flex-direction: column; gap: 0.9rem; margin-top: 1.3rem; }
      .auth-form label { display: flex; flex-direction: column; gap: 0.45rem; color: var(--muted); }
      .auth-form input {
        width: 100%;
        padding: 0.9rem 1rem;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
        color: var(--text);
        box-sizing: border-box;
      }
      .password-field { position: relative; display: flex; align-items: center; }
      .password-field input { padding-right: 2.8rem; }
      .icon-toggle {
        position: absolute; right: 0.6rem;
        background: transparent; border: 0; color: var(--muted);
        cursor: pointer; display: flex; align-items: center;
        padding: 0.3rem; border-radius: 8px;
      }
      .icon-toggle:hover { color: var(--text); background: rgba(255,255,255,0.06); }
      .auth-form button[type="submit"] {
        margin-top: 0.5rem; border: 0; border-radius: 999px;
        padding: 0.9rem 1rem;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: var(--bg); font-weight: 700; cursor: pointer;
      }
      .auth-form button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
      .form-error { color: #ff8f8f; margin: 0; font-size: 0.9rem; }

      .demo-accounts { margin-top: 1.4rem; padding-top: 1.2rem; border-top: 1px solid var(--border); }
      .demo-accounts__title {
        text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem;
        color: var(--muted); margin: 0 0 0.7rem;
      }
      .demo-accounts__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
      .demo-btn {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.65rem 0.7rem; border-radius: 12px;
        border: 1px solid var(--border); background: rgba(255,255,255,0.02);
        color: var(--text); cursor: pointer; font-size: 0.85rem; text-align: left;
      }
      .demo-btn:hover { background: rgba(61, 215, 198, 0.1); border-color: var(--accent); }
      .demo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .demo-btn .material-icons-outlined { font-size: 1.1rem; color: var(--accent); }

      .security-note {
        display: flex; align-items: flex-start; gap: 0.7rem;
        margin-top: 1.2rem; padding-top: 1rem;
        border-top: 1px solid var(--border); color: var(--muted);
      }

      .hero-panel {
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .hero-video {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        object-fit: cover;
      }
      .hero-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(11,15,20,0.35) 0%, rgba(11,15,20,0.75) 100%);
      }
      .lang-toggle {
        position: relative; z-index: 2;
        align-self: flex-end;
        display: flex; gap: 0.4rem;
        margin: 1.25rem;
        background: rgba(11,15,20,0.55);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px; padding: 0.25rem;
      }
      .lang-toggle button {
        border: 0; background: transparent; color: rgba(255,255,255,0.7);
        padding: 0.4rem 0.85rem; border-radius: 999px; cursor: pointer; font-weight: 600;
      }
      .lang-toggle button.active { background: var(--accent); color: var(--bg); }
      .hero-copy {
        position: relative; z-index: 2;
        color: #fff; padding: 2rem;
      }
      .hero-copy h2 { font-size: clamp(1.3rem, 2.4vw, 1.9rem); margin: 0 0 0.5rem; }
      .hero-copy p { margin: 0; color: rgba(255,255,255,0.85); line-height: 1.6; max-width: 42ch; }

      @media (max-width: 900px) {
        .auth-screen { grid-template-columns: 1fr; }
        .hero-panel { min-height: 260px; order: -1; }
      }
      @media (max-width: 640px) {
        .auth-card { padding: 1.25rem; }
        .demo-accounts__grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class LoginPageComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  demoAccounts: DemoAccount[] = [
    { label: 'Administrateur corpus', email: 'admin@bgft.cm', password: 'Demo2026!', icon: 'admin_panel_settings' },
    { label: 'Responsable conformité', email: 'conformite@bgft.cm', password: 'Demo2026!', icon: 'verified_user' },
    { label: 'Agent bureau (BGFT)', email: 'agent@bgft.cm', password: 'Demo2026!', icon: 'support_agent' },
    { label: 'Chargeur', email: 'chargeur@bgft.cm', password: 'Demo2026!', icon: 'local_shipping' },
  ];

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
    readonly i18n: I18nService,
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  async quickLogin(acc: DemoAccount): Promise<void> {
    this.email = acc.email;
    this.password = acc.password;
    await this.handleLogin();
  }

  async handleLogin(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    try {
      const ok = await this.auth.login(this.email, this.password);
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = this.i18n.t('invalidCreds');
      }
    } finally {
      this.loading = false;
    }
  }
}
