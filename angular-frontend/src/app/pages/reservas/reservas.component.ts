import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

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

    this.form.get('time')?.disable();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  loadSlots() {
    const date = this.form.get('date')?.value;
    const service = this.form.get('service')?.value;
    const timeControl = this.form.get('time');

    if (!date || !service) {
      this.slots = [];
      timeControl?.disable();
      timeControl?.setValue('');
      return;
    }

    const formattedDate = typeof date === 'string'
      ? date
      : (date instanceof Date ? date.toISOString().slice(0, 10) : String(date));

    const params = new HttpParams()
      .set('date', formattedDate)
      .set('service', service);

    this.loading = true;

    this.http.get('http://localhost:8000/api/availability', { params, responseType: 'text' })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (rawText: string) => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            parsed = null;
          }

          if (Array.isArray(parsed)) {
            this.slots = parsed;
          } else if (parsed && Array.isArray(parsed.slots)) {
            this.slots = parsed.slots;
          } else if (parsed && Array.isArray(parsed.data)) {
            this.slots = parsed.data;
          } else {
            this.slots = [];
          }

          if (this.slots.length > 0) {
            timeControl?.enable();
          } else {
            timeControl?.disable();
            timeControl?.setValue('');
          }
        },
        error: () => {
          this.slots = [];
          timeControl?.disable();
          timeControl?.setValue('');
        }
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

    interface ReservationResponse {
      payUrl?: string;
      message?: string;
    }

    this.loading = true;
    this.message = '';

    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = true;

    this.http.post<ReservationResponse>('http://localhost:8000/api/reservations', formData)
      .pipe(finalize(() => {
        this.loading = false;
        if (submitBtn) submitBtn.disabled = false;
      }))
      .subscribe({
        next: (res) => {
          if (res.payUrl) {
            window.location.href = res.payUrl;
            return;
          }

          this.message = res.message ?? 'Reserva creada correctamente. Espera confirmación del estudio.';

          this.form.reset({
            service: 'standard', date: '', time: '', name: '', email: '', phone: '', privacy: false, policy: false
          });

          this.selectedFile = null;
          this.slots = [];
          this.form.get('time')?.disable();

          const formMsg = document.getElementById('formMsg');
          if (formMsg) {
            formMsg.classList.remove('sr-only');
            formMsg.textContent = this.message;
          }
        },
        error: (err: any) => {
          let serverMsg: string | undefined;
          if (err?.error) {
            if (typeof err.error === 'string') serverMsg = err.error;
            else if (typeof err.error === 'object') serverMsg = err.error.message || err.error.error || JSON.stringify(err.error);
          }
          serverMsg = serverMsg ?? err?.message ?? 'Error al crear la reserva.';

          if (err?.status === 409) {
            this.message = serverMsg || 'La franja seleccionada ya no está disponible. Por favor, elige otra hora.';
            this.loadSlots();
          } else if (err?.status === 400) {
            this.message = serverMsg || 'Datos inválidos. Revisa el formulario.';
          } else {
            this.message = serverMsg || 'Error al crear la reserva. Intenta de nuevo más tarde.';
          }

          const formMsg = document.getElementById('formMsg');
          if (formMsg) {
            formMsg.classList.remove('sr-only');
            formMsg.textContent = this.message;
          }
        }
      });
  }
}
