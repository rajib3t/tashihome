import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleProperty } from './single-property';

describe('SingleProperty', () => {
  let component: SingleProperty;
  let fixture: ComponentFixture<SingleProperty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SingleProperty],
    }).compileComponents();

    fixture = TestBed.createComponent(SingleProperty);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
