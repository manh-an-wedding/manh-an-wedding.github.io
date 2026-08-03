import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { RsvpService } from '../../core/rsvp.service';
import { PublicGroupComponent } from './public-group.component';

describe('PublicGroupComponent', () => {
  async function render(rows: unknown[], slug = 'tien-buoc', token: string | null = 'abcxyz') {
    const requestedSlugs: string[] = [];
    const requestedTokens: string[] = [];
    await TestBed.configureTestingModule({
      imports: [PublicGroupComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug })),
            queryParamMap: of(convertToParamMap(token ? { t: token } : {})),
          },
        },
        {
          provide: RsvpService,
          useValue: {
            getPublicGroupRsvps: async (requestedSlug: string, requestedToken: string) => {
              requestedSlugs.push(requestedSlug);
              requestedTokens.push(requestedToken);
              return rows;
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicGroupComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      requestedSlugs,
      requestedTokens,
    };
  }

  it('shows guest names, choices, and companions without edit controls', async () => {
    const { element } = await render([
      {
        guest_name: 'Nhật An',
        status: 'bus',
        companions: ['Duy Mạnh'],
      },
      {
        guest_name: 'Bạn Tâm',
        status: 'self_transport',
        companions: [],
      },
      {
        guest_name: 'Bạn An',
        status: 'cannot_attend',
        companions: [],
      },
    ]);

    const eyebrow = element.querySelector('.eyebrow');
    const title = element.querySelector('header h3');
    expect(title?.textContent).toContain(
      'Danh sách nhóm Tiến bước',
    );
    expect(getComputedStyle(eyebrow as Element).textAlign).toBe('left');
    expect(eyebrow?.textContent).toContain('Thứ 7 - 17.10.2026');
    expect(getComputedStyle(title as Element).textAlign).toBe('left');
    expect(element.textContent).not.toContain(
      'Danh sách được cập nhật từ xác nhận mới nhất của từng khách.',
    );
    expect(element.textContent).toContain('Nhật An');
    expect(element.textContent).toContain('Duy Mạnh');
    const guests = Array.from(element.querySelectorAll('.guest-list > li'));
    const choices = Array.from(
      element.querySelectorAll('.guest-choice'),
      choice => choice.textContent?.trim(),
    );
    expect(guests[0]?.querySelector('.guest-number')?.textContent?.trim()).toBe('1.');
    expect(guests[1]?.querySelector('.guest-number')?.textContent?.trim()).toBe('2.');
    expect(choices).toEqual(['(Đi xe)', '(Tự di chuyển)', '(Không tham gia)']);
    expect(guests[0]?.querySelector('.companion-item')?.textContent?.replace(/\s+/g, ' ').trim())
      .toBe('+ Duy Mạnh');
    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });

  it('maps the legacy tienbuoc.index.html URL to the published tien-buoc slug', async () => {
    const { element, requestedSlugs, requestedTokens } =
      await render([], 'tienbuoc.index.html');

    expect(requestedSlugs).toEqual(['tien-buoc']);
    expect(requestedTokens).toEqual(['abcxyz']);
    expect(element.querySelector('h3')?.textContent)
      .toContain('Danh sách nhóm Tiến bước');
  });

  it('does not request or reveal a group list without its URL token', async () => {
    const { element, requestedSlugs } = await render([], 'tien-buoc', null);

    expect(requestedSlugs).toEqual([]);
    expect(element.textContent).toContain('Liên kết xem danh sách không hợp lệ');
    expect(element.textContent).not.toContain('Chưa có xác nhận nào');
  });

  it('shows an empty state when the group has no current confirmations', async () => {
    const { element } = await render([]);

    expect(element.textContent).toContain('Chưa có xác nhận nào trong nhóm này');
  });

  it('paginates the public guest list at twenty guests per page', async () => {
    const { fixture, element } = await render(
      Array.from({ length: 21 }, (_, index) => ({
        guest_name: `Khách ${index + 1}`,
        status: 'self_transport',
        companions: [],
      })),
    );

    expect(element.querySelectorAll('.guest-list > li')).toHaveLength(20);
    expect(element.querySelector('.pagination-status')?.textContent?.trim())
      .toBe('Trang 1 / 2');

    (element.querySelector('button[aria-label="Trang sau"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.guest-list > li')).toHaveLength(1);
    expect(element.querySelector('.guest-number')?.textContent?.trim()).toBe('21.');
    expect(element.textContent).toContain('Khách 21');
  });
});
