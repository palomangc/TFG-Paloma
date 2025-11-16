import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, ActivatedRouteSnapshot, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ContactoComponent } from '../contacto/contacto.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, ContactoComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgVideo', { static: true }) bgVideo!: ElementRef<HTMLVideoElement>;
  showPlayButton = false;

  private routerSub?: Subscription;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngAfterViewInit() {
    const v = this.bgVideo.nativeElement;
    v.muted = true;

    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.showPlayButton = false;
      }).catch(() => {
        this.showPlayButton = true;
      });
    }

    // Manejo de scroll por fragmento
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      const fragment = this.route.snapshot.fragment || this.getDeepestRouteDataFragment(this.route.snapshot);
      if (fragment) {
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 0);
      }
    });
  }

  private getDeepestRouteDataFragment(snapshot: ActivatedRouteSnapshot | null): string | null {
    let s = snapshot;
    while (s && s.firstChild) s = s.firstChild;
    return s?.data?.['fragment'] || null;
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
