import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timer } from 'rxjs';
import { map, switchMap, catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';
import { ConfigService } from './config.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  private apiUrl = environment.apiUrl;

  // Cache for company_sec_id with TTL (5 minutes = 300000ms)
  private readonly COMPANY_SEC_ID_TTL = 5 * 60 * 1000;
  private companySecIdCache: CacheEntry<string> | null = null;
  private companySecIdRefresh$ = new BehaviorSubject<string>('');
  private silentRefreshInProgress = false;

  // Generic HTTP response cache (for dropdowns, lists, static data)
  // Key: event/mode combo, Value: cached response
  private readonly RESPONSE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for data responses
  private responseCache = new Map<string, CacheEntry<any>>();
  
  // In-flight request cache (Observable sharing)
  // Prevents duplicate simultaneous requests for the same endpoint
  private inFlightRequests = new Map<string, Observable<any>>();
  
  // Cache-able endpoints (events/modes that should be cached)
  // These are read-only or rarely-changing data
  private readonly CACHEABLE_ENDPOINTS = new Set([
    'jcat/pcat',      // Parent categories
    'jcat/subc',      // Sub categories
    'qual/lq',        // Qualifications
    'qual/lpq',       // Parent qualifications
    'user/lr',        // Employees
    'client/acl',     // Countries
    'client/cbcid',   // Cities by country
    'msp/gloConfig',  // Global settings
    'jobseeker/rmkList', // Remarks
    'client/lr'       // Clients
  ]);

  constructor(
    private http: HttpClient,
    private sessionService: SessionService,
    private configService: ConfigService
  ) {
    // Initialize cache from session if available
    this.initializeFromSession();
  }

  /**
   * Initialize cache from session storage on service creation
   */
  private initializeFromSession(): void {
    try {
      const cached = sessionStorage.getItem('company_sec_id_cache');
      if (cached) {
        const entry = JSON.parse(cached) as CacheEntry<string>;
        if (!this.isCacheExpired(entry)) {
          this.companySecIdCache = entry;
          this.companySecIdRefresh$.next(entry.data);
        } else {
          sessionStorage.removeItem('company_sec_id_cache');
        }
      }
    } catch { }
  }

  /**
   * Check if cache entry has expired based on TTL
   */
  private isCacheExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Save cache to session storage for persistence across page reloads
   */
  private saveCacheToSession(companySecId: string): void {
    try {
      const entry: CacheEntry<string> = {
        data: companySecId,
        timestamp: Date.now(),
        ttl: this.COMPANY_SEC_ID_TTL
      };
      sessionStorage.setItem('company_sec_id_cache', JSON.stringify(entry));
    } catch { }
  }

  /**
   * Get company_sec_id from cache or fetch fresh value
   * Uses efficient caching strategy to minimize API calls
   */
  private fetchCompanySecId(): Observable<string> {
    // Return cached value if valid
    if (this.companySecIdCache && !this.isCacheExpired(this.companySecIdCache)) {
      // Silently refresh in background if cache is getting old (75% of TTL)
      const agePercentage = (Date.now() - this.companySecIdCache.timestamp) / this.COMPANY_SEC_ID_TTL;
      if (agePercentage > 0.75 && !this.silentRefreshInProgress) {
        this.silentRefreshCompanySecId();
      }
      // Return a single-emission observable of the current cached value to avoid
      // keeping a long-lived subscription that could retrigger downstream
      // switchMap/http calls when the BehaviorSubject later emits (silent refresh).
      return new Observable<string>(observer => {
        try {
          observer.next(this.companySecIdCache!.data);
        } catch (e) {
          observer.next('');
        }
        observer.complete();
      });
    }

    // Cache miss or expired - fetch fresh value
    return this.configService.getConfig().pipe(
      map((res: any) => res?.data?.company_sec_id || ''),
      tap((companySecId) => {
        // Update cache
        this.companySecIdCache = {
          data: companySecId,
          timestamp: Date.now(),
          ttl: this.COMPANY_SEC_ID_TTL
        };
        this.saveCacheToSession(companySecId);
        this.companySecIdRefresh$.next(companySecId);
      }),
      catchError(() => {
        // Return cached value if available, even if expired (fallback)
        if (this.companySecIdCache?.data) {
          return new Observable<string>(observer => {
            observer.next(this.companySecIdCache!.data);
            observer.complete();
          });
        }
        return throwError(() => new Error('Failed to fetch company_sec_id'));
      })
    );
  }

  /**
   * Silently refresh company_sec_id in the background without blocking requests
   * This prevents cache misses during high-load scenarios
   */
  private silentRefreshCompanySecId(): void {
    if (this.silentRefreshInProgress) return;

    this.silentRefreshInProgress = true;
    this.configService.getConfig().pipe(
      tap((res: any) => {
        const freshCompanySecId = res?.data?.company_sec_id || '';
        this.companySecIdCache = {
          data: freshCompanySecId,
          timestamp: Date.now(),
          ttl: this.COMPANY_SEC_ID_TTL
        };
        this.saveCacheToSession(freshCompanySecId);
        this.companySecIdRefresh$.next(freshCompanySecId);
      }),
      catchError(() => new Observable<void>(observer => observer.complete()))
    ).subscribe(() => {
      this.silentRefreshInProgress = false;
    });
  }

  /**
   * Clear cache on logout
   */
  clearCache(): void {
    this.companySecIdCache = null;
    this.companySecIdRefresh$.next('');
    sessionStorage.removeItem('company_sec_id_cache');
  }

  /**
   * Get current cache status (useful for monitoring)
   */
  getCacheStatus(): {
    isCached: boolean;
    age: number;
    ttl: number;
    isValid: boolean;
  } | null {
    if (!this.companySecIdCache) return null;
    const age = Date.now() - this.companySecIdCache.timestamp;
    return {
      isCached: true,
      age,
      ttl: this.companySecIdCache.ttl,
      isValid: !this.isCacheExpired(this.companySecIdCache)
    };
  }

  /**
   * Check if a valid company_sec_id is available and not expired
   * Prevents API calls from being made without valid credentials
   */
  hasValidCompanySecId(): boolean {
    if (!this.companySecIdCache || !this.companySecIdCache.data) {
      return false;
    }
    return !this.isCacheExpired(this.companySecIdCache);
  }

  /**
   * Get cache key for response caching (event/mode + InputData)
   * Ensures concurrent requests with same params share Observable
   */
  private getCacheKey(payload: any): string {
    const event = payload?.event || '';
    const mode = payload?.mode || '';
    
    // For most read-only endpoints, InputData doesn't matter (qual/lq, jcat/pcat, etc.)
    // So we only use event/mode for them
    const baseKey = `${event}/${mode}`;
    
    // For endpoints that might have different parameters, include InputData
    // This prevents different searches from sharing the same Observable
    if (payload?.InputData && Array.isArray(payload.InputData) && payload.InputData.length > 0) {
      const inputData = payload.InputData[0];
      // Create a stable key from InputData (excluding auth fields)
      const { comp_id, company_sec_id, ...relevantData } = inputData;
      
      // Only add InputData to key if there are relevant fields
      if (Object.keys(relevantData).length > 0) {
        const inputDataHash = JSON.stringify(relevantData);
        return `${baseKey}:${inputDataHash}`;
      }
    }
    
    return baseKey;
  }

  /**
   * Check if endpoint response should be cached
   */
  private isCacheableEndpoint(payload: any): boolean {
    const cacheKey = this.getCacheKey(payload);
    return this.CACHEABLE_ENDPOINTS.has(cacheKey);
  }

  /**
   * Get cached response if available and fresh
   */
  private getCachedResponse(payload: any): any | null {
    const cacheKey = this.getCacheKey(payload);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }
    
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache API response for future use
   */
  private cacheResponse(payload: any, response: any): void {
    if (!this.isCacheableEndpoint(payload)) return;
    
    const cacheKey = this.getCacheKey(payload);
    const entry: CacheEntry<any> = {
      data: response,
      timestamp: Date.now(),
      ttl: this.RESPONSE_CACHE_TTL
    };
    
    this.responseCache.set(cacheKey, entry);
  }

  /**
   * Clear all caches (on logout or session change)
   */
  clearAllCaches(): void {
    this.clearCache();
    this.responseCache.clear();
    this.inFlightRequests.clear();
  }

  /**
   * Generic post method for API calls
   * Automatically appends comp_id and company_sec_id from cache
   * Also caches common read-only responses (categories, qualifications, etc.)
   * Implements Observable sharing to prevent duplicate concurrent requests
   */
  post(payload: any): Observable<any> {
    const cacheKey = this.getCacheKey(payload);
    
    // Check if response is cached first (before even fetching company_sec_id)
    const cachedResponse = this.getCachedResponse(payload);
    if (cachedResponse !== null) {
      return new Observable(observer => {
        observer.next(cachedResponse);
        observer.complete();
      });
    }

    // Check if same request is already in-flight (avoid concurrent duplicates)
    const inFlightRequest = this.inFlightRequests.get(cacheKey);
    if (inFlightRequest) {
      return inFlightRequest;
    }
    
    const request$ = this.fetchCompanySecId().pipe(
      map((companySecId) => this.appendCompIdToPayload(payload, companySecId)),
      switchMap((enhancedPayload) => {
        return this.http.post(this.apiUrl, enhancedPayload || {}).pipe(
          tap((response) => {
            this.cacheResponse(payload, response);
            // Keep in-flight Observable for 200ms after completion to catch late subscribers
            setTimeout(() => {
              this.inFlightRequests.delete(cacheKey);
            }, 200);
          }),
          catchError((error) => {
            // Remove from map on error after brief delay
            setTimeout(() => {
              this.inFlightRequests.delete(cacheKey);
            }, 200);
            return this.handleApiError(error);
          }),
          shareReplay(1)
        );
      })
    );

    // Store the in-flight request so concurrent calls can share it
    this.inFlightRequests.set(cacheKey, request$);
    return request$;
  }

  /**
   * Helper method to append comp_id from session to InputData
   */
  private appendCompIdToPayload(payload: any, companySecId: string): any {
    if (!payload) return payload;
    const session = this.sessionService.getSession();
    const compId = session?.comp_id || environment.comp_id;
    // Clone the payload to avoid mutating the original
    const enhancedPayload = JSON.parse(JSON.stringify(payload));
    
    // Append comp_id to each InputData item if not already present
    if (enhancedPayload.InputData && Array.isArray(enhancedPayload.InputData)) {
      enhancedPayload.InputData = enhancedPayload.InputData.map((item: any) => {
        const base = { ...item };
        if (!base.comp_id) base.comp_id = compId;
        if (!base.company_sec_id && companySecId) base.company_sec_id = companySecId;
        return base;
      });
    }
    
    return enhancedPayload;
  }

  postWithFiles(formData: FormData): Observable<any> {
    const session = this.sessionService.getSession();
    const compId = session?.comp_id || environment.comp_id;
    if (!formData.has('comp_id')) {
      formData.append('comp_id', compId);
    }
    return this.fetchCompanySecId().pipe(
      map((companySecId) => {
        if (companySecId && !formData.has('company_sec_id')) {
          formData.append('company_sec_id', companySecId);
        }
        return formData;
      }),
      switchMap((fd) => this.http.post(this.apiUrl, fd).pipe(catchError(this.handleApiError)))
    );
  }

  /**
   * Post helper that can handle file downloads (blob response)
   */
  postDownload(payload: any, isDownload: boolean = false): Observable<any> {
    return this.fetchCompanySecId().pipe(
      map((companySecId) => this.appendCompIdToPayload(payload, companySecId)),
      switchMap((enhancedPayload) => this.http.post(
        this.apiUrl,
        enhancedPayload || {},
        isDownload ? { responseType: 'blob' as 'json' } : {}
      ).pipe(catchError(this.handleApiError)))
    );
  }

  postBlob(payload: any): Observable<Blob> {
    return this.fetchCompanySecId().pipe(
      map((companySecId) => this.appendCompIdToPayload(payload, companySecId)),
      switchMap((enhancedPayload) => this.http.post(this.apiUrl, enhancedPayload || {}, { responseType: 'blob' }).pipe(catchError(this.handleApiError)))
    );
  }



  private handleApiError = (error: any) => {
    const status = error?.status;
    const serverMessage = error?.error?.message || error?.message;
    let message = 'Unexpected error occurred.';
    if (status === 0) {
      message = 'Network error. Please check your internet connection.';
    } else if (status >= 500) {
      message = serverMessage || 'Server error. Please try again later.';
    } else if (status === 404) {
      message = 'Endpoint not found.';
    } else if (status === 401 || status === 403) {
      message = 'Unauthorized. Please login again.';
    } else if (serverMessage) {
      message = serverMessage;
    }
    return throwError(() => ({ status, message, error }));
  }

  /**
   * Load parent categories
   * @returns Observable with parent categories data
   */
  loadParentCategories(): Observable<any> {
    const payload = {
      event: 'jcat',
      mode: 'pcat',
      InputData: [{ catId: '' }]
    };
    return this.post(payload);
  }

  /**
   * Load sub-categories based on parent category ID
   * @param catId Parent category ID
   * @returns Observable with sub-categories data
   */
  loadSubCategories(catId: string): Observable<any> {
    const payload = {
      event: 'jcat',
      mode: 'subc',
      InputData: [{ catId }]
    };
    return this.post(payload);
  }

  /**
   * Load specializations based on parent category ID and sub-category ID
   * @param catId Parent category ID
   * @param subCat Sub-category ID
   * @returns Observable with specializations data
   */
  loadSpecializations(catId: string, subCat: string): Observable<any> {
    const payload = {
      event: 'jcat',
      mode: 'subc',
      InputData: [{ catId, subCat }]
    };
    return this.post(payload);
  }

  /**
   * Load employees with optional search parameters
   * @param searchParams Optional search parameters (name, email, userType, page)
   * @returns Observable with employees data
   */
  loadEmployees(searchParams?: {
    name?: string;
    email?: string;
    userType?: string;
    page?: string;
  }): Observable<any> {
    const payload = {
      event: 'user',
      mode: 'lr',
      InputData: [{
        sname: searchParams?.name || '',
        semail: searchParams?.email || '',
        smember_type: searchParams?.userType || '',
        page: searchParams?.page || '1'
      }]
    };
    return this.post(payload);
  }

  /**
   * Load qualifications with optional search parameters
   * @param searchParams Optional search parameters (title, parentCategory, page)
   * @returns Observable with qualifications data
   */
  loadQualifications(searchParams?: {
    title?: string;
    parentCategory?: string;
    page?: string;
  }): Observable<any> {
    const payload = {
      event: 'qual',
      mode: 'lq',
      InputData: [{
        scat_title: searchParams?.title || '',
        sparCat: searchParams?.parentCategory || '',
        page: searchParams?.page || '1'
      }]
    };
    return this.post(payload);
  }

  /**
   * Load parent qualifications
   * @returns Observable with parent qualifications data
   */
  loadParentQualifications(): Observable<any> {
    const payload = {
      event: 'qual',
      mode: 'lpq',
      InputData: [{}]
    };
    return this.post(payload);
  }

  /**
   * Load projects with optional search parameters
   * @param searchParams Optional search parameters (projectName, status, clientName, page)
   * @returns Observable with projects data
   */
  loadProjects(searchParams?: {
    projectName?: string;
    status?: string;
    clientName?: string;
    page?: string;
  }): Observable<any> {
    const payload = {
      event: 'task',
      mode: 'lr',
      InputData: [{
        takeywrd: searchParams?.projectName || '',
        STask_status: searchParams?.status || '',
        sclient_name: searchParams?.clientName || '',
        page: searchParams?.page || '1',
        userType: '',
        sortto: '',
        sortby: 'DESC'
      }]
    };
    return this.post(payload);
  }

  /**
   * Load client list for project selection
   * @param page Optional page number
   * @returns Observable with client list data
   */
  loadClientList(page: string = '1'): Observable<any> {
    const payload = {
      event: 'client',
      mode: 'lr',
      InputData: [{
        page: page,
        sortby: 'DESC'
      }]
    };
    return this.post(payload);
  }

  /**
   * Load countries for jobseeker form
   * @returns Observable with country list data
   */
  loadCountries(): Observable<any> {
    const payload = {
      event: 'client',
      mode: 'acl',
      InputData: [{ countryid: '' }]
    };
    return this.post(payload);
  }

  /**
   * Load states with mapped response
   * @returns Observable with mapped states data [{stateID, stateName}]
   */
  loadStates(): Observable<any> {
    const payload = {
      event: 'city',
      mode: 'lc',
      InputData: [{}]
    };
    return new Observable(observer => {
      this.post(payload).subscribe({
        next: (response: any) => {
          if ((response as any)?.status === 'success' && response.data?.state) {
            const statesList = Object.entries(response.data.state).map(([stateID, stateName]) => ({
              stateID,
              stateName
            }));
            observer.next(statesList);
          } else {
            observer.error((response as any)?.message || 'Failed to fetch States.');
          }
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Load cities with mapped response
   * @param searchParams Optional search parameters
   * @returns Observable with mapped cities data {list, totalRecords, totalPages}
   */


  /**
   * Load locations (states/cities) filtered by country id
   * @param countryId country id to filter locations
   * @returns Observable with mapped location array
   */
  loadLocationsByCountry(countryId: string): Observable<any[]> {
    const payload = {
      event: 'client',
      mode: 'acl',
      InputData: [{ countryid: countryId }]
    };
    return this.post(payload).pipe(
      map((res: any) => {
        const list = res?.status === 'success' ? res.data?.list : (res?.list || null);
        if (Array.isArray(list)) return list;
        if (list && typeof list === 'object') return Object.entries(list).map(([id, item]: any) => ({ id, ...(item as any) }));
        return [];
      })
    );
  }

  /**
   * Load flat city list for a country using the `cbcid` API mode.
   * This returns an array of { id, name } suitable for city dropdowns.
   * Example request payload:
   * { event: 'client', mode: 'cbcid', InputData: [{ countryid: '56' }] }
   */
  loadCityListByCountry(countryId: string): Observable<any[]> {
    const payload = {
      event: 'client',
      mode: 'cbcid',
      InputData: [{ countryid: countryId }]
    };
    return this.post(payload).pipe(
      map((res: any) => {
        if (res?.status === 'success' && res.data?.list) {
          const list = res.data.list;
          if (Array.isArray(list)) return list as any[];
          if (list && typeof list === 'object') {
            return Object.entries(list).map(([id, name]: any) => ({ id: String(id), name }));
          }
        }
        return [];
      })
    );
  }

  /**
   * Fetch printable jobseeker profile for the given id
   * API Sample:
   * {
   *   event: 'jobseeker',
   *   mode: 'vr',
   *   InputData: [{ page: '1', id: '16074' }]
   * }
   */
  getJobseekerPrint(id: string, page: string = '1'): Observable<any> {
    const payload = {
      event: 'jobseeker',
      mode: 'vr',
      InputData: [{ page, id }]
    };
    return this.post(payload);
  }
}
