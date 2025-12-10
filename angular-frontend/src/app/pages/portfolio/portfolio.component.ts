// src/app/portfolio/portfolio.component.ts
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminService, PortfolioItem } from '../../services/admin.service';

interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
  position?: number;
  image?: string;
}

@Component({
  standalone: true,
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  imports: [CommonModule],
})
export class PortfolioComponent implements OnInit, OnDestroy {
  images: GalleryImage[] = [];
  extraImages: GalleryImage[] = [];

  currentIndex = 0;
  lightboxOpen = false;

  private subs = new Subscription();
  private touchStartX = 0;
  private touchEndX = 0;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.refreshPortfolio(); 
    this.subs.add(
      this.adminService.portfolio$.subscribe(items => this.mapItemsToGallery(items))
    );
  }

  private mapItemsToGallery(items: PortfolioItem[]) {
    const imgs = (items || []).map(i => ({
      src: i.image || '',
      alt: i.title || '',
      caption: i.description || '',
      position: (i as any).position ?? (i as any).order ?? undefined,
      image: i.image || ''
    } as GalleryImage));
    this.images = imgs.slice(0, 3);
    this.extraImages = imgs.slice(3);
  }

  get allImages(): GalleryImage[] {
    return [...this.images, ...this.extraImages];
  }

  get currentImage(): GalleryImage {
    return this.allImages[this.currentIndex] || { src: '', alt: '', caption: '' };
  }

  featuredPositions = [1,2,3];
  galleryPositions = Array.from({length:15}, (_,i) => i+4);

  getImageByPosition(position: number): string {
    const found = this.allImages.find(x => x.position === position);
    if (found && found.src) return found.src;

    if (position >= 1 && position <= 3) {
      const idx = position - 1;
      const candidate = this.images[idx];
      if (candidate && candidate.src) return candidate.src;
    }

    if (position >= 4) {
      const idx = position - 1;
      if (this.allImages[idx] && this.allImages[idx].src) return this.allImages[idx].src;
    }

    return '';
  }

    open(index: number) {
    if (index < 0 || index >= this.allImages.length) return;
    this.currentIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }
  
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

  hasPrev() { return this.currentIndex > 0; }
  hasNext() { return this.currentIndex < this.allImages.length - 1; }

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

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.lightboxOpen) return;
    if (event.key === 'Escape') this.close();
    if (event.key === 'ArrowLeft') this.prev();
    if (event.key === 'ArrowRight') this.next();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    document.body.style.overflow = '';
  }
}
