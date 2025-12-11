import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../../core/services/common.service';
import { GlobalSettingsService } from '../../../core/services/global-settings.service';
import { ConfigService } from '../../../core/services/config.service';
import { LoadingService } from '../../../core/services/loading.service';
import { AuthService } from '../../../core/services/auth.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { SessionService } from '../../../core/services/session.service';
import { environment } from '../../../../environments/environment';

interface EducationRow { degree: string; year: string; }

@Component({
  selector: 'app-print-jobseeker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-jobseeker.component.html',
  styleUrls: ['./print-jobseeker.component.scss']
})
export class PrintJobseekerComponent implements OnInit {
  loading = true;
  error: string | null = null;
  data: any = null;
  companyName = '';
  companyLogoUrl = '';
  educationRows: EducationRow[] = [];
  createdDateDisplay = '';
  contentReady = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commonService: CommonService,
    private globalSettings: GlobalSettingsService,
    private configService: ConfigService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private sweetAlert: SweetAlertService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    // Privilege check: restrict direct view if user lacks viewresume privilege
    // Super admin (comp_id === superAdminID) bypasses this check
    const session = this.sessionService.getSession();
    const comp_id = session?.comp_id || '';
    const viewresumechk = session?.viewresumechk || '';
    
    // If NOT super admin AND does NOT have viewresume privilege, deny access
    if (comp_id !== environment.superAdminID && viewresumechk !== '1') {
      this.loadingService.hide();
      this.loading = false;
      this.sweetAlert.showToast('You do not have permission to view resumes.', 'error');
      this.router.navigate(['/']);
      return;
    }

    const id: string = this.route.snapshot.paramMap.get('id') || '';
    if (!id) { this.loading = false; this.error = 'Missing jobseeker id'; return; }

    this.loadingService.show('Loading resume...');

    // Fetch branding from config; fallback to global settings
    this.configService.getConfig().subscribe({
      next: (res) => {
        const cfg = res?.status === 'success' ? res.data : null;
        if (cfg) {
          this.companyName = cfg.site_name || this.companyName;
          this.companyLogoUrl = cfg.var_logo_client || cfg.var_logo_url || this.companyLogoUrl;
        }
      },
      error: () => {}
    });
    this.globalSettings.loadGlobalSettings().subscribe({
      next: (s) => {
        if (!this.companyName) this.companyName = s.site_name || '';
        if (!this.companyLogoUrl) this.companyLogoUrl = s.var_logo_client || '';
      }, error: () => {}
    });

    this.commonService.getJobseekerPrint(id).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.status !== 'success') { this.error = res?.message || 'Failed to load resume.'; return; }
        this.data = res.data?.list || null;
        this.createdDateDisplay = String(this.data?.creation_date || '');
        this.educationRows = this.buildEducationRows(this.data).slice(0, 2);
        this.loadingService.hide();
        
        // Set content ready and dispatch event
        setTimeout(() => {
          this.contentReady = true;
          window.dispatchEvent(new CustomEvent('resume-content-ready'));
        }, 500); // Small delay to ensure template is rendered
      },
      error: () => { this.loading = false; this.error = 'Failed to load resume.'; this.loadingService.hide(); }
    });
  }

  // onPrint(): void { window.print(); }

  private buildEducationRows(d: any): EducationRow[] {
    const rows: EducationRow[] = [];
    const list = Array.isArray(d?.education) ? d.education : [];
    if (list.length) return list.map((e: any) => ({ degree: String(e?.degree || ''), year: String(e?.year || '') }));
    const fallbacks: EducationRow[] = [
      { degree: String(d?.int_garduation || ''), year: String(d?.int_gq_year || '') },
      { degree: String(d?.int_post_gradu || ''), year: String(d?.int_pg_year || '') },
      { degree: String(d?.phd || ''), year: String(d?.phd_year || '') },
    ];
    return fallbacks.filter(r => r.degree || r.year).length ? fallbacks.filter(r => r.degree || r.year) : [{ degree: '', year: '' }];
  }
}


