import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CompanionsEditorComponent } from './companions-editor.component';

describe('CompanionsEditorComponent', () => {
  it('adds and removes companions and emits the list', async () => {
    await TestBed.configureTestingModule({
      imports: [CompanionsEditorComponent],
      providers: [provideTranslateService({})],
    }).compileComponents();
    const c = TestBed.createComponent(CompanionsEditorComponent).componentInstance;
    const emitted: any[] = [];
    c.changed.subscribe(v => emitted.push(v));
    c.add(); c.rows[0].name = 'Vợ'; c.rows[0].joinsBus = true; c.emit();
    expect(emitted.at(-1)).toEqual([{ name: 'Vợ', joinsBus: true, relation: '' }]);
    c.remove(0); c.emit();
    expect(emitted.at(-1)).toEqual([]);
  });
});
