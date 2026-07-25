import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CompanionDraft } from '../../core/rsvp.service';

@Component({
  selector: 'app-companions-editor', standalone: true, imports: [FormsModule, TranslatePipe],
  template: `
    @for (row of rows; track $index) {
      <div class="row">
        <input [(ngModel)]="row.name" (ngModelChange)="emit()" placeholder="Tên">
        <label><input type="checkbox" [(ngModel)]="row.joinsBus" (ngModelChange)="emit()">
          {{ 'rsvp.joins_bus' | translate }}</label>
        <button type="button" (click)="remove($index); emit()">✕</button>
      </div>
    }
    <button type="button" (click)="add(); emit()">+ {{ 'rsvp.add_companion' | translate }}</button>`,
})
export class CompanionsEditorComponent {
  rows: CompanionDraft[] = [];
  @Output() changed = new EventEmitter<CompanionDraft[]>();
  add() { this.rows.push({ name: '', joinsBus: false, relation: '' }); }
  remove(i: number) { this.rows.splice(i, 1); }
  emit() { this.changed.emit(this.rows.filter(r => r.name.trim().length > 0)); }
}
