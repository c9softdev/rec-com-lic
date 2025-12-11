import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { Router } from '@angular/router';
import { User } from '../../core/models/auth.model';
import { MenuService } from '../../core/services/menu.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, interval } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { GlobalSettingsService, GlobalSettings } from '../../core/services/global-settings.service';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  // UI State Management
  isSidebarCollapsed = false;
  isProfileExpanded = false;
  isProfileDropdownOpen = false;
  expandedMenuId: number | null = null;
  sidebarOpen = false;
  isHamburgerActive = false;
  expandedSubmenuIds: Set<number> = new Set(); // Track all expanded submenus
  @ViewChild('profileDropdownRef') profileDropdownRef?: ElementRef<HTMLElement>;
  
  // Title texts for accessibility
  readonly MENU_EXPAND_TITLE = 'Expand Menu';
  readonly MENU_COLLAPSE_TITLE = 'Collapse Menu';
  readonly SUBMENU_EXPAND_TITLE = 'Expand Submenu';
  readonly SUBMENU_COLLAPSE_TITLE = 'Collapse Submenu';

  // Header widgets data - Timezones
  currentTimeIndia: string = '';
  currentTimeDubai: string = '';
  currentTimeLondon: string = '';
  currentTimeNewYork: string = '';
  userCountry: string = 'India'; // User's country, default to India

  // Header widgets data - Recruitment Stats
  activeJobOpenings: number = 0;
  pendingApplications: number = 0;
  scheduledInterviews: number = 0;
  unreadNotifications: number = 0;
  
  // Session data
  sessionTimeRemaining: string = '';
  loginTimestamp: number = 0;
  readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

  // Data
  currentUser: User | null = null;
  menuList: any[] = [];
  config: any = null;
  globalSettings: GlobalSettings | null = null;
  currentYear = new Date().getFullYear();

  // Loading States
  menuLoading = true;
  menuError = '';
  configLoading = true;
  configError = '';

  private destroy$ = new Subject<void>();
  private clockInterval: any = null;

  private router = inject(Router);

  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private menuService: MenuService,
    private sanitizer: DomSanitizer,
    private configService: ConfigService,
    private globalSettingsService: GlobalSettingsService,
    private sweetAlert: SweetAlertService
  , private loadingService: LoadingService
  ) {
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit(): void {

    // this.fetchMenu('1', '1');
    const session = this.sessionService.getSession();
    const userId = session?.userId || '0';
    const userType = session?.empType || '0';
    // console.log('Session Data:', session);
    this.fetchMenu(userId, userType);

    this.fetchConfig();
    this.loadGlobalSettings();
    this.initializeRecruitmentStats();

    // Initialize clock and session timer
    this.initializeClock();
    this.initializeSessionTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  /**
   * Initialize live clock showing IST and Dubai time
   */
  private initializeClock(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000); // Update every second
  }

  /**
   * Update current time display for India, Dubai, London, and New York
   */
  private updateClock(): void {
    const now = new Date();
    
    // India Time (UTC+5:30)
    const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    this.currentTimeIndia = indiaTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Dubai Time (UTC+4)
    const dubaiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    this.currentTimeDubai = dubaiTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // London Time (UTC+0/+1)
    const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    this.currentTimeLondon = londonTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // New York Time (UTC-5/-4)
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    this.currentTimeNewYork = nyTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  /**
   * Initialize and update session timer
   */
  private initializeSessionTimer(): void {
    this.loginTimestamp = Date.now();
    this.updateSessionTimer();
    
    // Update every second
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateSessionTimer();
    });
  }

  /**
   * Update session time elapsed (logged in since) display
   */
  private updateSessionTimer(): void {
    const elapsed = Date.now() - this.loginTimestamp;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    this.sessionTimeRemaining = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Initialize recruitment stats - these are sample values
   * In production, fetch from actual APIs
   */
  private initializeRecruitmentStats(): void {
    // TODO: Replace with actual API calls to fetch real data
    // These are placeholder values for demonstration
    this.activeJobOpenings = 12;
    this.pendingApplications = 45;
    this.scheduledInterviews = 8;
    this.unreadNotifications = 3;
  }

  // --- Data Fetching ---
  private fetchMenu(userId: string, userType: string): void {
    this.menuLoading = true;
    this.menuError = '';
    this.menuService.getMenu(userId, userType).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        console.log('Menu Response:', res);
        // server returns full menuList plus assignMenuStr (comma separated ids the user has access to)
        const rawMenu = res?.status === 'success' && res.data?.[0]?.menuList ? res.data[0].menuList : [];
        const assignStr = res?.data?.[0]?.assignMenuStr;
        // If assignMenuStr is empty or missing, assume full access (e.g., admin user)
        if (!assignStr || String(assignStr).trim() === '') {
          this.menuList = rawMenu;
        } else {
          const allowed = new Set(String(assignStr).split(',').map(s => s.trim()).filter(Boolean));
          // filter menu recursively so only allowed items (or parents of allowed items) remain
          this.menuList = this.filterMenu(rawMenu, allowed);
        }
        this.menuError = this.menuList.length ? '' : (res.message || 'Failed to retrieve menu data.');
        this.menuLoading = false;
      },
      error: () => {
        this.menuError = 'Failed to load menu.';
        this.menuLoading = false;
        this.menuList = [];
      }
    });
  }

  private fetchConfig(): void {
    this.configLoading = true;
    this.configError = '';
    this.configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.config = res?.status === 'success' && res.data ? res.data : null;
        this.configError = this.config ? '' : (res.message || 'Failed to retrieve configuration.');
        this.configLoading = false;
      },
      error: () => {
        this.configError = 'Failed to load configuration.';
        this.configLoading = false;
        this.config = null;
      }
    });
  }

  private loadGlobalSettings(): void {
    // Subscribe to settings changes instead of making duplicate API calls
    // Settings are loaded after login in auth service
    this.globalSettingsService.getSettings$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (settings) => {
        this.globalSettings = settings;
        console.log('Layout received settings update:', settings);
      }
    });
  }

  // --- UI Actions ---
  getSafeIcon(iconHtml: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(iconHtml);
  }

  // toggleSubmenu(menuId: number, hasSubmenu: boolean): void {
  //   if (this.isSidebarCollapsed && hasSubmenu) {
  //     this.isSidebarCollapsed = false;
  //     setTimeout(() => {
  //       this.expandedMenuId = this.expandedMenuId === menuId ? null : menuId;
  //     }, 300);
  //   } else {
  //     this.expandedMenuId = this.expandedMenuId === menuId ? null : menuId;
  //   }
  // }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.isSidebarCollapsed = !this.sidebarOpen;
    this.isHamburgerActive = this.sidebarOpen;
    
    // Close all submenus when collapsing
    if (this.isSidebarCollapsed) {
      this.collapseAllSubmenus();
    }
  }
  
  closeSidebar(): void {
    this.sidebarOpen = false;
    this.isSidebarCollapsed = true;
    this.isHamburgerActive = false;
    this.collapseAllSubmenus();
  }

  collapseAllSubmenus(): void {
    this.expandedMenuId = null;
    this.expandedSubmenuIds.clear();
    // Reset expanded state of all menu items
    if (this.menuList) {
      this.menuList.forEach(menu => {
        if (menu.submenuArr) {
          menu.submenuArr.forEach((sub: any) => {
            sub.expanded = false;
          });
        }
      });
    }
  }

  toggleSubmenu(menuId: number, hasSubmenu: boolean): void {
    if (this.isSidebarCollapsed && hasSubmenu) {
      this.isSidebarCollapsed = false;
      this.sidebarOpen = true;
      this.isHamburgerActive = true;
      setTimeout(() => {
        this.expandedMenuId = menuId;
        this.expandedSubmenuIds.add(menuId);
      }, 300);
    } else {
      if (this.expandedMenuId === menuId) {
        this.expandedMenuId = null;
        this.expandedSubmenuIds.delete(menuId);
      } else {
        this.expandedMenuId = menuId;
        this.expandedSubmenuIds.add(menuId);
      }
    }
  }

  getMenuItemTitle(item: any): string {
    if (!item) return '';
    let title = item.title || '';
    if (this.isSidebarCollapsed) {
      if (item.submenuArr?.length) {
        title += ' (Click to expand submenu)';
      }
    }
    return title;
  }

  ngAfterViewInit(): void {
    // Initialize sidebar state after login
    if (this.authService.currentUserValue) {
      setTimeout(() => {
        this.sidebarOpen = true;
        this.isSidebarCollapsed = false;
        this.isHamburgerActive = true;
      });
    }
  }

  // Handle window resize
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth <= 900) {
      // Mobile view - ensure proper collapsed state
      if (!this.isSidebarCollapsed) {
        this.closeSidebar();
      }
    }
  }

  toggleProfile(): void {
    this.isProfileExpanded = !this.isProfileExpanded;
  }

  toggleProfileDropdown(event: Event): void {
    event.preventDefault();
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }

  closeProfileDropdown(): void {
    this.isProfileDropdownOpen = false;
  }

  // Close the profile dropdown when clicking outside of it
  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isProfileDropdownOpen) return;
    const target = event.target as Node | null;
    const container = this.profileDropdownRef?.nativeElement;
    if (container && target && !container.contains(target)) {
      this.isProfileDropdownOpen = false;
    }
  }

  logout(): void {
    this.sweetAlert.confirmStatusChange('Are you sure you want to logout?').then((result: any) => {
      if (result.isConfirmed) {
    this.loadingService.show('Logging out...');
    // allow UI to show spinner briefly, then perform logout
    setTimeout(() => {
      this.loadingService.hide();
      this.authService.logout();
      this.router.navigate(['/login']);
    }, 250);
  }
    });
  }

  // --- Menu Navigation ---
  /**
   * Converts a menu title to a route (e.g., 'Job Category' -> '/job-category')
   * and validates if the user has access to that route in their menuList.
   */
  getAngularRoute(title: string): string | null {
    if (!title) return null;
    // Special-cases: server menu titles that don't map directly to a hyphenated route
    const specialMap: Record<string, string> = {
      'add jobseeker/cv': '/jobseeker-manager/add',
      'assign cv manager': '/assign-cv-manager'
    };
    const normalizedTitle = (title || '').toLowerCase().trim();
    const special = specialMap[normalizedTitle];
    
    // If it's a special mapping, return it directly without checking menu
    if (special) {
      return special;
    }
    
    const route = '/' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
    return this.hasRouteInMenu(route) ? route : null;
  }

  /**
   * Recursively checks if a route exists in the menuList or its submenus.
   */
  private hasRouteInMenu(route: string, menuList: any[] = this.menuList): boolean {
    for (const item of menuList) {
      const itemRoute = '/' + (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
      if (itemRoute === route) return true;
      if (item.submenuArr && this.hasRouteInMenu(route, item.submenuArr)) return true;
      if (item.submenuArr2 && this.hasRouteInMenu(route, item.submenuArr2)) return true;
    }
    return false;
  }

  /**
   * Recursively filter a server-provided menu list using a set of allowed ids.
   * Includes a parent item if its id is allowed or any of its children are allowed.
   */
  private filterMenu(menuList: any[], allowed: Set<string>): any[] {
    if (!Array.isArray(menuList)) return [];
    const out: any[] = [];
    for (const item of menuList) {
      const id = item?.id != null ? String(item.id) : '';
      // clone basic item to avoid mutating original
      const cloned: any = { ...item };
      // recursively filter child arrays
      if (Array.isArray(item.submenuArr)) {
        cloned.submenuArr = this.filterMenu(item.submenuArr, allowed);
      } else {
        cloned.submenuArr = [];
      }
      if (Array.isArray(item.submenuArr2)) {
        cloned.submenuArr2 = this.filterMenu(item.submenuArr2, allowed);
      } else {
        cloned.submenuArr2 = [];
      }
      // include this item when its id is allowed or any child remains
      if ((id && allowed.has(id)) || (cloned.submenuArr && cloned.submenuArr.length) || (cloned.submenuArr2 && cloned.submenuArr2.length)) {
        out.push(cloned);
      }
    }
    return out;
  }

  onMenuItemClick(menuItem: any, event: Event): void {
    event.stopPropagation();
    if (menuItem.submenuArr?.length) {
      this.toggleSubmenu(menuItem.id, true);
      return;
    }
    if (menuItem.submenuArr2?.length) {
      menuItem.expanded = !menuItem.expanded;
      return;
    }
    const angularRoute = this.getAngularRoute(menuItem.title);
    if (angularRoute) {
      if (this.router.url === angularRoute) {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate([angularRoute]);
        });
      } else {
        this.router.navigate([angularRoute]);
      }
      if (this.isSidebarCollapsed) {
        this.sidebarOpen = true;
        this.isSidebarCollapsed = false;
        this.isHamburgerActive = true;
      }
    }
  }
}
 
