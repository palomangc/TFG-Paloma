import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy } from '@angular/core';

interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

@Component({
  standalone: true,
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  imports: [CommonModule],
})
export class PortfolioComponent implements OnDestroy {
  // 3 imágenes principales 
  images: GalleryImage[] = [
    { src: '/portfolio/portfolio01.webp'},
    { src: '/portfolio/portofolio18.webp'},
    { src: '/portfolio/portfolio02.webp'},
  ];

  // Imágenes adicionales 
  extraImages: GalleryImage[] = [
    { src: '/portfolio/portofolio17.webp' },
    { src: '/portfolio/portofolio16.webp' },
    { src: '/portfolio/portofolio15.webp' },
    { src: '/portfolio/portofolio13.webp' },
    { src: '/portfolio/portofolio12.webp' },
    { src: '/portfolio/portofolio11.webp' },
    { src: '/portfolio/portfolio10.webp' },
    { src: '/portfolio/portfolio9.webp' },
    { src: '/portfolio/portfolio8.webp' },
    { src: '/portfolio/portfolio7.webp' },
    { src: '/portfolio/portfolio6.webp' },
    { src: '/portfolio/portfolio5.webp' },
    { src: '/portfolio/portfolio4.webp' },
    { src: '/portfolio/portfolio3.webp' },
    { src: '/portfolio/portfolio2.webp' },
    { src: '/portfolio/portfolio1.webp' },
  ];

  // Combina ambas listas para el visor (modal)
  get allImages(): GalleryImage[] {
    return [...this.images, ...this.extraImages];
  }

  currentIndex = 0;
  lightboxOpen = false;

  private touchStartX = 0;
  private touchEndX = 0;

  get currentImage(): GalleryImage {
    return this.allImages[this.currentIndex] || { src: '', alt: '', caption: '' };
  }

  open(index: number) {
    if (index < 0 || index >= this.allImages.length) return;
    this.currentIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  // Abrir desde la galería extra 
  openExtra(index: number) {
    const globalIndex = this.images.length + index;
    this.open(globalIndex);
  }

  close() {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  prev() {
    if (this.hasPrev()) this.currentIndex--;
  }

  next() {
    if (this.hasNext()) this.currentIndex++;
  }

  goTo(index: number) {
    if (index < 0 || index >= this.allImages.length) return;
    this.currentIndex = index;
  }

  hasPrev() {
    return this.currentIndex > 0;
  }

  hasNext() {
    return this.currentIndex < this.allImages.length - 1;
  }

  onBackdropClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && target.classList && target.classList.contains('fixed')) {
      this.close();
    }
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && this.hasNext()) this.next();
      if (diff < 0 && this.hasPrev()) this.prev();
    }
  }

  // --- Keyboard navigation ---
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.lightboxOpen) return;
    if (event.key === 'Escape') this.close();
    if (event.key === 'ArrowLeft') this.prev();
    if (event.key === 'ArrowRight') this.next();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
