import { Component } from '@angular/core';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
            <p>Le système répondra avec des sources (phase 1 : mock ou proxy vers `ai-service`).</p>
          </div>
        </header>

        <section class="card chat-panel">
          <div class="messages">
            <div *ngFor="let m of msgs" class="message" [class.user]="m.from==='user'">
              <div class="bubble">{{m.text}}</div>
            </div>
          </div>
          <form class="composer" (ngSubmit)="send()">
            <input type="text" placeholder="Posez votre question..." [(ngModel)]="input" name="q" />
            <button class="btn primary" type="submit">Envoyer</button>
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
    `,
  ],
})
export class AskPageComponent {
  msgs: ChatMsg[] = [ { from: 'bot', text: 'Bonjour — comment puis-je vous aider ?' } ];
  input = '';
  private apiBase = 'http://localhost:8080';

  async send() {
    if (!this.input.trim()) return;
    const text = this.input.trim();
    this.msgs.push({ from: 'user', text });
    this.input = '';
    this.msgs.push({ from: 'bot', text: 'Recherche en cours...' });
    try {
      const res = await fetch(`${this.apiBase}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text }) });
      if (!res.ok) {
        this.msgs.push({ from: 'bot', text: 'Erreur service IA' });
        return;
      }
      const data = await res.json();
      // adapt to ai-service response shape
      if (data.answer) {
        this.msgs.push({ from: 'bot', text: data.answer + (data.sources ? ' · Sources: ' + data.sources.join(', ') : '') });
      } else {
        this.msgs.push({ from: 'bot', text: JSON.stringify(data) });
      }
    } catch (e) {
      console.error(e);
      this.msgs.push({ from: 'bot', text: 'Erreur réseau vers AI' });
    }
  }
}
