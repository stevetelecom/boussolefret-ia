import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/toast.service';

/**
 * Pile de notifications toast, empilées en bas à droite. Icônes Material
 * (pas d'emoji, cf. consigne front) : check_circle (succès), error_outline
 * (échec), info (information neutre).
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      <div class="toast" *ngFor="let t of toast.toasts()" [class]="'toast--' + t.type">
        <span class="material-icons-outlined toast__icon">{{ iconFor(t.type) }}</span>
        <p class="toast__text">{{ t.text }}</p>
        <button class="toast__close" type="button" (click)="toast.dismiss(t.id)" aria-label="Fermer">
          <span class="material-icons-outlined">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        right: 1.25rem;
        bottom: 1.25rem;
        z-index: 1200;
        display: flex;
        flex-direction: column-reverse;
        gap: 0.6rem;
        max-width: min(360px, calc(100vw - 2.5rem));
      }
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.85rem 0.9rem;
        border-radius: 14px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-left: 4px solid var(--accent);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
        animation: bf-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .toast--success { border-left-color: #2ed573; }
      .toast--error { border-left-color: var(--danger); }
      .toast--info { border-left-color: var(--accent); }
      .toast__icon { flex: none; margin-top: 0.05rem; }
      .toast--success .toast__icon { color: #2ed573; }
      .toast--error .toast__icon { color: var(--danger); }
      .toast--info .toast__icon { color: var(--accent); }
      .toast__text { flex: 1; margin: 0; font-size: 0.88rem; line-height: 1.4; color: var(--text); }
      .toast__close {
        flex: none;
        background: transparent;
        border: 0;
        color: var(--muted);
        cursor: pointer;
        display: flex;
        padding: 0.1rem;
        border-radius: 6px;
      }
      .toast__close:hover { color: var(--text); background: rgba(255, 255, 255, 0.06); }
      .toast__close .material-icons-outlined { font-size: 1.05rem; }
      @keyframes bf-toast-in {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (max-width: 640px) {
        .toast-stack { left: 1rem; right: 1rem; max-width: none; }
      }
    `,
  ],
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
  iconFor(type: string): string {
    if (type === 'success') return 'check_circle';
    if (type === 'error') return 'error_outline';
    return 'info';
  }
}
