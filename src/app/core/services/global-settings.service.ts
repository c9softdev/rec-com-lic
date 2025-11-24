import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ThemeService } from './theme.service';
import { environment } from '../../../environments/environment';

// API Request interfaces
export interface ApiRequestInput {
  sec_key: string;
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
  display_errors: string;
  app_root_path: string;
  app_root_url: string;
  site_name: string;
  site_com: string;
  img_size: string;
  user_paging: string;
  email_to: string;
  admin_paging: string;
  email_from: string;
  email_bcc: string;
  google_analytics: string;
  footer_txt: string;
  var_footercprgt: string;
  var_logo_url: string;
  var_logo_client: string;
  var_version: string;
  var_foot_email: string;
  export_excel_limit?: string;
  // Theme properties from API
  var_primary_cc?: string;
  var_secondary_cc?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalSettingsService {
  // Default settings to use if API fails
  private defaultSettings: GlobalSettings = {
    setting_id: '1',
    display_errors: '1',
    app_root_path: 'NA',
    app_root_url: '',
    site_name: 'C9 Softwares and Solutions',
    site_com: '',
    img_size: '1572864',
    user_paging: '12',
    email_to: 'admin@c9soft.com',
    admin_paging: '50',
    email_from: 'admin@c9soft.com',
    email_bcc: '',
    google_analytics: '',
    footer_txt: 'C9 Soft is New Delhi based Company.',
    var_footercprgt: 'C9 Softwares & Solutions',
    var_logo_url: '',
    var_logo_client: '',
    var_version: 'Version 1.0.1',
    var_foot_email: 'admin@c9soft.com',
    export_excel_limit: '0',
    var_primary_cc: '#5C0632',
    var_secondary_cc: '#1572E8'
  };

  private settings: GlobalSettings | null = null;
  // Simple TTL cache for license validation to reduce repeated calls.
  private licenseCache: { response: any; timestamp: number } | null = null;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  /**
   * License check with raw response and optional TTL cache.
   * Use in guards to block navigation if invalid.
   */
  validateLicenseCached(ttlMs: number = 120000): Observable<any> {
    // Serve cached result if still fresh
    if (this.licenseCache && (Date.now() - this.licenseCache.timestamp) < ttlMs) {
      return of(this.licenseCache.response);
    }

    const requestBody = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [
        {
          domain: 'c9soft.com',
          sec_key: 'sXOIcYFFiZUGSCe1WgE8wFZrSXk4aHBuUEpBMUk3dDJyVk9uU1E9PQ==',
          client_id: '11'
        }
      ]
    };

    return this.http.post<any>(environment.apiUrlLic, requestBody).pipe(
      tap((res) => {
        this.licenseCache = { response: res, timestamp: Date.now() };
      }),
      catchError((error) => {
        const failed = { status: 'failed', message: error?.message || 'Failed to validate license', data: [] };
        this.licenseCache = { response: failed, timestamp: Date.now() };
        return of(failed);
      })
    );
  }

  /**
   * Load global settings from the API
   * @returns Observable of GlobalSettings
   */
  loadGlobalSettings(): Observable<GlobalSettings> {
    const requestBody: ApiRequest = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [
        {
          sec_key: 'Bw5EDNlJgDEH0wRBiNguSis3aGlOb29BeVFMSmYrcU5kR01jdGc9PQ==' 
        }
      ]
    };

    return this.http.post<ApiResponse<GlobalSettings>>(environment.apiUrl, requestBody).pipe(
      map(response => {
        if (response.status === 'success') {
          // Merge with default theme colors if not provided by API
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
        this.settings = settings;
        this.applySettings(settings);
      }),
      catchError(error => {
        console.error('Error loading global settings:', error);
        // Fall back to default settings
        this.settings = this.defaultSettings;
        this.applySettings(this.defaultSettings);
        return of(this.defaultSettings);
      })
    );
  }


  /**
   * Get the current global settings
   * @returns The current global settings or default if not loaded
   */
  getSettings(): GlobalSettings {
    return this.settings || this.defaultSettings;
  }

  /**
   * Apply the settings to the application
   * @param settings The settings to apply
   */
  private applySettings(settings: GlobalSettings): void {
    // Apply theme colors
    if (settings.var_primary_cc) {
      this.themeService.updatePrimaryColor(settings.var_primary_cc);
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