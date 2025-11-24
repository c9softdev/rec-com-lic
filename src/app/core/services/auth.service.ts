import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User } from '../models/auth.model';
import { SessionService, UserSession } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private tempUsername: string = '';
  private tempUserId: string = '';
  private emailId: string = '';
  getSession: any;
  empResponse: any;

  constructor(private http: HttpClient, private sessionService: SessionService) {
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

  verifyUsername(username: string): Observable<LoginResponse> {
    const request: LoginRequest = {
      event: 'login',
      mode: 'authenticate',
      InputData: [{ Username: username }]
    };

    return this.http.post<LoginResponse>(environment.apiUrl, request)
      .pipe(
        map(response => {
          if (response.status === 'success' && !response.message && response.data?.length) {
            this.tempUsername = username;
            this.tempUserId = response.data[0].userId;
          }
          return response;
        })
      );
  }

  verifyPassword(password: string): Observable<LoginResponse> {
    if (!this.tempUsername) {
      throw new Error('No username captured. Please verify username first.');
    }

    const request: LoginRequest = {
      event: 'login',
      mode: 'next',
      InputData: [{ 
        Username: this.tempUsername,
        Password: password 
      }]
    };

    return this.http.post<LoginResponse>(environment.apiUrl, request)
      .pipe(
        map(response => {
          if (response.status === 'success' && !response.message) {
            this.empResponse = response.data;
            // Create full user object
            // console.log('Storing this full user data:', this.empResponse);
            // return response;
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
            // temp vars remain in memory only
          }
          return response;
        })
      );
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

    return this.http.post<LoginResponse>(environment.apiUrl, request);
  }

  logout() {
    // Remove user from local storage and set current user to null
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('partialUser');
    // Clear session data and activity store to ensure guards block access
    try { localStorage.removeItem('app_session'); } catch {}
    try { localStorage.removeItem('user_session'); } catch {}
    try { this.sessionService.clear(); } catch {}
    this.currentUserSubject.next(null);
  }
}