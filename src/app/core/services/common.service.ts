import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Generic post method for API calls
   */
  post(payload: any): Observable<any> {
    // Always attach security key when available
    const body = {
      ...(payload || {}),
      sec_key: environment.sec_key
    };
    return this.http.post(this.apiUrl, body);
  }

  postWithFiles(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  /**
   * Post helper that can handle file downloads (blob response)
   */
  postDownload(payload: any, isDownload: boolean = false): Observable<any> {
    return this.http.post(
      this.apiUrl,
      payload,
      isDownload ? { responseType: 'blob' as 'json' } : {}
    );
  }

  postBlob(payload: any): Observable<Blob> {
    const body = { ...(payload || {}), sec_key: environment.sec_key };
    return this.http.post(this.apiUrl, body, { responseType: 'blob' });
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
        next: (response) => {
          if (response?.status === 'success' && response.data?.state) {
            const statesList = Object.entries(response.data.state).map(([stateID, stateName]) => ({
              stateID,
              stateName
            }));
            observer.next(statesList);
          } else {
            observer.error(response?.message || 'Failed to fetch States.');
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