import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

type AvailabilityResponse = string[];

@Component({
  standalone: true,
  selector: 'app-reservas',
  templateUrl: './reservas.component.html',
  imports: [CommonModule, ReactiveFormsModule]
})
export class ReservasComponent implements OnInit {

  form!: FormGroup;
  slots: string[] = [];
  loading = false;
  message = '';
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      service: ['standard', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      privacy: [false, Validators.requiredTrue],
      policy: [false, Validators.requiredTrue],
    });
  }

  // --- ARCHIVO ---
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  // --- CARGAR FRANJAS DISPONIBLES ---
  loadSlots() {
    const { date, service } = this.form.value;

    if (!date || !service) {
      this.slots = [];
      return;
    }

    const params = new HttpParams()
      .set('date', date)
      .set('service', service);

    this.http.get<AvailabilityResponse>('/api/availability', { params })
      .subscribe({
        next: slots => this.slots = slots,
        error: () => this.slots = []
      });
  }

  // --- SUBMIT ---
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message = 'Revisa los campos del formulario.';
      return;
    }

    const formData = new FormData();

    Object.entries(this.form.value).forEach(([key, value]) => {
      formData.append(key, value as any);
    });

    if (this.selectedFile) {
      formData.append('reference', this.selectedFile);
    }

    this.loading = true;
    this.message = '';

    this.http.post<any>('/api/reservations', formData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: res => {
          if (res.payUrl) {
            window.location.href = res.payUrl;
          } else {
            this.message = 'Reserva creada correctamente. Espera confirmación del estudio.';
          }
        },
        error: () => {
          this.message = 'Error al crear la reserva.';
        }
      });
  }
}
