import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Avatar } from './avatar';

describe('Avatar', () => {
  let component: Avatar;
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Avatar],
    }).compileComponents();

    fixture = TestBed.createComponent(Avatar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('revokes owned preview URLs when replacing a selected file and on destroy', () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL');
    const input = document.createElement('input');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    Object.defineProperty(input, 'files', { value: [file] });
    component.onFileSelected({ target: input } as unknown as Event);
    component.src = 'https://example.com/avatar.png';
    fixture.destroy();

    expect(createObjectUrl).toHaveBeenCalledWith(file);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview');
  });
});
