import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CompanionDraft } from '../../core/rsvp.service';

@Component({
  selector: 'app-companions-editor', standalone: true, imports: [FormsModule, TranslatePipe],
  template: `
    @for (row of rows; track $index) {
      <div class="row">
        <input class="companion-name" [(ngModel)]="row.name" (ngModelChange)="emit()">
        <button class="companion-remove" type="button" (click)="remove($index); emit()"
                [attr.aria-label]="'rsvp.remove_companion' | translate">✕</button>
      </div>
    }
    @if (rows.length < maxCompanions) {
      <button class="companion-add" type="button" (click)="add(); emit()">
        + {{ 'rsvp.add_companion' | translate }}
      </button>
    }`,
})
export class CompanionsEditorComponent {
  rows: CompanionDraft[] = [];
  @Input() maxCompanions = Number.POSITIVE_INFINITY;
  @Output() changed = new EventEmitter<CompanionDraft[]>();
  add() {
    if (this.rows.length < this.maxCompanions) this.rows.push({ name: '' });
  }
  remove(i: number) { this.rows.splice(i, 1); }
  emit() { this.changed.emit(this.rows.filter(r => r.name.trim().length > 0)); }
}
