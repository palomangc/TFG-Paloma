// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AdminPanelComponent } from './admin-panel/admin-panel.component';

// NOTA: NO incluir ni declarar AppComponent porque es standalone.
// Este módulo sirve para agrupar componentes no-standalone y módulos (HttpClientModule, FormsModule...).

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: 'admin', component: AdminPanelComponent },
    ])
  ],
  providers: []
})
export class AppModule {}
