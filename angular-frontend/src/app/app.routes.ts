import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ContactoComponent } from './pages/contacto/contacto.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'estudio', component: HomeComponent, data: { fragment: 'estudio' } },
  { path: 'tatuador', component: HomeComponent, data: { fragment: 'tatuador' } },
  { path: 'portfolio', component: HomeComponent, data: { fragment: 'portfolio' } },
  { path: 'reservas', component: HomeComponent, data: { fragment: 'reservas' } },
  { path: 'contacto', component: ContactoComponent, data: { fragment: 'contacto' } },
   { path: 'admin', component: AdminPanelComponent }
];