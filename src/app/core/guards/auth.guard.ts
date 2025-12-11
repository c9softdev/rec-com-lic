import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  const session = sessionService.getSession();
  if (session && session.userId && session.comp_id) {
    // Session is valid, initialize activity tracking
    sessionService.init();
    return true;
  }

  // No valid session found, redirect to login
  router.navigate(['/login'], { queryParams: { unauth: '1' }, replaceUrl: true });
  return false;
};
