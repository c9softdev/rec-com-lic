import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ThemeColors {
  primaryColor: string;
  primaryColorRgb: string;
  primaryColorDark: string;
  primaryColorLight: string;
  textOnPrimary: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  secondaryColor: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Default theme colors
  private defaultTheme: ThemeColors = {
    primaryColor: '#5C0632',
    primaryColorRgb: '92, 6, 50',
    primaryColorDark: '#4a0528',
    primaryColorLight: '#7c084a',
    textOnPrimary: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    textColor: '#575962',
    borderColor: '#ebedf2',
    secondaryColor: '#1572E8'
  };

  private currentThemeSubject = new BehaviorSubject<ThemeColors>(this.defaultTheme);
  public currentTheme$: Observable<ThemeColors> = this.currentThemeSubject.asObservable();

  constructor() {
    // Initialize theme from localStorage or use default
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const savedTheme = sessionStorage.getItem('appTheme');
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        this.setTheme(parsedTheme);
      } catch (e) {
        console.error('Error parsing saved theme:', e);
        this.resetToDefaultTheme();
      }
    } else {
      this.applyTheme(this.defaultTheme);
    }
  }

  /**
   * Set a new theme
   * @param theme The new theme colors
   */
  public setTheme(theme: Partial<ThemeColors>): void {
    const newTheme = { ...this.currentThemeSubject.value, ...theme };
    this.currentThemeSubject.next(newTheme);
    this.applyTheme(newTheme);
    // Always update sessionStorage to keep theme in sync
    try {
      sessionStorage.setItem('appTheme', JSON.stringify(newTheme));
    } catch (e) {
      console.warn('Could not save theme to sessionStorage:', e);
    }
  }

  /**
   * Reset to the default theme
   */
  public resetToDefaultTheme(): void {
    this.setTheme(this.defaultTheme);
  }

  /**
   * Apply theme by setting CSS variables
   * @param theme The theme to apply
   */
  private applyTheme(theme: ThemeColors): void {
    document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
    document.documentElement.style.setProperty('--primary-color-rgb', theme.primaryColorRgb);
    document.documentElement.style.setProperty('--primary-color-dark', theme.primaryColorDark);
    document.documentElement.style.setProperty('--primary-color-light', theme.primaryColorLight);
    document.documentElement.style.setProperty('--text-on-primary', theme.textOnPrimary);
    document.documentElement.style.setProperty('--background-color', theme.backgroundColor);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    document.documentElement.style.setProperty('--border-color', theme.borderColor);
    document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor);
    
    // Set contrast-aware error color based on primary background brightness
    const errorColor = this.getContrastAwareErrorColor(theme.primaryColor);
    document.documentElement.style.setProperty('--error-color', errorColor);
  }

  /**
   * Update primary color and calculate related colors
   * @param color The new primary color
   */
  public updatePrimaryColor(color: string): void {
    // Compute inverted color (complementary) for readable text on primary
    const invertColor = (hex: string): string => {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      const ir = 255 - r;
      const ig = 255 - g;
      const ib = 255 - b;
      return `#${ir.toString(16).padStart(2, '0')}${ig.toString(16).padStart(2, '0')}${ib.toString(16).padStart(2, '0')}`;
    };
    // Simple function to darken a hex color by percentage
    const darkenColor = (hex: string, percent: number): string => {
      // Convert hex to RGB
      let r = parseInt(hex.substring(1, 3), 16);
      let g = parseInt(hex.substring(3, 5), 16);
      let b = parseInt(hex.substring(5, 7), 16);

      // Darken
      r = Math.max(0, Math.floor(r * (1 - percent / 100)));
      g = Math.max(0, Math.floor(g * (1 - percent / 100)));
      b = Math.max(0, Math.floor(b * (1 - percent / 100)));

      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Simple function to lighten a hex color by percentage
    const lightenColor = (hex: string, percent: number): string => {
      // Convert hex to RGB
      let r = parseInt(hex.substring(1, 3), 16);
      let g = parseInt(hex.substring(3, 5), 16);
      let b = parseInt(hex.substring(5, 7), 16);

      // Lighten
      r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
      g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
      b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Convert hex to RGB for CSS variable
    const hexToRgb = (hex: string): string => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };

    this.setTheme({
      primaryColor: color,
      primaryColorRgb: hexToRgb(color),
      primaryColorDark: darkenColor(color, 10),
      primaryColorLight: lightenColor(color, 10)
    });
  }

  /**
   * Calculate contrast-aware error color based on background brightness
   * @param backgroundColor The background color to calculate contrast against
   * @returns A red color with good contrast
   */
  private getContrastAwareErrorColor(backgroundColor: string): string {
    // Calculate luminance of background color
    const getLuminance = (hex: string): number => {
      const r = parseInt(hex.substring(1, 3), 16) / 255;
      const g = parseInt(hex.substring(3, 5), 16) / 255;
      const b = parseInt(hex.substring(5, 7), 16) / 255;
      
      // Apply gamma correction
      const sRGBtoLin = (colorChannel: number): number => {
        return colorChannel <= 0.03928 
          ? colorChannel / 12.92 
          : Math.pow((colorChannel + 0.055) / 1.055, 2.4);
      };
      
      return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
    };

    const luminance = getLuminance(backgroundColor);
    
    // For dark backgrounds (low luminance), use a bright red
    // For light backgrounds (high luminance), use a dark red
    if (luminance < 0.5) {
      return '#ff6b6b'; // Bright red for dark backgrounds
    } else {
      return '#dc3545'; // Bootstrap danger red for light backgrounds
    }
  }
}