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

  // NUEVAS VARIABLES PARA EL LOADING TEMPORAL
  enviado = false;            // controla el mensaje "¡Enviado correctamente!"
  loadingTemp = false;        // controla el mensaje "Enviando..."
  hideButton = false;         // controla si se oculta el botón
  loadingTempDuration = 2000; // duración del mensaje "Enviando..."
  showButtonDelay = 3000;  

  calendarDays: Array<{
    date: Date,
    dateNum: number,
    isCurrentMonth: boolean,
    count: number | null,
    status: 'none' | 'few' | 'many' | 'available'
  }> = [];

  displayMonth = 0;
  displayYear = 0;
  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  calendarMonthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  fewThreshold = 4;
  manyThreshold = 5;

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

    const now = new Date();
    this.displayMonth = now.getMonth();
    this.displayYear = now.getFullYear();
    this.buildCalendar(this.displayYear, this.displayMonth);
  }

  onServiceChange(eventOrValue: Event | string) {
    let newService: string | null = null;

    if (typeof eventOrValue === 'string') {
      newService = eventOrValue;
    } else if (eventOrValue && (eventOrValue as Event).target) {
      const target = (eventOrValue as Event).target as HTMLSelectElement | null;
      newService = target?.value ?? null;
    }

    if (!newService) return;

    const svcControl = this.form.get('service');
    if (svcControl) {
      svcControl.setValue(newService);
    }

    this.buildCalendar(this.displayYear, this.displayMonth);

    const currentDate = this.form.get('date')?.value;
    if (currentDate) {
      this.form.get('time')?.disable();
      this.loadSlots();
    }
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
      : (date instanceof Date
          ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
          : String(date));

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

  onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.message = 'Revisa los campos del formulario.';
    return;
  }

  // Activamos el loading temporal y ocultamos el botón
  this.loadingTemp = true;
  this.enviado = false;
  this.hideButton = true;

  // Primer timeout: "Enviando..."
  setTimeout(() => {
    this.loadingTemp = false;
    this.enviado = true; // mostramos mensaje de enviado correctamente

    // Segundo timeout: mostramos el botón de nuevo tras X segundos
    setTimeout(() => {
      this.enviado = false;
      this.hideButton = false;
    }, this.showButtonDelay);

  }, this.loadingTempDuration);

  // Preparar datos para enviar al servidor
  const formData = new FormData();
  Object.entries(this.form.value).forEach(([key, value]) => {
    const safeValue = typeof value === 'boolean' ? String(value) : value;
    formData.append(key, safeValue as any);
  });

  if (this.selectedFile) {
    formData.append('reference', this.selectedFile);
  }

  this.loading = true;
  this.message = '';

  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
  if (submitBtn) submitBtn.disabled = true;

  this.http.post('http://localhost:8000/api/reservations', formData)
    .pipe(finalize(() => {
      this.loading = false;
      if (submitBtn) submitBtn.disabled = false;
    }))
    .subscribe({
      next: (res: any) => {
        // Si hay URL de pago
        if (res?.payUrl) {
          window.location.href = res.payUrl;
          return;
        }

        // Reset form
        this.form.reset({
          service: 'standard',
          date: '',
          time: '',
          name: '',
          email: '',
          phone: '',
          privacy: false,
          policy: false
        });
        this.selectedFile = null;
        this.slots = [];
        this.form.get('time')?.disable();
      },
      error: (err: any) => {
        if (err?.status === 409) {
          this.loadSlots();
        }
      }
    });
}

  buildCalendar(year: number, month: number) {
    const firstOfMonth = new Date(year, month, 1);
    const startDay = ((firstOfMonth.getDay() + 6) % 7);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonthDays = startDay;
    const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7;

    const days: typeof this.calendarDays = [];

    for (let i = 0; i < totalCells; i++) {
      const dayIndex = i - prevMonthDays + 1;
      const isCurrentMonth = dayIndex >= 1 && dayIndex <= daysInMonth;
      let dateObj: Date;
      if (isCurrentMonth) {
        dateObj = new Date(year, month, dayIndex);
      } else if (dayIndex < 1) {
        const daysPrevMonth = new Date(year, month, 0).getDate();
        dateObj = new Date(year, month - 1, daysPrevMonth + dayIndex);
      } else {
        dateObj = new Date(year, month + 1, dayIndex - daysInMonth);
      }

      days.push({
        date: dateObj,
        dateNum: dateObj.getDate(),
        isCurrentMonth: isCurrentMonth,
        count: null,
        status: isCurrentMonth ? 'available' : 'none'
      });
    }

    this.calendarDays = days;
    this.fetchMonthAvailability(year, month);
  }

  prevMonth() {
    if (this.displayMonth === 0) {
      this.displayMonth = 11;
      this.displayYear -= 1;
    } else {
      this.displayMonth -= 1;
    }
    this.buildCalendar(this.displayYear, this.displayMonth);
  }

  nextMonth() {
    if (this.displayMonth === 11) {
      this.displayMonth = 0;
      this.displayYear += 1;
    } else {
      this.displayMonth += 1;
    }
    this.buildCalendar(this.displayYear, this.displayMonth);
  }

  isSameDate(a: Date, b: Date | null) {
    if (!b) return false;
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  isSelectedDay(day: { date: Date }) {
    const current = this.form.get('date')?.value;
    if (!current) return false;

    if (typeof current === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(current)) {
      const [y, m, d] = current.split('-').map(Number);
      return day.date.getFullYear() === y &&
             (day.date.getMonth() + 1) === m &&
             day.date.getDate() === d;
    }

    const selected = (current instanceof Date)
      ? current
      : new Date(String(current));

    return day.date.getFullYear() === selected.getFullYear()
      && day.date.getMonth() === selected.getMonth()
      && day.date.getDate() === selected.getDate();
  }

  selectDateFromCalendar(day: { date: Date, isCurrentMonth: boolean, status: string }) {
    if (!day.isCurrentMonth) return;

    const y = day.date.getFullYear();
    const m = String(day.date.getMonth() + 1).padStart(2, '0');
    const d = String(day.date.getDate()).padStart(2, '0');
    const isoLocal = `${y}-${m}-${d}`;

    this.form.get('date')?.setValue(isoLocal);

    this.loadSlots();
  }

  fetchMonthAvailability(year: number, month: number) {
    const service = this.form.get('service')?.value || 'standard';

    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month + 1))
      .set('service', service);

    const fewThresholdLocal = (service === 'large') ? 1 : this.fewThreshold;
    const manyThresholdLocal = (service === 'large') ? 2 : this.manyThreshold;

    this.loading = true;
    this.http.get<{ day: string, count: number }[]>('http://localhost:8000/api/availability-month', { params })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (arr) => {
          const map = new Map<string, number>();
          arr.forEach(x => map.set(x.day, x.count));

          this.calendarDays = this.calendarDays.map(d => {
            if (!d.isCurrentMonth) return d;
            const iso =
              d.date.getFullYear() +
              '-' +
              String(d.date.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(d.date.getDate()).padStart(2, '0');

            const count = map.has(iso) ? map.get(iso)! : 0;

            let status: 'none' | 'few' | 'many' | 'available' = 'available';

            if (count === 0) status = 'none';
            else if (count <= fewThresholdLocal) status = 'few';
            else if (count >= manyThresholdLocal) status = 'many';

            return {
              ...d,
              count,
              status
            };
          });
        },
        error: () => {
          this.calendarDays = this.calendarDays.map(d => ({ ...d }));
        }
      });
  }
}
