import { Routes } from '@angular/router';
import { EstudioComponent } from '../app/pages/estudio/estudio.component';
import { TatuadorComponent } from '../app/pages/tatuador/tatuador.component';
import { PortfolioComponent } from '../app/pages/portfolio/portfolio.component';
import { ReservasComponent } from '../app/pages/reservas/reservas.component';
import { ContactoComponent } from '../app/pages/contacto/contacto.component';

export const routes: Routes = [
  { path: 'estudio', component: EstudioComponent },
  { path: 'tatuador', component: TatuadorComponent },
  { path: 'portfolio', component: PortfolioComponent },
  { path: 'reservas', component: ReservasComponent },
  { path: 'contacto', component: ContactoComponent },
  { path: '', redirectTo: '/', pathMatch: 'full' },
];