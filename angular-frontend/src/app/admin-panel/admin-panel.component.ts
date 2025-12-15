// src/app/admin-panel/admin-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AdminService, PortfolioItem, Reservation } from '../services/admin.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
})
export class AdminPanelComponent implements OnInit {
  subPage: 'home' | 'portfolio' | 'reservas' = 'home';
  tab: 'portfolio' | 'reservas' = 'portfolio';

// login
loginUser = '';
loginPass = '';
loggedIn = false;

// credenciales básicas
private readonly ADMIN_USER = 'admin';
private readonly ADMIN_PASS = 'password123';

login() {
  if (this.loginUser === this.ADMIN_USER && this.loginPass === this.ADMIN_PASS) {
    this.loggedIn = true;
  } else {
    alert('Usuario o contraseña incorrectos');
    this.loginPass = '';
  }
}


  portfolioItems: PortfolioItem[] = [];
  loadingPortfolio = false;

  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  reservasFilter = '';
  filterStatus: '' | 'pending' | 'confirmed' | 'cancelled' = '';
  loadingReservations = false;

  featuredPositions = [1, 2, 3];
  galleryPositions: number[] = [];

  slotEdits: { [position: number]: { title?: string; description?: string } } = {};
  private slotMap: { [position: number]: PortfolioItem | null } = {};
  private selectedFiles: { [position: number]: File | null } = {};
  private previews: { [position: number]: string | null } = {};

  // nuevos flags y estados mínimos añadidos
  savingAll = false;
  savingAllReservations = false;
  reservasHaveBatchChanges = false;

  constructor(private adminService: AdminService) {
    for (let p = 4; p <= 18; p++) this.galleryPositions.push(p);
  }

  ngOnInit(): void {}

  goToHome() {
    this.subPage = 'home';
  }

  goToPortfolio() {
    this.subPage = 'portfolio';
    this.tab = 'portfolio';
    this.loadPortfolio();
  }

  goToReservas() {
    this.subPage = 'reservas';
    this.tab = 'reservas';
    this.loadReservations();
  }

  selectTab(t: 'portfolio' | 'reservas') {
    if (t === 'portfolio') this.goToPortfolio();
    else this.goToReservas();
  }

  goBackFromPortfolio() {
    // aquí vuelves a home
    this.subPage = 'home';
  }

  goBackFromReservas() {
    this.subPage = 'home';
  }

  // ---------- Portfolio ----------
  loadPortfolio() {
    this.loadingPortfolio = true;
    this.adminService
      .getPortfolio()
      .pipe(finalize(() => (this.loadingPortfolio = false)))
      .subscribe({
        next: (items) => {
          this.portfolioItems = items;
          this.buildSlotMap();
        },
        error: (err) => {
          console.error('[AdminPanel] Error cargando portfolio', err);
          this.portfolioItems = [];
          this.buildSlotMap();
        },
      });
  }

  private buildSlotMap() {
    this.slotMap = {};
    this.slotEdits = {};
    (this.portfolioItems || []).forEach(item => {
      const pos = (item as any).position ? Number((item as any).position) : undefined;
      if (pos) this.slotMap[pos] = item;
    });
    [...this.featuredPositions, ...this.galleryPositions].forEach(pos => {
      const it = this.slotMap[pos] ?? null;
      this.slotMap[pos] = it;
      this.slotEdits[pos] = {
        title: it?.title ?? '',
        description: it?.description ?? ''
      };
      this.selectedFiles[pos] = null;
      this.previews[pos] = null;
    });
  }

  getSlotImage(position: number): string {
    const it = this.slotMap[position];
    if (this.previews[position]) return this.previews[position] as string;
    if (it && it.image) return it.image;
    return '';
  }

  onFileForSlot(ev: Event, position: number) {
    const input = ev.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.selectedFiles[position] = file;
    this.setPreviewForSlot(position, file);
  }

  private setPreviewForSlot(position: number, file: File) {
    this.clearPreviewForSlot(position);
    const url = URL.createObjectURL(file);
    this.previews[position] = url;
  }

  private clearPreviewForSlot(position: number) {
    if (this.previews[position]) {
      try { URL.revokeObjectURL(this.previews[position]!); } catch {}
      this.previews[position] = null;
    }
  }

