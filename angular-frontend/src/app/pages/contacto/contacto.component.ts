import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css']
})
export class ContactoComponent {

  fb = inject(FormBuilder);

  form = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
  });

  enviado = false;
  cargando = false;
  hideButton = false;

enviar() {
  if (this.form.invalid) return;

  this.cargando = true;

  // Simulamos el envío
  setTimeout(() => {
    this.cargando = false;
    this.enviado = true;
    this.hideButton = true;

    setTimeout(() => {
      this.hideButton = false;
      this.enviado = false;
    }, 3000); // vuelve a mostrar el botón tras 3 segundos
  }, 1000); // simulamos tiempo de envío
}
}
