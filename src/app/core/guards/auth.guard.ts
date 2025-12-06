import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  const session = sessionService.getSession();
  if (session) {
    sessionService.init();
    return true;
  }

  router.navigate(['/login'], { queryParams: { unauth: '1' }, replaceUrl: true });
  return false;
};
