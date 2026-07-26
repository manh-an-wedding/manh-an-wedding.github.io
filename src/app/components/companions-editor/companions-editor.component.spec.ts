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
    c.add(); c.rows[0].name = 'Vợ'; c.emit();
    expect(emitted.at(-1)).toEqual([{ name: 'Vợ' }]);
    c.remove(0); c.emit();
    expect(emitted.at(-1)).toEqual([]);
  });

  it('limits companion rows and restores the add button after a removal', async () => {
    await TestBed.configureTestingModule({
      imports: [CompanionsEditorComponent],
      providers: [provideTranslateService({})],
    }).compileComponents();
    const fixture = TestBed.createComponent(CompanionsEditorComponent);
    const c = fixture.componentInstance as CompanionsEditorComponent & {
      maxCompanions: number;
    };
    c.maxCompanions = 9;

    for (let index = 0; index < 10; index++) c.add();
    fixture.detectChanges();

    expect(c.rows).toHaveLength(9);
    expect(fixture.nativeElement.querySelector('.companion-add')).toBeNull();

    const removeButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.companion-remove');
    removeButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.companion-add')).not.toBeNull();
  });
});
