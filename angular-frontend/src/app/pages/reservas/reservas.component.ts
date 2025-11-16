import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-reservas',
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.css'],
  imports: [CommonModule, FormsModule]
})
export class ReservasComponent {
  nombre: string = '';
  email: string = '';
  mensaje: string = '';

  enviarReserva() {
    console.log('Reserva enviada:', this.nombre, this.email, this.mensaje);
    alert('Tu solicitud ha sido enviada. El estudio te contactará para confirmar la cita.');
    this.nombre = '';
    this.email = '';
    this.mensaje = '';
  }
}
