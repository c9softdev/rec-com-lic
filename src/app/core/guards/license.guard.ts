import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { GlobalSettingsService } from '../services/global-settings.service';
import { Observable, of } from 'rxjs';
import { LicenseStateService } from '../services/license-state.service';
import { map, catchError } from 'rxjs/operators';
// import { SweetAlertService } from '../services/sweet-alert.service';

/**
 * Guard to enforce valid license on all routes.
 * LICENSE VALIDATION DISABLED - NOT USED IN THIS VERSION
 */
export const licenseGuard: CanActivateFn = () => {
  const router = inject(Router);
  // const settings = inject(GlobalSettingsService);
  const licenseState = inject(LicenseStateService);
  // const sweetAlert = inject(SweetAlertService);

  // License validation is disabled - simply return true to allow navigation
  // Previously: settings.validateLicenseCached(120000)
  return of(true);

  // ===== COMMENTED OUT LICENSE VALIDATION CODE =====
  // return settings.validateLicenseCached(120000).pipe(
  //   map((res: any) => {
  //     const ok = res?.status === 'success' && String(res?.data?.chr_status || '') === '1';
  //     if (ok) {
  //       // console.log("Data", res.data);
  //       licenseState.setLicenseData(res.data);
  //       return true;
  //     }
  //     // Navigate to unified error page with license-expired type
  //     router.navigate(['/error'], { queryParams: { type: 'license-expired', message: res?.message || '' }, replaceUrl: true });
  //     return false;
  //   }),
  //   catchError((err: any) => {
  //     const msg = (typeof err === 'object' && err?.message) ? err.message : 'Service unreachable';
  //     router.navigate(['/error'], { queryParams: { type: 'server-down', message: msg }, replaceUrl: true });
  //     return of(false);
  //   })
  // );
  // ===== END COMMENTED OUT LICENSE VALIDATION CODE =====
};