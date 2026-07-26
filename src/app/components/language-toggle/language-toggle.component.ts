import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-language-toggle', standalone: true, imports: [RouterLink],
  template: `
    <nav class="lang-toggle" aria-label="Language">
      <a routerLink="/"
         [class.is-active]="current === 'vi'"
         [attr.aria-current]="current === 'vi' ? 'page' : null">VI</a>
      <a routerLink="/en"
         [class.is-active]="current === 'en'"
         [attr.aria-current]="current === 'en' ? 'page' : null">EN</a>
    </nav>
  `,
})
export class LanguageToggleComponent {
  @Input() current: 'vi' | 'en' = 'vi';
  get otherLink(): string { return this.current === 'vi' ? '/en' : '/'; }
  get otherLabel(): string { return this.current === 'vi' ? 'EN' : 'VI'; }
}
