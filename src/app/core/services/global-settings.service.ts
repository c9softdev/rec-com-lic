import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ThemeService } from './theme.service';
import { SessionService } from './session.service';
import { environment } from '../../../environments/environment';
import { CommonService } from './common.service';

// API Request interfaces
export interface ApiRequestInput {
  // No longer using sec_key - using comp_id instead
  // sec_key: string;
  [key: string]: any;  // Allow any properties for flexibility
}

export interface ApiRequest {
  event: string;
  mode: string;
  InputData: ApiRequestInput[];
}

// API Response interfaces
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

// Global Settings interface matching your API response
export interface GlobalSettings {
  setting_id: string;
  company_id: string;
  plan: string;
  diffDate: string;
  int_employee_cnt: string;
  int_jobseeker_cnt: string;
  display_errors: string;
  app_root_path: string;
  app_root_url: string;
  site_name: string;
  site_com: string;
  img_size: string;
  doc_size: string;
  user_paging: string;
  email_to: string;
  admin_paging: string;
  email_from: string;
  email_bcc: string;
  footer_txt: string;
  var_footercprgt: string;
  var_logo_url: string;
  var_logo_client: string;
  var_version: string;
  var_primary_cc?: string;
  var_secondary_cc?: string;
  var_title?: string;
  var_extra_fld?: string;
  export_excel_limit?: string;
  var_foot_email: string;
  google_analytics?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalSettingsService {
  // Default settings to use if API fails
  private defaultSettings: GlobalSettings = {
    setting_id: '',
    company_id: '',
    plan: '',
    diffDate: '',
    int_employee_cnt: '5',
    int_jobseeker_cnt: '20000',
    display_errors: '1',
    app_root_path: 'NA',
    app_root_url: '',
    site_name: 'C9 Softwares and Solutions',
    site_com: '',
    img_size: '1572864',
    doc_size: '2048',
    user_paging: '12',
    email_to: 'admin@c9soft.com',
    admin_paging: '50',
    email_from: 'admin@c9soft.com',
    email_bcc: '',
    footer_txt: 'C9 Soft is New Delhi based Company.',
    var_footercprgt: 'C9 Softwares & Solutions',
    var_logo_url: '',
    var_logo_client: '',
    var_version: 'Version 1.0.1',
    var_title: 'Recruitment System',
    var_extra_fld: '',
    export_excel_limit: '0',
    var_foot_email: 'admin@c9soft.com',
    google_analytics: '',
    var_primary_cc: '#5C0632',
    var_secondary_cc: '#1572E8'
  };

  private settings: GlobalSettings | null = null;
  private settingsSubject = new BehaviorSubject<GlobalSettings>(this.defaultSettings);
  public settings$ = this.settingsSubject.asObservable();
  
  // License cache - NOT USED in this version
  // private licenseCache: { response: any; timestamp: number } | null = null;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private commonService: CommonService,
    private sessionService: SessionService
  ) {
    // Initialize with defaults
    this.settings = this.defaultSettings;
  }

  // ===== LICENSE VALIDATION - COMMENTED OUT (NOT USED) =====
  // /**
  //  * License check with raw response and optional TTL cache.
  //  * Use in guards to block navigation if invalid.
  //  */
  // validateLicenseCached(ttlMs: number = 120000): Observable<any> {
  //   // Serve cached result if still fresh
  //   if (this.licenseCache && (Date.now() - this.licenseCache.timestamp) < ttlMs) {
  //     return of(this.licenseCache.response);
  //   }
  //
  //   const requestBody = {
  //     event: 'msp',
  //     mode: 'gloConfig',
  //     InputData: [
  //       {
  //         domain: 'c9soft.com',
  //         sec_key: 'sXOIcYFFiZUGSCe1WgE8wFZrSXk4aHBuUEpBMUk3dDJyVk9uU1E9PQ==',
  //         client_id: '11'
  //       }
  //     ]
  //   };
  //
  //   return this.http.post<any>(environment.apiUrlLic, requestBody).pipe(
  //     tap((res) => {
  //       this.licenseCache = { response: res, timestamp: Date.now() };
  //     }),
  //     catchError((error) => {
  //       const failed = { status: 'failed', message: error?.message || 'Failed to validate license', data: [] };
  //       this.licenseCache = { response: failed, timestamp: Date.now() };
  //       return of(failed);
  //     })
  //   );
  // }
  // ===== END LICENSE VALIDATION (COMMENTED OUT) =====

