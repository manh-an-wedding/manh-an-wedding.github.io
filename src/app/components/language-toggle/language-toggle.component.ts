import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-language-toggle', standalone: true, imports: [RouterLink],
  template: `<a [routerLink]="otherLink" class="lang-toggle">🌐 {{ otherLabel }}</a>`,
  styles: [`.lang-toggle{position:fixed;top:.5rem;right:.5rem;z-index:20;text-decoration:none}`],
})
export class LanguageToggleComponent {
  @Input() current: 'vi' | 'en' = 'vi';
  get otherLink(): string { return this.current === 'vi' ? '/en' : '/'; }
  get otherLabel(): string { return this.current === 'vi' ? 'EN' : 'VI'; }
}
