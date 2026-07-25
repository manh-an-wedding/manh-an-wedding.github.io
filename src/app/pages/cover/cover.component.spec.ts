import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CoverComponent } from './cover.component';

describe('CoverComponent', () => {
  it('emits opened when the button is clicked (starts music+scroll)', async () => {
    await TestBed.configureTestingModule({
      imports: [CoverComponent],
      providers: [provideTranslateService({})],
    }).compileComponents();
    const f = TestBed.createComponent(CoverComponent);
    let opened = false;
    f.componentInstance.opened.subscribe(() => (opened = true));
    f.detectChanges();
    (f.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(opened).toBe(true);
  });
});
