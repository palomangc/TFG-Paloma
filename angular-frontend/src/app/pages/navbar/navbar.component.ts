import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  menuOpen = false;

  @ViewChild('firstMenuLink', { read: ElementRef, static: false }) firstMenuLinkRef?: ElementRef<HTMLAnchorElement>;

  constructor(private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen = false;
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      setTimeout(() => { try { this.firstMenuLinkRef?.nativeElement?.focus(); } catch {} }, 0);
    }
  }

  closeMenu(): void { this.menuOpen = false; }

  onBackdropClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (target && target.id === 'mobile-menu') this.closeMenu();
  }

  onNavClick(fragment: string): void {
    this.closeMenu();
    setTimeout(() => {
      const el = document.getElementById(fragment);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else this.router.navigate([], { fragment }).catch(() => {});
    }, 0);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen) this.closeMenu();
  }
}