  clearSlotImage(position: number) {
    const it = this.slotMap[position];
    if (it && it.id) {
      if (!confirm('¿Eliminar esta imagen del portfolio?')) return;
      this.adminService.deletePortfolioItem(it.id).subscribe({
        next: () => {
          this.slotMap[position] = null;
          this.slotEdits[position] = { title: '', description: '' };
          this.selectedFiles[position] = null;
          this.clearPreviewForSlot(position);
          this.loadPortfolio();
        },
        error: (err) => {
          console.error('Error borrando slot', err);
          alert('Error borrando el item.');
        }
      });
      return;
    }

    this.selectedFiles[position] = null;
    this.slotEdits[position] = { title: '', description: '' };
    this.clearPreviewForSlot(position);
  }

  saveSlot(position: number) {
    const existing = this.slotMap[position];
    const title = this.slotEdits[position]?.title ?? '';
    const description = this.slotEdits[position]?.description ?? '';
    const file = this.selectedFiles[position];

    if (existing && existing.id) {
      if (file) {
        this.adminService.updatePortfolioItemWithImage(existing.id!, {
          title,
          description,
          position,
          imageFile: file
        }).subscribe({
          next: updated => {
            this.slotMap[position] = updated;
            this.clearPreviewForSlot(position);
            this.selectedFiles[position] = null;
            this.loadPortfolio();
          },
          error: err => {
            console.error('Error actualizando slot con imagen', err);
            alert('Error al actualizar el slot.');
          }
        });
      } else {
        const payload: PortfolioItem = { ...existing, title, description, position } as PortfolioItem;
        this.adminService.updatePortfolioItem(existing.id!, payload).subscribe({
          next: updated => {
            this.slotMap[position] = updated;
            this.loadPortfolio();
          },
          error: err => {
            console.error('Error actualizando slot', err);
            alert('Error al actualizar el slot.');
          }
        });
      }
    } else {
      if (!file) {
        alert('Selecciona una imagen para crear este slot.');
        return;
      }
      this.adminService.createPortfolioItemWithImage({
        title,
        description,
        position,
        imageFile: file
      }).subscribe({
        next: created => {
          this.slotMap[position] = created;
          this.clearPreviewForSlot(position);
          this.selectedFiles[position] = null;
          this.loadPortfolio();
        },
        error: err => {
          console.error('Error creando slot', err);
          alert('Error al crear el slot.');
        }
      });
    }
  }

  private async saveSlotPromise(position: number): Promise<void> {
    const existing = this.slotMap[position];
    const title = this.slotEdits[position]?.title ?? '';
    const description = this.slotEdits[position]?.description ?? '';
    const file = this.selectedFiles[position];

    const noChanges = !file && existing && existing.title === title && existing.description === description;
    if (existing && noChanges) return;

    // si no existe y no hay fichero -> saltar
    if (!existing && !file) return;

    if (existing && existing.id) {
      if (file) {
        const obs = this.adminService.updatePortfolioItemWithImage(existing.id!, {
          title,
          description,
          position,
          imageFile: file
        });
        const updated = await firstValueFrom(obs);
        this.slotMap[position] = updated;
        this.clearPreviewForSlot(position);
        this.selectedFiles[position] = null;
        return;
      } else {
        const payload: PortfolioItem = { ...existing, title, description, position } as PortfolioItem;
        const obs = this.adminService.updatePortfolioItem(existing.id!, payload);
        const updated = await firstValueFrom(obs);
        this.slotMap[position] = updated;
        return;
      }
    } else {
      // crear nuevo 
      if (!file) return; 
      const obs = this.adminService.createPortfolioItemWithImage({
        title,
        description,
        position,
        imageFile: file
      });
      const created = await firstValueFrom(obs);
      this.slotMap[position] = created;
      this.clearPreviewForSlot(position);
      this.selectedFiles[position] = null;
      return;
    }
  }

