import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Get the auth token from session storage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
  const token = currentUser?.token;

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Auto logout if 401 response returned from api
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('user_session');
        router.navigate(['/login']);
      }
      // Server unavailable (network error or 503)
      else if (error.status === 0 || error.status === 503) {
        router.navigate(['/error'], { queryParams: { type: 'server-down' } });
      }
      // Internal server error
      else if (error.status >= 500) {
        router.navigate(['/error'], { queryParams: { type: '500' } });
      }
      
      const errorMessage = error.error?.message || error.statusText;
      return throwError(() => errorMessage);
    })
  );
};