import { Component, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {

  private pendingFragment: string | null = null;
  private routerSub: Subscription;
  public title = 'angular-frontend';


  constructor(private router: Router) {

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.pendingFragment) {
          setTimeout(() => this.scrollToId(this.pendingFragment!), 50);
          this.pendingFragment = null;
        }
      });
  }

  // FUNCIÓN QUE LLAMA EL NAVBAR
  public scrollTo(event: Event, id: string) {
    event.preventDefault();

    const currentPath = this.router.url.split('#')[0];
    const homePath = '/';

    if (currentPath === homePath || currentPath === '') {
      this.scrollToId(id);
    } else {
      this.pendingFragment = id;
      this.router.navigate(['/'], { fragment: id });
    }
  }

  private scrollToId(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn('Elemento no encontrado:', id);
    }
  }

  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
  }
}
