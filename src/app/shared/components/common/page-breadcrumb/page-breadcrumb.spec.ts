import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageBreadcrumb } from './page-breadcrumb';

describe('PageBreadcrumb', () => {
  let component: PageBreadcrumb;
  let fixture: ComponentFixture<PageBreadcrumb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageBreadcrumb],
    }).compileComponents();

    fixture = TestBed.createComponent(PageBreadcrumb);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
