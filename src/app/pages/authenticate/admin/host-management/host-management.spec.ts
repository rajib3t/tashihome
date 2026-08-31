import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HostManagement } from './host-management';
import { HostService } from '../../../../services/host/host-service';
import { ApiService } from '../../../../services/api/api-service';

describe('HostManagement Admin Component', () => {
  let component: HostManagement;
  let fixture: ComponentFixture<HostManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ApiService,
        HostService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default states and forms', () => {
    expect(component.searchForm).toBeDefined();
    expect(component.messageForm).toBeDefined();
    expect(component.convertForm).toBeDefined();
    expect(component.activeStatusTab()).toBe('');
    expect(component.requests().length).toBe(0);
  });
});
