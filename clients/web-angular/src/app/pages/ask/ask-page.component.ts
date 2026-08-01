import { Component, inject } from '@angular/core';
import { LayoutShellComponent } from '../../components/shared/layout-shell.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { LangService } from '../../core/lang.service';

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
            <p class="eyebrow">{{ lang.t('ask.eyebrow') }}</p>
            <h2>{{ lang.t('ask.title') }}</h2>
            <p>{{ lang.t('ask.subtitle') }}</p>
          </div>
        </header>

        <section class="card chat-panel">
          <div class="messages">
            <div *ngFor="let m of msgs" class="message" [class.user]="m.from==='user'">
              <div class="bubble">{{m.text}}</div>
            </div>
          </div>
          <form class="composer" (ngSubmit)="send()">
            <input type="text" [placeholder]="lang.t('ask.placeholder')" [(ngModel)]="input" name="q" [disabled]="sending" />
            <button class="btn primary" type="submit" [disabled]="sending">{{ lang.t('ask.send') }}</button>
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
  readonly lang = inject(LangService);

  msgs: ChatMsg[] = [ { from: 'bot', text: this.lang.t('ask.greeting') } ];
  input = '';
  sending = false;

  constructor(private readonly auth: AuthService) {}

  async send() {
    if (!this.input.trim() || this.sending) return;
    const text = this.input.trim();
    this.msgs.push({ from: 'user', text });
    this.input = '';
    this.sending = true;
    const placeholderIndex = this.msgs.push({ from: 'bot', text: this.lang.t('ask.searching') }) - 1;

    try {
      const res = await this.auth.authFetch('/ask', { method: 'POST', body: JSON.stringify({ question: text }) });
      if (!res.ok) {
        let reason = '';
        try {
          const body = await res.json();
          reason = typeof body?.error === 'string' ? body.error : '';
        } catch {
          // corps de réponse non-JSON : on retombe sur le message générique
        }
        this.msgs[placeholderIndex] = {
          from: 'bot',
          text: reason ? this.lang.t('ask.err_service_detail', { reason }) : this.lang.t('ask.err_service'),
        };
        return;
      }
      const data = await res.json();
      if (data.answer) {
        const suffix = data.sources && data.sources.length ? this.lang.t('ask.sources_prefix') + data.sources.join(', ') : '';
        this.msgs[placeholderIndex] = { from: 'bot', text: data.answer + suffix };
      } else {
        this.msgs[placeholderIndex] = { from: 'bot', text: JSON.stringify(data) };
      }
    } catch (e) {
      console.error(e);
      this.msgs[placeholderIndex] = { from: 'bot', text: this.lang.t('ask.err_network') };
    } finally {
      this.sending = false;
    }
  }
}
