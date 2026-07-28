import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login/login-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { DocumentsPageComponent } from './pages/documents/documents-page.component';
import { AskPageComponent } from './pages/ask/ask-page.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginPageComponent,
    title: 'Connexion · BoussoleFret IA',
  },
  {
    path: 'dashboard',
    component: DashboardPageComponent,
    canActivate: [authGuard],
    title: 'Tableau de bord · BoussoleFret IA',
  },
  {
    path: 'documents',
    component: DocumentsPageComponent,
    canActivate: [authGuard],
    title: 'Documents · BoussoleFret IA',
  },
  {
    path: 'ask',
    component: AskPageComponent,
    canActivate: [authGuard],
    title: 'Ask · BoussoleFret IA',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
