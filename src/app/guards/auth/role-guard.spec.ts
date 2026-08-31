import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { adminGuard, adminOnlyGuard, staffGuard, vendorGuard, userGuard } from './role-guard';

describe('Role Guards', () => {
  const executeGuard = (guard: CanActivateFn): CanActivateFn => (...guardParameters) =>
    TestBed.runInInjectionContext(() => guard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should create adminGuard', () => {
    expect(executeGuard(adminGuard)).toBeTruthy();
  });

  it('should create adminOnlyGuard', () => {
    expect(executeGuard(adminOnlyGuard)).toBeTruthy();
  });

  it('should create staffGuard', () => {
    expect(executeGuard(staffGuard)).toBeTruthy();
  });

  it('should create vendorGuard', () => {
    expect(executeGuard(vendorGuard)).toBeTruthy();
  });

  it('should create userGuard', () => {
    expect(executeGuard(userGuard)).toBeTruthy();
  });
});

