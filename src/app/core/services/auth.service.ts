import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User } from '../models/auth.model';
import { SessionService, UserSession } from './session.service';
import { GlobalSettingsService } from './global-settings.service';
import { CommonService } from './common.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private tempUsername: string = '';
  private tempUserId: string = '';
  private tempCompanyId: string = '';
  private emailId: string = '';
  getSession: any;
  empResponse: any;

  constructor(private http: HttpClient, private sessionService: SessionService, private globalSettingsService: GlobalSettingsService, private commonService: CommonService) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('currentUser') || 'null')
    );
    this.currentUser = this.currentUserSubject.asObservable();
    // Hydrate currentUser from persisted app_session on hard refresh
    if (!this.currentUserSubject.value) {
      try {
        const raw = localStorage.getItem('app_session');
        if (raw) {
          const s = JSON.parse(raw);
          const hydrated: User = {
            userId: String(s.userId || ''),
            username: String(s.username || ''),
            empType: String(s.empType || ''),
            assignmenuIdStr: String(s.assignmenuIdStr || ''),
            printresumechk: String(s.printresumechk || ''),
            editresumechk: String(s.editresumechk || ''),
            viewresumechk: String(s.viewresumechk || ''),
            archivalchk: String(s.archivalchk || ''),
            deleteOption: String(s.deleteOption || ''),
            optionN1: String(s.optionN1 || ''),
            optionN2: String(s.optionN2 || '')
          };
          this.currentUserSubject.next(hydrated);
          // ensure activity timer is alive
          this.sessionService.init();
        }
      } catch {}
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  verifyUsername(username: string, companyId: string = '11'): Observable<LoginResponse> {
    this.tempCompanyId = companyId;
    const request: LoginRequest = {
      event: 'login',
      mode: 'authenticate',
      InputData: [{ 
        Username: username,
        comp_id: companyId  // Pass company ID in the login payload
      }]
    };

    return this.commonService.post(request)
      .pipe(
        map(response => {
          if (response.status === 'success' && response.data?.length) {
            this.tempUsername = username;
            this.tempUserId = response.data[0].userId;
          }
          return response;
        })
      );
  }

  verifyPassword(password: string, companyId: string = '11'): Observable<LoginResponse> {
    if (!this.tempUsername) {
      throw new Error('No username captured. Please verify username first.');
    }

    this.tempCompanyId = companyId;
    const request: LoginRequest = {
      event: 'login',
      mode: 'next',
      InputData: [{ 
        Username: this.tempUsername,
        Password: password,
        comp_id: companyId  // Pass company ID in password verification payload
      }]
    };

    return this.commonService.post(request)
      .pipe(
        map(response => {
          if (response.status === 'success') {
            this.empResponse = response.data;
            const mappedEmpType = String(this.empResponse?.chrType || this.empResponse?.empType || '');
            const user: User = {
              username: this.tempUsername,
              userId: this.tempUserId,
              empType: mappedEmpType,
              assignmenuIdStr: this.empResponse.assignmenuIdStr,
              printresumechk: this.empResponse.printresumechk,
              editresumechk: this.empResponse.editresumechk,
              viewresumechk: this.empResponse.viewresumechk,
              deleteOption: this.empResponse.deleteOption,              
              optionN1: this.empResponse.optionN1,
              optionN2: this.empResponse.optionN2,
              archivalchk: this.empResponse.archivalchk,
              emailId: this.empResponse.EmailId || this.empResponse.emailId || this.empResponse.email || ''
            };
            const sess: UserSession = {
              userId: String(user.userId || this.tempUserId || ''),
              username: String(user.username || this.tempUsername || ''),
              comp_id: this.tempCompanyId,
              empType: mappedEmpType,
              assignmenuIdStr: String(user.assignmenuIdStr || ''),
              archivalchk: String(user.archivalchk || ''),
              editresumechk: String(user.editresumechk || ''),
              printresumechk: String(user.printresumechk || ''),
              viewresumechk: String(user.viewresumechk || ''),
              deleteOption: String(user.deleteOption || ''),
              optionN1: String(user.optionN1 || ''),
              optionN2: String(user.optionN2 || ''),
              emailId: user.emailId || ''
            };
            this.sessionService.setSession(sess);
            this.sessionService.init();
            this.currentUserSubject.next(user);
            this.loadGlobalSettingsInBackground();
          }
          return response;
        })
      );
  }

  /**
   * Load global settings in background after successful login
   * Uses the company ID provided during login
   */
  private loadGlobalSettingsInBackground(): void {
    // Use the company_id from login, or default to "11"
    const companyId = this.tempCompanyId || '11';
    
    this.globalSettingsService.loadGlobalSettings(companyId).subscribe({
      next: (settings) => {
        console.log('Global settings loaded after login for company:', companyId, settings);
        // Settings are automatically applied by GlobalSettingsService
      },
      error: (error) => {
        console.error('Failed to load global settings after login:', error);
        // System will continue with default settings
      }
    });
  }

  // Deprecated: use SessionService instead

  changePassword(oldPassword: string, newPassword: string): Observable<LoginResponse> {
    const currentUser = this.currentUserValue;
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const request = {
      event: 'changepassword',
      mode: 'changePwdSave',
      InputData: [{
        Username: currentUser.username,
        oldPassword: oldPassword,
        newPassword: newPassword
      }]
    };

    return this.commonService.post(request);
  }

  logout() {
    // Remove user from local storage and set current user to null
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('partialUser');
    // Clear session data and activity store to ensure guards block access
    try { localStorage.removeItem('app_session'); } catch {}
    try { localStorage.removeItem('user_session'); } catch {}
    try { this.sessionService.clear(); } catch {}
    // Reset global settings to defaults on logout
    try { this.globalSettingsService.resetToDefaults(); } catch {}
    this.currentUserSubject.next(null);
  }
}
