import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, ActivatedRouteSnapshot } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ContactoComponent } from '../contacto/contacto.component';
import { EstudioComponent } from "../estudio/estudio.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ContactoComponent, EstudioComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgVideo0', { static: true }) bgVideo0!: ElementRef<HTMLVideoElement>;
  @ViewChild('bgVideo1', { static: true }) bgVideo1!: ElementRef<HTMLVideoElement>;
  @ViewChild('bgVideo2', { static: true }) bgVideo2!: ElementRef<HTMLVideoElement>;
  @ViewChild('singleVideo', { static: true }) singleVideo!: ElementRef<HTMLVideoElement>;

  showPlayButton = false;
  menuOpen = false;
  private routerSub?: Subscription;
  private offsets = [5,52,30];
  private videoPath = '/assets/video-bg.mp4';

  constructor(private router: Router, private route: ActivatedRoute) {}

  async ngAfterViewInit() {
    this.routerSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.closeMenu();
      const fragment = this.route.snapshot.fragment || this.getDeepestRouteDataFragment(this.route.snapshot);
      if (fragment) {
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      }
    });

    const vids = [
      this.bgVideo0.nativeElement,
      this.bgVideo1.nativeElement,
      this.bgVideo2.nativeElement
    ];
    const single = this.singleVideo.nativeElement;

    vids.forEach(v => {
      v.src = this.videoPath;
      v.preload = 'auto';
      v.loop = false;
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
    });

    single.src = this.videoPath;
    single.preload = 'auto';
    single.loop = true;
    single.muted = true;
    single.playsInline = true;
    single.setAttribute('playsinline', '');

    try {
      const readyPromises = vids.map(v => new Promise<void>(resolve => {
        if (v.readyState >= 2) return resolve();
        v.addEventListener('loadedmetadata', () => resolve(), { once: true });
      }));

      await Promise.all(readyPromises);

      vids.forEach((v, idx) => {
        const safeOffset = Math.min(this.offsets[idx] || 0, Math.max(0, v.duration - 0.1));
        try { v.currentTime = safeOffset; } catch {
          const onCan = () => { try { v.currentTime = safeOffset; } catch {} ; v.removeEventListener('canplay', onCan); };
          v.addEventListener('canplay', onCan);
        }
        v.addEventListener('ended', () => {
          const safe = Math.min(this.offsets[idx] || 0, Math.max(0, v.duration - 0.1));
          try { v.currentTime = safe; v.play().catch(() => {}); } catch {}
        });
      });

      single.addEventListener('ended', () => {
        try { single.currentTime = 0; single.play().catch(() => {}); } catch {}
      });

      const playAll = vids.map(v => v.play());
      const p = Promise.allSettled(playAll);
      p.then(results => {
        const anyRejected = results.some(r => r.status === 'rejected');
        if (anyRejected) this.showPlayButton = true;
      });

      single.play().catch(() => { this.showPlayButton = true; });

    } catch {
      this.showPlayButton = true;
    }
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }

  private getDeepestRouteDataFragment(snapshot: ActivatedRouteSnapshot | null): string | null {
    let s = snapshot;
    while (s && s.firstChild) s = s.firstChild;
    return s?.data?.['fragment'] || null;
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
