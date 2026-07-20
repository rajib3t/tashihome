import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Backdrop } from './backdrop';

describe('Backdrop', () => {
  let component: Backdrop;
  let fixture: ComponentFixture<Backdrop>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Backdrop],
    }).compileComponents();

    fixture = TestBed.createComponent(Backdrop);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
