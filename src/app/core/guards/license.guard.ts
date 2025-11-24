import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { GlobalSettingsService } from '../services/global-settings.service';
import { Observable, of } from 'rxjs';
import { LicenseStateService } from '../services/license-state.service';
import { map, catchError } from 'rxjs/operators';
// import { SweetAlertService } from '../services/sweet-alert.service';

/**
 * Guard to enforce valid license on all routes.
 * Calls the license API and blocks navigation when status is failed or inactive.
 */
export const licenseGuard: CanActivateFn = () => {
  const router = inject(Router);
  const settings = inject(GlobalSettingsService);
  const licenseState = inject(LicenseStateService);
  // const sweetAlert = inject(SweetAlertService);

  // Use a short TTL (2 minutes) to reduce repeated license calls while keeping enforcement strict.
  return settings.validateLicenseCached(120000).pipe(
    map((res: any) => {
      const ok = res?.status === 'success' && String(res?.data?.chr_status || '') === '1';
      if (ok) {
        // console.log("Data", res.data);
        licenseState.setLicenseData(res.data);
        return true;

      }
      // Navigate to unified error page with license-expired type
      router.navigate(['/error'], { queryParams: { type: 'license-expired', message: res?.message || '' }, replaceUrl: true });
      return false;
    }),
    catchError((err: any) => {
      const msg = (typeof err === 'object' && err?.message) ? err.message : 'Service unreachable';
      router.navigate(['/error'], { queryParams: { type: 'server-down', message: msg }, replaceUrl: true });
      return of(false);
    })
  );
};