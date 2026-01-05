import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UserSession {
  userId: string;
  username: string;
  comp_id?: string;  // Company ID for multi-tenant support
  empType?: string;
  assignmenuIdStr?: string;
  archivalchk?: string;
  editresumechk?: string;
  printresumechk?: string;
  viewresumechk?: string;
  dtm_expiry?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private static readonly STORAGE_KEY = 'app_session';
  private static readonly ACTIVITY_KEY = 'user_session';

  private session: UserSession | null = null;
  private menuIdSet: Set<string> = new Set();

  private readonly timeoutMs = 60 * 60 * 1000; // 1 hour
  private intervalId: any = null;
  private readonly activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

  constructor(private router: Router, private ngZone: NgZone) {
    this.loadFromStorage();
  }

  // --- Session data (privileges & menus) ---
  setSession(session: UserSession): void {
    this.session = session || null;
    this.menuIdSet = this.computeMenuIdSet(session?.assignmenuIdStr);
    try { localStorage.setItem(SessionService.STORAGE_KEY, JSON.stringify(session)); } catch {}
    // also seed activity store
    this.seedActivityStore();
  }

  updateSession(partial: Partial<UserSession>): void {
    const merged = { ...(this.session || {}), ...(partial || {}) } as UserSession;
    this.setSession(merged);
  }

  clear(): void {
    this.session = null;
    this.menuIdSet.clear();
    try { localStorage.removeItem(SessionService.STORAGE_KEY); } catch {}
    try { sessionStorage.removeItem('company_sec_id_cache'); } catch {}
    this.stop();
  }

  getSession(): UserSession | null {
    if (!this.session) this.loadFromStorage();
    return this.session;
  }

  hasPrivilege(flagName: string): boolean {
    if (!flagName) return false;
    
    // Super admin (comp_id === superAdminID) has all privileges
    if (this.session?.comp_id === environment.superAdminID) {
      return true;
    }
    
    const val = (this.session as any)?.[flagName];
    return val === '1' || val === 1 || val === true;
  }
  hasAnyPrivilege(flags: string[]): boolean { return Array.isArray(flags) && flags.some(f => this.hasPrivilege(f)); }
  private allMenusAllowed(): boolean { return this.menuIdSet.size === 0; }
  hasMenu(menuId: string | number): boolean {
    if (!this.session) this.loadFromStorage();
    if (this.allMenusAllowed()) return true;
    return menuId !== undefined && menuId !== null && this.menuIdSet.has(String(menuId));
  }
  hasAnyMenu(menuIds: Array<string|number>): boolean {
    if (!this.session) this.loadFromStorage();
    if (this.allMenusAllowed()) return true;
    return Array.isArray(menuIds) && menuIds.some(id => this.hasMenu(id));
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(SessionService.STORAGE_KEY);
      if (raw) {
        const parsed: UserSession = JSON.parse(raw);
        this.session = parsed;
        this.menuIdSet = this.computeMenuIdSet(parsed?.assignmenuIdStr);
      }
    } catch {
      this.session = null;
      this.menuIdSet.clear();
    }
  }
  private computeMenuIdSet(assignStr?: string): Set<string> {
    if (!assignStr) return new Set();
    return new Set(String(assignStr).split(',').map(s => s.trim()).filter(Boolean));
  }

  // --- Activity timeout ---
  init(): void { this.start(); }

  start(): void {
    this.stop();
    this.updateExpiry(Date.now());
    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach((e) => window.addEventListener(e, this.onActivity, { passive: true }));
    });
    this.intervalId = setInterval(() => {
      const raw = localStorage.getItem(SessionService.ACTIVITY_KEY);
      if (!raw) return;
      try {
        const store = JSON.parse(raw);
        if (!store.expiresAt || Date.now() > store.expiresAt) {
          this.ngZone.run(() => {
            try { localStorage.removeItem(SessionService.STORAGE_KEY); } catch {}
            try { localStorage.removeItem(SessionService.ACTIVITY_KEY); } catch {}
            this.router.navigate(['/login'], { queryParams: { unauth: '1' } });
          });
        }
      } catch {}
    }, 15000);
  }

  bump(): void { this.updateExpiry(Date.now()); }

  private onActivity = (): void => { this.updateExpiry(Date.now()); };

  private updateExpiry(activityTime: number): void {
    try {
      const raw = localStorage.getItem(SessionService.ACTIVITY_KEY);
      const store = raw ? JSON.parse(raw) : {};
      store.lastActivity = activityTime;
      store.expiresAt = activityTime + this.timeoutMs;
      localStorage.setItem(SessionService.ACTIVITY_KEY, JSON.stringify(store));
    } catch {}
  }

  private seedActivityStore(): void {
    try {
      const raw = localStorage.getItem(SessionService.ACTIVITY_KEY);
      if (!raw) this.updateExpiry(Date.now());
    } catch {}
  }

  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.activityEvents.forEach((e) => window.removeEventListener(e, this.onActivity));
  }
}
