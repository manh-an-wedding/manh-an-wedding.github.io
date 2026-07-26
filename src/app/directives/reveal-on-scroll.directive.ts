import {
  AfterViewInit,
  Directive,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true,
  host: { class: 'scroll-reveal' },
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(
    private element: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)
      || typeof IntersectionObserver === 'undefined'
      || (typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      this.reveal();
      return;
    }

    this.observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      this.reveal();
      this.observer?.unobserve(this.element.nativeElement);
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px',
    });

    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private reveal() {
    this.renderer.addClass(this.element.nativeElement, 'is-visible');
  }
}
