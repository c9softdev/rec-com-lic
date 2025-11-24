import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { sessionInterceptor } from './core/interceptors/session.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([apiInterceptor, sessionInterceptor]),
      withFetch()
    ),
    provideAnimations()
    // Removed provideToastr
  ]
};

// It should also update at API level
export const userType = [
  // { id: 1, label: 'Admin' },
  { id: 2, label: 'Manager' },
  { id: 3, label: 'Employee' },
  // { id: 4, label: 'Sub Admin' }
];

export const projectStatusType = [
  { id: 1, label: 'Ongoing' },
  { id: 2, label: 'Upcoming' },
  { id: 3, label: 'Closed' },
  { id: 4, label: 'Cancelled' }
];

// Pagination properties
// These properties should be set dynamically based on the API response
export const paginationProperties =
{
  currentPage: 1,
  pageSize: 50,
  totalPages: 0,
  paginationRange: [],
  jumpToPage: 1,
  totalRecords: 0
};
export const GENDERS = [
  { id: '0', name: 'Male' },
  { id: '1', name: 'Female' },
  { id: '2', name: 'Other' }
];

export const RELIGIONS = [
  { id: '1', name: 'Hindu' },
  { id: '2', name: 'Muslim' },
  { id: '3', name: 'Christian' },
  // Add more as needed
];

export const MARITAL_STATUS = [
  { id: '0', name: 'Single' },
  { id: '1', name: 'Married' },
  { id: '2', name: 'Divorced' },
  { id: '3', name: 'Widowed' }
];

export const SORT_TO = [
  { id: 'date', name: 'By Date' },
  { id: 'name', name: 'By Name' }
];

export const SORT_BY = [
  { id: 'ASC', name: 'ASC' },
  { id: 'DESC', name: 'DESC' }
];

