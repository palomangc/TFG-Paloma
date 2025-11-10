import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';  // Importa RouterModule para router-outlet

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],    // IMPORTANTE: importar RouterModule aquí para usar router-outlet
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']  // CORRECTO: plural y array
})
export class AppComponent {
  title = 'angular-frontend';
}
