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
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('user_session');
        router.navigate(['/login']);
      } else if (error.status === 0 || error.status === 503) {
        router.navigate(['/error'], { queryParams: { type: 'server-down' } });
      } else if (error.status >= 500) {
        return throwError(() => error);
      }
      
      const errorMessage = error.error?.message || error.statusText;
      return throwError(() => errorMessage);
    })
  );
};