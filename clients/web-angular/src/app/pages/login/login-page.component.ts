import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="auth-screen">
      <div class="auth-card card animate-in">
        <div class="auth-card__intro">
          <p class="eyebrow">Phase 1 · MVP</p>
          <h1>Accédez à votre copilote réglementaire</h1>
          <p>
            BoussoleFret IA aide les équipes conformité à répondre rapidement et avec sources aux questions du fret CEMAC.
          </p>
        </div>

        <form class="auth-form" (ngSubmit)="handleLogin()">
          <label>
            <span>Email</span>
            <input type="email" placeholder="agent@bureaufret.cm" [(ngModel)]="email" name="email" autocomplete="username" />
          </label>
          <label>
            <span>Mot de passe</span>
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

          <button type="submit" [disabled]="loading">{{ loading ? 'Connexion…' : 'Se connecter' }}</button>
          <p class="form-error" *ngIf="errorMessage">{{ errorMessage }}</p>
        </form>

        <div class="security-note">
          <span class="material-icons-outlined">lock</span>
          <p>Connexion protégée par jeton JWT ; journal d'audit prévu en phase 3.</p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .auth-screen {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
      }
      .auth-card {
        width: min(520px, 100%);
        padding: 2rem;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--accent);
        font-size: 0.78rem;
        margin-bottom: 0.55rem;
      }
      h1 { font-size: clamp(1.6rem, 3vw, 2.2rem); margin: 0 0 0.75rem; }
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
        position: absolute;
        right: 0.6rem;
        background: transparent;
        border: 0;
        color: var(--muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0.3rem;
        border-radius: 8px;
      }
      .icon-toggle:hover { color: var(--text); background: rgba(255,255,255,0.06); }
      .auth-form button[type="submit"] {
        margin-top: 0.5rem;
        border: 0;
        border-radius: 999px;
        padding: 0.9rem 1rem;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: var(--bg);
        font-weight: 700;
        cursor: pointer;
      }
      .auth-form button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
      .form-error { color: #ff8f8f; margin: 0; font-size: 0.9rem; }
      .security-note {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
        color: var(--muted);
      }
      @media (max-width: 640px) { .auth-card { padding: 1.25rem; } }
    `,
  ],
})
export class LoginPageComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(private readonly router: Router, private readonly auth: AuthService) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async handleLogin(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    try {
      const ok = await this.auth.login(this.email, this.password);
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Identifiants invalides.';
      }
    } finally {
      this.loading = false;
    }
  }
}
