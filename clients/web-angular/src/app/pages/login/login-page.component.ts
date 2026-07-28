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
            <input type="email" placeholder="agent@bureaufret.cm" [(ngModel)]="email" name="email" />
          </label>
          <label>
            <span>Mot de passe</span>
            <input type="password" placeholder="••••••••" [(ngModel)]="password" name="password" />
          </label>

          <button type="submit">Se connecter</button>
        </form>

        <div class="security-note">
          <span>🔐</span>
          <p>Connexion protégée avec contrôle d’accès et journal d’audit prévu en phase 1.</p>
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
        padding: 0.9rem 1rem;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
        color: var(--text);
      }
      .auth-form button {
        margin-top: 0.5rem;
        border: 0;
        border-radius: 999px;
        padding: 0.9rem 1rem;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: var(--bg);
        font-weight: 700;
      }
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

  constructor(private readonly router: Router, private readonly auth: AuthService) {}

  async handleLogin(): Promise<void> {
    const ok = await this.auth.login(this.email, this.password);
    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      alert('Identifiants invalides');
    }
  }
}
