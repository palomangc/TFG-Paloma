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

  enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const datos = this.form.value;

    setTimeout(() => {
      this.cargando = false;
      this.enviado = true;
      this.form.reset();
    }, 1200);
  }
}
