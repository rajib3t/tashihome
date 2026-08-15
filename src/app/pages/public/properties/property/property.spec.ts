import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Property } from './property';

describe('Property', () => {
  let component: Property;
  let fixture: ComponentFixture<Property>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Property],
    }).compileComponents();

    fixture = TestBed.createComponent(Property);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
