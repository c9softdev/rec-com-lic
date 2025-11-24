import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { SessionService } from './core/services/session.service';
import { GlobalSettingsService } from './core/services/global-settings.service';
import { GlobalSpinnerComponent } from './shared/components/global-spinner/global-spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalSpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'RECRUITMENT MANAGEMENT SYSTEM';

  constructor(
    private themeService: ThemeService,
    private globalSettingsService: GlobalSettingsService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    // Load global settings from API (or use default if API not available)
    this.globalSettingsService.loadGlobalSettings().subscribe({
      next: (settings) => {
        console.log('Global settings loaded:', settings);
        
        // Theme is automatically applied by the GlobalSettingsService
      },
      error: (error) => {
        console.error('Failed to load global settings:', error);
        // ThemeService will use default theme if settings can't be loaded
      }
    });

    // License is enforced via `licenseGuard` on routes.

    this.sessionService.init();
  }
}
