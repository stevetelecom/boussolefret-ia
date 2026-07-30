import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

interface Profile {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  tenant_id: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin_corpus: 'Administrateur corpus',
  responsable_conformite: 'Responsable conformité',
  agent: 'Agent',
  chargeur: 'Chargeur',
};

/**
 * Avatar de l'utilisateur connecté, affiché dans la barre latérale. Un clic
 * ouvre un modal pour consulter / modifier son propre profil (nom, email,
 * téléphone) et changer son mot de passe — deux actions distinctes, chacune
 * avec son propre bouton "Enregistrer" et ses propres erreurs, plutôt qu'un
 * unique formulaire géant.
 */
@Component({
  selector: 'app-user-avatar-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="user-card" (click)="openModal()" [disabled]="!profile" aria-haspopup="dialog">
      <span class="avatar">{{ initials }}</span>
      <span class="user-card__text" *ngIf="profile">
        <strong>{{ profile.full_name || profile.email }}</strong>
        <span>{{ roleLabel }}</span>
      </span>
      <span class="user-card__text" *ngIf="!profile">
        <strong>Profil</strong>
        <span>Chargement…</span>
      </span>
    </button>

    <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()"></div>
    <section class="modal" *ngIf="showModal" role="dialog" aria-modal="true" aria-label="Mon profil">
      <header class="modal__header">
        <h3>Mon profil</h3>
        <button class="icon-btn" (click)="closeModal()" aria-label="Fermer">
          <span class="material-icons-outlined">close</span>
        </button>
      </header>

      <div class="modal__body" *ngIf="profile">
        <section class="profile-section">
          <h4>
            <span class="material-icons-outlined">badge</span>
            Informations
          </h4>
          <label>
            <span>Nom complet</span>
            <input type="text" [(ngModel)]="profileForm.full_name" name="full_name" maxlength="255" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" [(ngModel)]="profileForm.email" name="email" maxlength="255" />
          </label>
          <label>
            <span>Téléphone</span>
            <input type="tel" [(ngModel)]="profileForm.phone" name="phone" maxlength="30" placeholder="+237 6xx xx xx xx" />
          </label>
          <p class="feedback error" *ngIf="profileError">{{ profileError }}</p>
          <p class="feedback success" *ngIf="profileSuccess">{{ profileSuccess }}</p>
          <button class="btn primary" (click)="saveProfile()" [disabled]="savingProfile">
            {{ savingProfile ? 'Enregistrement…' : 'Enregistrer les informations' }}
          </button>
        </section>

        <hr />

        <section class="profile-section">
          <h4>
            <span class="material-icons-outlined">lock</span>
            Sécurité
          </h4>
          <label>
            <span>Mot de passe actuel</span>
            <div class="password-field">
              <input
                [type]="showCurrentPwd ? 'text' : 'password'"
                [(ngModel)]="passwordForm.current"
                name="currentPassword"
                autocomplete="current-password"
              />
              <button type="button" class="icon-toggle" (click)="showCurrentPwd = !showCurrentPwd"
                [attr.aria-label]="showCurrentPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <span class="material-icons-outlined">{{ showCurrentPwd ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </label>
          <label>
            <span>Nouveau mot de passe</span>
            <div class="password-field">
              <input
                [type]="showNewPwd ? 'text' : 'password'"
                [(ngModel)]="passwordForm.next"
                name="newPassword"
                autocomplete="new-password"
              />
              <button type="button" class="icon-toggle" (click)="showNewPwd = !showNewPwd"
                [attr.aria-label]="showNewPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <span class="material-icons-outlined">{{ showNewPwd ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </label>
          <label>
            <span>Confirmer le nouveau mot de passe</span>
            <div class="password-field">
              <input
                [type]="showConfirmPwd ? 'text' : 'password'"
                [(ngModel)]="passwordForm.confirm"
                name="confirmPassword"
                autocomplete="new-password"
              />
              <button type="button" class="icon-toggle" (click)="showConfirmPwd = !showConfirmPwd"
                [attr.aria-label]="showConfirmPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <span class="material-icons-outlined">{{ showConfirmPwd ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </label>
          <p class="feedback error" *ngIf="passwordError">{{ passwordError }}</p>
          <p class="feedback success" *ngIf="passwordSuccess">{{ passwordSuccess }}</p>
          <button class="btn" (click)="savePassword()" [disabled]="savingPassword">
            {{ savingPassword ? 'Enregistrement…' : 'Changer le mot de passe' }}
          </button>
        </section>
      </div>

      <div class="modal__body" *ngIf="!profile">
        <p class="feedback error" *ngIf="loadError">{{ loadError }}</p>
        <p *ngIf="!loadError">Chargement du profil…</p>
      </div>
    </section>
  `,
  styles: [
    `
      .user-card {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        width: 100%;
        padding: 0.6rem;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.03);
        color: var(--text);
        cursor: pointer;
        text-align: left;
        transition: background 0.2s ease;
      }
      .user-card:hover { background: rgba(61, 215, 198, 0.1); }
      .user-card:disabled { cursor: default; opacity: 0.7; }
      .avatar {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: var(--bg);
        font-weight: 800;
        font-size: 0.9rem;
      }
      .user-card__text { display: flex; flex-direction: column; min-width: 0; }
      .user-card__text strong { font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .user-card__text span { font-size: 0.78rem; color: var(--muted); }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(2, 8, 23, 0.6); z-index: 998; animation: bf-modal-fade 0.18s ease; }
      .modal {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 999;
        width: min(480px, 94%);
        max-height: 88vh;
        overflow-y: auto;
        background: var(--bg-elevated);
        border-radius: 16px;
        padding: 1.2rem;
        box-shadow: var(--shadow);
        animation: bf-modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes bf-modal-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bf-modal-pop {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .modal__header { display: flex; justify-content: space-between; align-items: center; }
      .modal__header h3 { margin: 0; }
      .icon-btn { background: transparent; border: 0; color: var(--muted); cursor: pointer; display: flex; }
      .modal__body { margin-top: 0.9rem; display: flex; flex-direction: column; gap: 1rem; }
      .profile-section { display: flex; flex-direction: column; gap: 0.6rem; }
      .profile-section h4 { display: flex; align-items: center; gap: 0.4rem; margin: 0 0 0.2rem; font-size: 0.95rem; color: var(--muted); }
      .profile-section label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.88rem; color: var(--muted); }
      .profile-section input {
        padding: 0.65rem 0.8rem;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.03);
        color: var(--text);
        box-sizing: border-box;
        width: 100%;
      }
      .password-field { position: relative; display: flex; align-items: center; }
      .password-field input { padding-right: 2.6rem; }
      .icon-toggle {
        position: absolute;
        right: 0.5rem;
        background: transparent;
        border: 0;
        color: var(--muted);
        cursor: pointer;
        display: flex;
        align-items: center;
      }
      hr { border: none; border-top: 1px solid var(--border); margin: 0; }
      .btn {
        align-self: flex-start;
        padding: 0.6rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text);
        cursor: pointer;
        font-weight: 600;
      }
      .btn.primary { background: linear-gradient(135deg, var(--accent), var(--accent-strong)); color: var(--bg); border: 0; }
      .btn:disabled { opacity: 0.6; cursor: default; }
      .feedback { margin: 0; font-size: 0.85rem; }
      .feedback.error { color: #ff8f8f; }
      .feedback.success { color: #2ed573; }
    `,
  ],
})
export class UserAvatarMenuComponent implements OnInit {
  profile: Profile | null = null;
  profileForm = { full_name: '', email: '', phone: '' };
  passwordForm = { current: '', next: '', confirm: '' };

  showModal = false;
  loadError = '';

  profileError = '';
  profileSuccess = '';
  savingProfile = false;

  passwordError = '';
  passwordSuccess = '';
  savingPassword = false;

  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  constructor(private readonly auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      const res = await this.auth.authFetch('/me');
      if (!res.ok) {
        this.loadError = 'Impossible de charger le profil.';
        return;
      }
      this.profile = await res.json();
      this.profileForm = {
        full_name: this.profile!.full_name,
        email: this.profile!.email,
        phone: this.profile!.phone,
      };
      this.loadError = '';
    } catch (e) {
      console.error('loadProfile error', e);
      this.loadError = 'Erreur réseau lors du chargement du profil.';
    }
  }

  get initials(): string {
    const source = this.profile?.full_name || this.profile?.email || '';
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  get roleLabel(): string {
    if (!this.profile) return '';
    return ROLE_LABELS[this.profile.role] || this.profile.role;
  }

  openModal(): void {
    if (!this.profile) return;
    this.profileError = '';
    this.profileSuccess = '';
    this.passwordError = '';
    this.passwordSuccess = '';
    this.passwordForm = { current: '', next: '', confirm: '' };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  async saveProfile(): Promise<void> {
    const fullName = this.profileForm.full_name.trim();
    const email = this.profileForm.email.trim();
    const phone = this.profileForm.phone.trim();

    this.profileError = '';
    this.profileSuccess = '';

    if (!fullName) {
      this.profileError = 'Le nom complet est obligatoire.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.profileError = 'Email invalide.';
      return;
    }

    this.savingProfile = true;
    try {
      const res = await this.auth.authFetch('/me', {
        method: 'PUT',
        body: JSON.stringify({ full_name: fullName, email, phone }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.profileError = body.error || 'Impossible de mettre à jour le profil.';
        return;
      }
      if (body.token) {
        // L'email a changé : le backend a réémis un jeton, on le prend en
        // compte sans forcer une reconnexion.
        this.auth.setToken(body.token);
      }
      this.profile = { ...this.profile!, full_name: fullName, email, phone };
      this.profileSuccess = 'Profil mis à jour.';
    } catch (e) {
      console.error('saveProfile error', e);
      this.profileError = 'Erreur réseau.';
    } finally {
      this.savingProfile = false;
    }
  }

  async savePassword(): Promise<void> {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordForm.next.length < 8) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.passwordForm.next !== this.passwordForm.confirm) {
      this.passwordError = 'La confirmation ne correspond pas au nouveau mot de passe.';
      return;
    }

    this.savingPassword = true;
    try {
      const res = await this.auth.authFetch('/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: this.passwordForm.current,
          new_password: this.passwordForm.next,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.passwordError = body.error || 'Impossible de changer le mot de passe.';
        return;
      }
      this.passwordForm = { current: '', next: '', confirm: '' };
      this.passwordSuccess = 'Mot de passe modifié.';
    } catch (e) {
      console.error('savePassword error', e);
      this.passwordError = 'Erreur réseau.';
    } finally {
      this.savingPassword = false;
    }
  }
}
