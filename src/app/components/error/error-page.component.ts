import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GlobalSettingsService } from '../../core/services/global-settings.service';

type ErrorType = '404' | '500' | 'server-down' | 'license-expired';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss']
})
export class ErrorPageComponent {
  type: ErrorType = '404';
  title = '';
  description = '';
  illustration = new URL('assets/img/license-warning.svg', document.baseURI).toString();
  showBackToLogin = true;
  checking = false;

  private config: Record<ErrorType, { title: string; description: string; illustration?: string }> = {
    '404': {
      title: '404 — Page Not Found',
      description: 'The page you’re looking for doesn’t exist or has moved.'
    },
    '500': {
      title: '500 — Server Error',
      description: 'Something went wrong on our end. Please try again later.'
    },
    'server-down': {
      title: 'Service Unavailable',
      description: 'Our servers are currently unreachable. Please try again shortly.'
    },
    'license-expired': {
      title: 'License Verification Failed',
      description: 'Your license is invalid or expired. Please contact your administrator.'
    }
  };

  constructor(private route: ActivatedRoute, private router: Router, private settings: GlobalSettingsService) {}

  goToLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((map) => {
      const qpType = (map.get('type') || '').toLowerCase();
      const qpMessage = map.get('message') || '';
      const t = qpType as ErrorType;
      this.type = (['404', '500', 'server-down', 'license-expired'] as ErrorType[]).includes(t) ? t : '404';
      const cfg = this.config[this.type];
      this.title = cfg.title;
      this.description = qpMessage || cfg.description;
      this.illustration = cfg.illustration || this.illustration;
      this.showBackToLogin = this.type !== 'license-expired';
      if (this.type === 'license-expired' || this.type === 'server-down' || this.type === '500') {
        this.tryRecover();
      }
    });
  }

  tryRecover(): void {
    if (this.checking) return;
    this.checking = true;
    this.settings.validateLicenseCached(0).subscribe({
      next: (res: any) => {
        const ok = res?.status === 'success' && String(res?.data?.chr_status || '') === '1';
        if (ok) {
          this.router.navigate(['/login'], { replaceUrl: true });
        } else {
          this.description = res?.message || this.description;
          this.checking = false;
        }
      },
      error: () => {
        if (this.type === 'server-down' || this.type === '500') {
          this.description = 'Service unreachable. Please try again shortly.';
        }
        this.checking = false;
      }
    });
  }
}