  /**
   * Load global settings from the API
   * @param companyId Optional company ID for the settings. Uses hardcoded "11" if not provided.
   * @returns Observable of GlobalSettings
   */
  loadGlobalSettings(companyId: string = ''): Observable<GlobalSettings> {
    const requestBody: ApiRequest = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [
        {
          comp_id: companyId
        } as any
      ]
    };

    return this.commonService.post(requestBody).pipe(
      map(response => {
        if (response.status === 'success') {
          // Merge API response with defaults - API values take precedence
          // console.log('GS Setting:', response.data);
          const settings = {
            ...this.defaultSettings,
            ...response.data,
            var_primary_cc: response.data.var_primary_cc || this.defaultSettings.var_primary_cc,
            var_secondary_cc: response.data.var_secondary_cc || this.defaultSettings.var_secondary_cc
          };
          return settings;
        } else {
          throw new Error(response.message || 'Failed to load settings');
        }
      }),
      tap(settings => {
        // Update internal state
        this.settings = settings;
        // Emit to all subscribers
        this.settingsSubject.next(settings);
        // Apply theme and other settings
        this.applySettings(settings);
        // Do not store company_sec_id; always use fresh value from config per request
      }),
      catchError(error => {
        // Error handled silently, falling back to default settings
        this.settings = this.defaultSettings;
        this.settingsSubject.next(this.defaultSettings);
        this.applySettings(this.defaultSettings);
        return of(this.defaultSettings);
      })
    );
  }


  /**
   * Update specific settings values and emit to all subscribers
   * This allows partial updates without clearing all caches
   * @param updates Partial settings object with values to update
   */
  updateSettings(updates: Partial<GlobalSettings>): void {
    if (!this.settings) {
      this.settings = this.defaultSettings;
    }
    
    // Merge updates into current settings
    this.settings = {
      ...this.settings,
      ...updates
    };
    
    // Emit the updated settings to all subscribers
    this.settingsSubject.next(this.settings);
    
    // Apply theme and other settings if colors changed
    this.applySettings(this.settings);
  }

  /**
   * Get the current global settings
   * @returns The current global settings or default if not loaded
   */
  getSettings(): GlobalSettings {
    return this.settings || this.defaultSettings;
  }

  /**
   * Get settings as observable to subscribe to changes
   * @returns Observable that emits whenever settings change
   */
  getSettings$(): Observable<GlobalSettings> {
    return this.settings$;
  }

  /**
   * Reset settings to defaults (useful for logout)
   */
  resetToDefaults(): void {
    this.settings = this.defaultSettings;
    this.settingsSubject.next(this.defaultSettings);
    this.applySettings(this.defaultSettings);
  }

  /**
   * Apply the settings to the application
   * @param settings The settings to apply
   */
  private applySettings(settings: GlobalSettings): void {
    // Apply theme colors - this will override any previously set theme
    if (settings.var_primary_cc) {
      this.themeService.updatePrimaryColor(settings.var_primary_cc);
    }

    if (settings.var_secondary_cc) {
      this.themeService.setTheme({
        secondaryColor: settings.var_secondary_cc
      });
    }

    // Apply other settings as needed
    // Update document title with site name
    if (settings.site_name) {
      document.title = settings.site_name;
    }

    // Update CSS custom properties for theme colors
    this.updateThemeColors(settings);
  }

  /**
   * Update CSS custom properties for theme colors
   * @param settings The settings containing theme colors
   */
  private updateThemeColors(settings: GlobalSettings): void {
    const root = document.documentElement;
    
    if (settings.var_primary_cc) {
      root.style.setProperty('--primary-color', settings.var_primary_cc);
      
      // Convert hex to RGB for rgba functions
      const hex = settings.var_primary_cc.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      root.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
      
      // Calculate darker and lighter variants
      const darker = this.adjustColor(settings.var_primary_cc, -20);
      const lighter = this.adjustColor(settings.var_primary_cc, 20);
      root.style.setProperty('--primary-color-dark', darker);
      root.style.setProperty('--primary-color-light', lighter);
    }

    if (settings.var_secondary_cc) {
      root.style.setProperty('--secondary-color', settings.var_secondary_cc);
    }
  }

  /**
   * Adjust color brightness
   * @param hex The hex color
   * @param percent The percentage to adjust (-100 to 100)
   * @returns The adjusted hex color
   */
  private adjustColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
}
