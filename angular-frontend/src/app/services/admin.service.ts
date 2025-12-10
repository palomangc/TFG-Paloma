// src/app/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface PortfolioItem {
  id?: string | number;
  title?: string;
  description?: string;
  image?: string; 
  position?: number;
}

export interface Reservation {
  id: string;
  name: string;
  email: string;
  date: string;
  service: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private BASE_URL = 'http://localhost:8000/api/admin';

  private portfolioSubject = new BehaviorSubject<PortfolioItem[]>([]);
  public portfolio$ = this.portfolioSubject.asObservable();

  constructor(private http: HttpClient) {}

  private buildUrl(path: string): string {
    const base = this.BASE_URL.replace(/\/+$/, '');
    const clean = path.replace(/^\/+/, '');
    return `${base}/${clean}`;
  }

  private getOrigin(): string {
    const idx = this.BASE_URL.indexOf('/api');
    return idx === -1 ? this.BASE_URL.replace(/\/+$/, '') : this.BASE_URL.slice(0, idx);
  }

  private absoluteImageUrl(img?: string): string {
    if (!img) return '/portfolio/default.jpg';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/')) return `${this.getOrigin()}${img}`;
    return `${this.getOrigin()}/${img.replace(/^\/+/, '')}`;
  }

  // Portfolio
  refreshPortfolio(): void {
    this.http
      .get<PortfolioItem[]>(this.buildUrl('portfolio'))
      .pipe(
        map(items => (items || []).map(item => this.normalizePortfolioItem(item))),
        catchError(() => this.http.get<PortfolioItem[]>('/assets/portfolio.json').pipe(
          map(items => (items || []).map(item => this.normalizePortfolioItem(item))),
          catchError(() => of([]))
        )),
        map(items => items || [])
      )
      .subscribe(list => this.portfolioSubject.next(list));
  }

  getPortfolio(): Observable<PortfolioItem[]> {
    return this.http.get<PortfolioItem[]>(this.buildUrl('portfolio')).pipe(
      map(items => (items || []).map(item => this.normalizePortfolioItem(item))),
      catchError(() => of([]))
    );
  }

  getPortfolioItem(id: string | number): Observable<PortfolioItem> {
    return this.http.get<PortfolioItem>(this.buildUrl(`portfolio/${id}`)).pipe(
      map(item => this.normalizePortfolioItem(item)),
      catchError(() => of({} as PortfolioItem))
    );
  }

  //  Create / Update 
  createPortfolioItem(item: PortfolioItem): Observable<PortfolioItem> {
    return this.http.post<PortfolioItem>(this.buildUrl('portfolio'), item).pipe(
      tap(() => this.refreshPortfolio()),
      map(it => this.normalizePortfolioItem(it)),
      catchError(err => { throw err; })
    );
  }

  updatePortfolioItem(id: string | number, item: PortfolioItem): Observable<PortfolioItem> {
    return this.http.put<PortfolioItem>(this.buildUrl(`portfolio/${id}`), item).pipe(
      tap(() => this.refreshPortfolio()),
      map(it => this.normalizePortfolioItem(it)),
      catchError(err => { throw err; })
    );
  }

  //Create / Update (with image file)
  createPortfolioItemWithImage(data: { title?: string; description?: string; position?: number; imageFile: File }): Observable<PortfolioItem> {
    const fd = new FormData();
    if (data.title) fd.append('title', data.title);
    if (data.description) fd.append('description', data.description);
    if (typeof data.position !== 'undefined') fd.append('position', String(data.position));
    fd.append('image', data.imageFile);

    return this.http.post<PortfolioItem>(this.buildUrl('portfolio'), fd).pipe(
      tap(() => this.refreshPortfolio()),
      map(it => this.normalizePortfolioItem(it))
    );
  }

  updatePortfolioItemWithImage(id: string | number, data: { title?: string; description?: string; position?: number; imageFile?: File }): Observable<PortfolioItem> {
    const fd = new FormData();
    if (data.title !== undefined) fd.append('title', data.title);
    if (data.description !== undefined) fd.append('description', data.description);
    if (typeof data.position !== 'undefined') fd.append('position', String(data.position));
    if (data.imageFile) fd.append('image', data.imageFile);

    const url = `${this.buildUrl(`portfolio/${id}`)}?_method=PUT`;
    return this.http.post<PortfolioItem>(url, fd).pipe(
      tap(() => this.refreshPortfolio()),
      map(it => this.normalizePortfolioItem(it))
    );
  }

  // ---------- Delete ----------
  deletePortfolioItem(id: string | number): Observable<void> {
    return this.http.delete<void>(this.buildUrl(`portfolio/${id}`)).pipe(
      tap(() => this.refreshPortfolio()),
      catchError(() => of(void 0))
    );
  }

  uploadImage(file: File): Observable<{ filename: string; url?: string }> {
    const fd = new FormData();
    fd.append('image', file); 
    return this.http.post<{ filename: string; url?: string }>(this.buildUrl('portfolio/upload'), fd).pipe(
      catchError(() => of({ filename: '', url: '' }))
    );
  }

  // Reservations 
  getReservations(params?: { status?: string; q?: string }): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.q) httpParams = httpParams.set('q', params.q);

    return this.http
      .get<any>(this.buildUrl('reservations'), { params: httpParams })
      .pipe(
        map(resp => {
          if (!resp) return [];
          if (Array.isArray(resp)) return resp;
          if (Array.isArray(resp.data)) return resp.data;
          if (Array.isArray(resp.reservations)) return resp.reservations;
          if (Array.isArray(resp.items)) return resp.items;
          const found = Object.values(resp).find(v => Array.isArray(v));
          return Array.isArray(found) ? (found as any[]) : [];
        }),
        catchError(() => of([]))
      );
  }

  getReservation(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(this.buildUrl(`reservations/${id}`));
  }

  confirmReservation(id: string): Observable<Reservation> {
    return this.http.post<Reservation>(this.buildUrl(`reservations/${id}/confirm`), {});
  }

  cancelReservation(id: string): Observable<Reservation> {
    return this.http.post<Reservation>(this.buildUrl(`reservations/${id}/cancel`), {});
  }

  private normalizePortfolioItem(item: any): PortfolioItem {
    if (!item) return {} as PortfolioItem;
    const clone: PortfolioItem = {
      id: item.id ?? item.file ?? item.filename ?? undefined,
      title: item.title ?? item.name ?? '',
      description: item.description ?? item.desc ?? '',
      position: item.position ?? item.order ?? 999,
      image: item.image ?? (item.file ? `/uploads/portfolio/${item.file}` : undefined)
    };
    clone.image = this.absoluteImageUrl(clone.image);
    return clone;
  }
}
