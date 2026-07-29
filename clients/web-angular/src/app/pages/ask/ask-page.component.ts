import { Component } from '@angular/core';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

interface ChatMsg { from: 'user'|'bot'; text: string }

@Component({
  selector: 'app-ask-page',
  standalone: true,
  imports: [LayoutShellComponent, FormsModule, CommonModule],
  template: `
    <app-layout-shell>
      <section class="page animate-in">
        <header class="hero card">
          <div>
            <p class="eyebrow">Assistant réglementaire</p>
            <h2>Posez votre question</h2>
            <p>Réponse sourcée (RAG) ou abstention explicite si le corpus ne couvre pas la question.</p>
          </div>
        </header>

        <section class="card chat-panel">
          <div class="messages">
            <div *ngFor="let m of msgs" class="message" [class.user]="m.from==='user'">
              <div class="bubble">{{m.text}}</div>
            </div>
          </div>
          <form class="composer" (ngSubmit)="send()">
            <input type="text" placeholder="Posez votre question..." [(ngModel)]="input" name="q" [disabled]="sending" />
            <button class="btn primary" type="submit" [disabled]="sending">Envoyer</button>
          </form>
        </section>
      </section>
    </app-layout-shell>
  `,
  styles: [
    `
      .chat-panel { display:flex; flex-direction:column; gap:0.6rem; padding:1rem; height:60vh; }
      .messages { overflow:auto; flex:1; display:flex; flex-direction:column; gap:0.5rem; }
      .message { display:flex; }
      .message .bubble { padding:0.6rem 0.9rem; border-radius:12px; background:rgba(255,255,255,0.03); max-width:70%; }
      .message.user { justify-content:flex-end; }
      .message.user .bubble { background:linear-gradient(135deg,var(--accent),var(--accent-strong)); color:var(--bg); }
      .composer { display:flex; gap:0.6rem; }
      input[type=text] { flex:1; padding:0.6rem; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text); }
      .btn.primary { border:0; border-radius:999px; padding:0.6rem 1.2rem; background:linear-gradient(135deg,var(--accent),var(--accent-strong)); color:var(--bg); font-weight:700; cursor:pointer; }
      .btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
    `,
  ],
})
export class AskPageComponent {
  msgs: ChatMsg[] = [ { from: 'bot', text: 'Bonjour — comment puis-je vous aider ?' } ];
  input = '';
  sending = false;

  constructor(private readonly auth: AuthService) {}

  async send() {
    if (!this.input.trim() || this.sending) return;
    const text = this.input.trim();
    this.msgs.push({ from: 'user', text });
    this.input = '';
    this.sending = true;
    const placeholderIndex = this.msgs.push({ from: 'bot', text: 'Recherche en cours...' }) - 1;

    try {
      const res = await this.auth.authFetch('/ask', { method: 'POST', body: JSON.stringify({ question: text }) });
      if (!res.ok) {
        this.msgs[placeholderIndex] = { from: 'bot', text: 'Erreur service IA (voir logs go-api).' };
        return;
      }
      const data = await res.json();
      if (data.answer) {
        const suffix = data.sources && data.sources.length ? ' · Sources: ' + data.sources.join(', ') : '';
        this.msgs[placeholderIndex] = { from: 'bot', text: data.answer + suffix };
      } else {
        this.msgs[placeholderIndex] = { from: 'bot', text: JSON.stringify(data) };
      }
    } catch (e) {
      console.error(e);
      this.msgs[placeholderIndex] = { from: 'bot', text: 'Erreur réseau vers l\'API.' };
    } finally {
      this.sending = false;
    }
  }
}
