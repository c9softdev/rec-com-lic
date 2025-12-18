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
    // License is enforced via licenseGuard on routes
    this.sessionService.init();
  }
}