  // guardar todos los slots 
  async saveAll() {
    const positions = Array.from(new Set([...this.featuredPositions, ...this.galleryPositions]));
    this.savingAll = true;
    try {
      // transformar en promesas
      const promises = positions.map(pos => this.saveSlotPromise(pos).catch(err => {
        console.error(`Error guardando slot ${pos}`, err);
        // devolvemos rechazo para que Promise.all falle si quieres
        throw err;
      }));
      await Promise.all(promises);
      // refrescar listado
      await this.loadPortfolio();
      alert('Guardado completado');
    } catch (err) {
      console.error('Error guardando todo', err);
      alert('Error al guardar. Revisa la consola.');
    } finally {
      this.savingAll = false;
    }
  }

  // ---------- Reservas ----------
  loadReservations() {
    this.loadingReservations = true;
    const params: any = { status: this.filterStatus || undefined, q: this.reservasFilter || undefined };

    this.adminService.getReservations(params)
      .pipe(finalize(() => (this.loadingReservations = false)))
      .subscribe({
        next: (resp: any) => {
          let list: any[] = [];

          if (!resp) {
            list = [];
          } else if (typeof resp === 'string') {
            try {
              const parsed = JSON.parse(resp);
              if (Array.isArray(parsed)) list = parsed;
              else if (Array.isArray(parsed.data)) list = parsed.data;
              else if (Array.isArray(parsed.reservations)) list = parsed.reservations;
              else {
                const found = Object.values(parsed).find((v: any) => Array.isArray(v));
                list = Array.isArray(found) ? found : [];
              }
            } catch (e) {
              list = [];
            }
          } else if (Array.isArray(resp)) {
            list = resp;
          } else if (Array.isArray(resp.data)) {
            list = resp.data;
          } else if (Array.isArray(resp.reservations)) {
            list = resp.reservations;
          } else {
            const found = Object.values(resp).find((v: any) => Array.isArray(v));
            list = Array.isArray(found) ? found : [];
          }

          this.reservations = list;
          this.applyFilter();
        },
        error: (err) => {
          console.error('[AdminPanel] Error cargando reservas - HttpErrorResponse completo:', err);
          this.reservations = [];
        }
      });
  }

  applyFilter() {
    const q = this.reservasFilter.trim().toLowerCase();
    this.filteredReservations = this.reservations.filter((r) => {
      const matchText = q === '' || [r.name, r.email, r.service].some((f) => f.toLowerCase().includes(q));
      const matchStatus = this.filterStatus === '' || r.status === this.filterStatus;
      return matchText && matchStatus;
    });
  }

  confirmReservation(r: Reservation) {
    if (!confirm('Confirmar reserva?')) return;

    this.adminService.confirmReservation(r.id).subscribe({
      next: (updated) => {
        r.status = updated.status;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error confirmando reserva', err);
        alert('Error al confirmar reserva.');
      },
    });
  }

  cancelReservation(r: Reservation) {
    if (!confirm('Cancelar reserva?')) return;

    this.adminService.cancelReservation(r.id).subscribe({
      next: (updated) => {
        r.status = updated.status;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error cancelando reserva', err);
        alert('Error al cancelar reserva.');
      },
    });
  }

  openReservationDetails(r: Reservation) {
    alert(
      `Reserva de ${r.name}\nEmail: ${r.email}\nFecha: ${new Date(r.date).toLocaleString()}\nServicio: ${r.service}\nEstado: ${r.status}`
    );
  }

  // Guardar cambios de reservas 
  async saveAllReservations() {
    if (!this.reservasHaveBatchChanges) return;
    this.savingAllReservations = true;
    try {
      await this.loadReservations();
      alert('Reservas guardadas');
      this.reservasHaveBatchChanges = false;
    } catch (err) {
      console.error('Error guardando reservas', err);
      alert('Error guardando reservas');
    } finally {
      this.savingAllReservations = false;
    }
  }

  // ---------- eliminar item desde la lista ----------
  deletePortfolioItem(item: PortfolioItem) {
    if (!confirm('¿Eliminar este elemento del portfolio?')) return;
    if (!item?.id) return;

    this.adminService.deletePortfolioItem(item.id).subscribe({
      next: () => {
        this.portfolioItems = this.portfolioItems.filter(p => p.id !== item.id);
        this.buildSlotMap();
      },
      error: (err) => {
        console.error('Error borrando item', err);
        alert('Error al eliminar el item.');
      }
    });
  }
}
