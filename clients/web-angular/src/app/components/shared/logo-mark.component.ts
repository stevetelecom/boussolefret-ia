import { Component, Input } from '@angular/core';

/**
 * Logo vectoriel "boussole" pour BoussoleFret IA — remplace le badge texte
 * "BF" brut. Une aiguille de boussole à 4 branches (thème "Boussole") posée
 * sur un fond dégradé aux couleurs de la marque. Un seul composant, utilisé
 * à la fois sur le login et dans la sidebar (tailles différentes via [size]),
 * pour ne jamais faire diverger le rendu entre les deux écrans.
 */
@Component({
  selector: 'app-logo-mark',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo BoussoleFret IA"
    >
      <defs>
        <linearGradient id="bf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3dd7c6" />
          <stop offset="1" stop-color="#22b4a8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#bf-grad)" />
      <g transform="translate(32,32)">
        <path d="M0,-21 L6.5,-2 L0,21 L-6.5,-2 Z" fill="#07111f" />
        <path d="M-21,0 L-2,-6.5 L21,0 L-2,6.5 Z" fill="#07111f" opacity="0.5" />
        <circle r="4.2" fill="#ffffff" />
      </g>
    </svg>
  `,
})
export class LogoMarkComponent {
  @Input() size = 48;
}
