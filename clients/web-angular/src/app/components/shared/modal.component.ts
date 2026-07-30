import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="show" (click)="onCancel()"></div>
    <section class="modal" *ngIf="show" role="dialog" aria-modal="true">
      <header class="modal__header">
        <h3>{{ title }}</h3>
        <button class="icon-btn" (click)="onCancel()" aria-label="Close">
          <span class="material-icons-outlined">close</span>
        </button>
      </header>
      <div class="modal__body">
        <ng-content></ng-content>
      </div>
      <footer class="modal__footer">
        <button class="btn" (click)="onCancel()">Annuler</button>
        <button class="btn primary" (click)="onSave()">Enregistrer</button>
      </footer>
    </section>
  `,
  styles: [
    `
      .modal-backdrop { position: fixed; inset: 0; background: rgba(2,8,23,0.6); z-index: 2000; animation: bf-modal-fade 0.18s ease; }
      .modal { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2001; width: min(760px, 96%); background: var(--bg-elevated); border-radius: 12px; padding: 1rem; box-shadow: var(--shadow); animation: bf-modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes bf-modal-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bf-modal-pop {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .modal__header { display:flex; justify-content:space-between; align-items:center; }
      .modal__body { margin-top: 0.8rem; }
      .modal__footer { display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1rem; }
      .btn { padding:0.6rem 0.9rem; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text); }
      .btn.primary { background:linear-gradient(135deg,var(--accent),var(--accent-strong)); color:var(--bg); border:0; }
      .icon-btn { background:transparent; border:0; color:var(--muted); cursor:pointer; }
    `,
  ],
})
export class ModalComponent {
  @Input() title = '';
  @Input() show = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  onCancel() {
    this.show = false;
    this.showChange.emit(false);
    this.close.emit();
  }

  onSave() { this.save.emit(); }
}
