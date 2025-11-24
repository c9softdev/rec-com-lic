import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  // Accept either persisted app_session (role/menus) OR valid activity session
  const appSessionRaw = localStorage.getItem('app_session');
  const activityRaw = localStorage.getItem('user_session');
  const sessionService = inject(SessionService);

  if (appSessionRaw) {
    // Ensure activity store exists/valid, then allow
    try {
      const s = activityRaw ? JSON.parse(activityRaw) : null;
      const valid = s && s.expiresAt && Date.now() < s.expiresAt;
      if (!valid) sessionService.init();
    } catch {
      sessionService.init();
    }
    return true;
  }

  router.navigate(['/login'], { queryParams: { unauth: '1' }, replaceUrl: true });
  return false;
};