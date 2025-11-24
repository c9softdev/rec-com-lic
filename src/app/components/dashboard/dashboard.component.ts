import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/auth.model';
import { Router } from '@angular/router';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { DashboardService } from './dashboard.service';
import { LoadingService } from '../../core/services/loading.service';
import { paginationProperties } from '../../app.config';
// import { forkJoin, Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  //imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  // KPI values
  totalCandidates: number | null = null;
  totalTodayCandidate: number | null = null;
  totalYesCandidate: number | null = null;
  totalWeekCandidate: number | null = null;
  // KPI percentages (for meters)
  new7dPct = 0;
  docsPendingPct = 0;
  visaPct = 0;
  // Animated KPI values
  animatedValues = {
    totalCandidates: 0,
    totalTodayCandidate: 0,
    totalYesCandidate: 0,
    totalWeekCandidate: 0
  };
  // Recent activity (latest jobseekers)
  totalCVsByEmployees: any[] = [];
  totalCvByCategory: any[] = [];
  totalCVsByRemark: any[] = [];
  // Toggle for now: use dummy data until APIs are finalized
  private readonly useDummyData = false;
  // Alerts
  alerts = {
    upcomingInterviews: 120,
    passportsExpiring: 30,
    flightsThisWeek: 100,
  };
  // Reports (dummy)
  showReports = false;
  // reportsSummary = { total: 1212, today:12, yesterday: 5, thisWeek: 5 };
  reports: any = [];
  // Mini bar chart
  miniBarData: any = [];
  animateBars = false;
  userId: any;
  userType: any;
  empType: any;
  emailId: any;

  // View model helpers
  get kpis(): Array<{ icon: string; label: string; value: number | null; meterPct: number; trend: 'trend-up' | 'trend-down' | 'trend-flat'; meterClass?: 'warn' | 'ok' }> {
    return [
      { icon: 'fa-database', label: 'Total CV', value: this.animatedValues.totalCandidates, meterPct: 100, trend: 'trend-up' },
      { icon: 'fa-triangle-exclamation', label: 'CVs (Today)', value: this.animatedValues.totalTodayCandidate, meterPct: this.new7dPct, trend: 'trend-up' },
      { icon: 'fa-check-circle', label: 'CVs (Yesterday)', value: this.animatedValues.totalYesCandidate, meterPct: this.docsPendingPct, trend: 'trend-down', meterClass: 'warn' },
      { icon: 'fa-check-circle', label: 'CVs (This Week)', value: this.animatedValues.totalWeekCandidate, meterPct: this.visaPct, trend: 'trend-flat', meterClass: 'ok' }
    ];
  }

  get glance(): Array<{ icon: string; colorClass: string; title: string; value: number }> {
    return [
      { icon: 'fa-regular fa-calendar-check', colorClass: 'text-success', title: 'Upcoming Interviews', value: this.alerts.upcomingInterviews },
      { icon: 'fa-solid fa-passport', colorClass: 'text-warning', title: 'Passports Expiring', value: this.alerts.passportsExpiring },
  { icon: 'fa-solid fa-plane-departure', colorClass: 'text-theme-primary', title: 'Flights This Week', value: this.alerts.flightsThisWeek }
    ];
  }

  // get reportChips(): Array<{ label: string; value: number }>{
  //   return [
  //     { label: 'Total', value: this.reportsSummary.total },
  //     { label: 'Today', value: this.reportsSummary.today },
  //     { label: 'Yesterday', value: this.reportsSummary.yesterday },
  //     { label: 'This week', value: this.reportsSummary.thisWeek },
  //   ];
  // }

  constructor(
    private authService: AuthService,
    private router: Router,
    private sweetAlert: SweetAlertService,
    private dashboardService: DashboardService
    , private loadingService: LoadingService
  ) { }

  ngOnInit() {
    // this.currentUser = this.authService.currentUserValue;
    // console.log('Current User:', this.currentUser);
    
    if (this.useDummyData) {
      this.fillDummyData();
    } else {
      this.loadKpis();
      // this.loadRemarkBuckets();
      // this.loadtotalCVsByEmployees();
    }
    // Trigger bar animation after first render
    setTimeout(() => { this.animateBars = true; }, 0);
    // Trigger KPI count animation
    setTimeout(() => { this.animateKpiCounts(); }, 100);

  }

  applySearch(field: string, value: any, field2: string, value2: any): void {
    // Navigate to jobseeker manager with search params
    const queryParams: any = {};
    queryParams[field] = value;
    queryParams[field2] = value2;
    queryParams['page'] = 1;
    queryParams['pageSize'] = paginationProperties.pageSize;
    // console.log('Navigating to jobseeker-manager with params:', queryParams);
    this.router.navigate(['/jobseeker-manager'], { queryParams });
  }

  // logout() {
  //   this.sweetAlert.confirmStatusChange('Are you sure you want to logout?').then((result: any) => {
  //     if (result.isConfirmed) {
  //       this.loadingService.show('Logging out...');
  //       setTimeout(() => {
  //         this.loadingService.hide();
  //         // this.authService.logout();
  //         this.router.navigate(['/login']);
  //       }, 250);
  //     }
  //   });
  // }



  private loadKpis(): void {

    this.loadingService.show('Loading dashboard...');
    // this.currentUser = this.authService.currentUserValue;
    // const session = this.authService.getSession ? this.authService.getSession() : this.authService.currentUserValue;
    const session = this.authService.currentUserValue;
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    // console.log('Email Id Data:', this.emailId);
    console.log('Session Data:', session);

    // Total candidates (fetch only total_records)
    const totalPayload = {
      event: 'home',
      mode: 'lr',
      InputData: [{ page: '1', perPage: '1' }]
    } as const;
    this.dashboardService.post(totalPayload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        this.totalCandidates = Number(res?.data?.totalCvTotal ?? 0);
        this.totalTodayCandidate = Number(res?.data?.totalCvWeek ?? 0);
        this.totalCvByCategory = res.data.totalCVbyCategory || [];

        this.reports = res.data.prjArr || [];
        this.totalYesCandidate = res.data?.totalCvyesterday ?? 0;
        this.totalWeekCandidate = res.data?.totalCvWeek ?? 0;;
        this.miniBarData = res.data.totalCVbyRemarks || [];
        this.totalCVsByEmployees = res.data.totalCVbyEmployee || [];
        console.log('Total Category response:', this.totalCVsByEmployees);

        this.animateKpiCounts();
      },

      error: () => {
        this.totalCandidates = null;
        this.totalTodayCandidate = null;
        this.animateKpiCounts();
      }
    });
    // console.error('Error fetching total candidates:', this.totalCandidates)
    // this.totalCandidates = this.totalCandidates || 1282;
    // this.totalTodayCandidate = 24;
    // this.totalYesCandidate = 23;
    // this.totalWeekCandidate = 12;


  }


  // private loadtotalCVsByEmployees(): void {
  //   const payload = {
  //     event: 'jobseeker',
  //     mode: 'lr',
  //     InputData: [{ page: '1', perPage: '5' }]
  //   } as const;
  //   this.dashboardService.post(payload).subscribe({
  //     next: (res) => {
  //       if (res?.status === 'success' && Array.isArray(res?.data?.list)) {
  //         this.totalCVsByEmployees = res.data.list;
  //       } else {
  //         this.totalCVsByEmployees = [];
  //       }
  //     },
  //     error: () => {
  //       this.totalCVsByEmployees = [];
  //     }
  //   });
  // }

  private formatDateDdMmYyyy(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  // private loadRemarkBuckets(): void {
  //   // Load remark list and categorize into buckets by keywords
  //   const payload = { event: 'jobseeker', mode: 'rmkList', InputData: [{ rmType: '9' }] } as const;
  //   this.dashboardService.post(payload).subscribe({
  //     next: (res) => {
  //       const list = res?.data?.list || {};
  //       const entries = Object.entries(list) as Array<[string, string]>; // [id, name]
  //       const lower = (s: string) => (s || '').toLowerCase();

  //       const visaIds = entries
  //         .filter(([_, name]) => lower(name).includes('visa') && !lower(name).includes('stamped'))
  //         .map(([id]) => id);
  //       const docsIds = entries
  //         .filter(([_, name]) =>
  //           ['document', 'experience', 'hrd', 'culture'].some(k => lower(name).includes(k)))
  //         .map(([id]) => id);

  //       this.countByRemarkIds(visaIds).subscribe(v => (this.totalWeekCandidate = v));
  //       this.countByRemarkIds(docsIds).subscribe(v => (this.totalYesCandidate = v));
  //     },
  //     error: () => {
  //       this.totalWeekCandidate = null;
  //       this.totalYesCandidate = null;
  //     }
  //   });
  // }

  // private countByRemarkIds(remarkIds: string[]): Observable<number> {
  //   if (!remarkIds || remarkIds.length === 0) return of(0);
  //   const requests = remarkIds.map((rid) =>
  //     this.dashboardService
  //       .post({ event: 'jobseeker', mode: 'lr', InputData: [{ page: '1', perPage: '1', sfinalremark: rid }] })
  //       .pipe(
  //         map((res: any) => Number(res?.data?.total_records ?? 0)),
  //         catchError(() => of(0))
  //       )
  //   );
  //   return forkJoin(requests).pipe(map((arr) => arr.reduce((a, b) => a + b, 0)));
  // }

  private fillDummyData(): void {
    // KPI dummies
    this.totalCandidates = 1287;
    this.totalTodayCandidate = 54;
    this.totalYesCandidate = 23;
    this.totalWeekCandidate = 12;

    // Percentages (relative to total)
    const total = Math.max(this.totalCandidates || 0, 1);
    this.new7dPct = Math.min(100, Math.round(((this.totalTodayCandidate || 0) / total) * 100));
    this.docsPendingPct = Math.min(100, Math.round(((this.totalYesCandidate || 0) / total) * 100));
    this.visaPct = Math.min(100, Math.round(((this.totalWeekCandidate || 0) / total) * 100));

    // Recent activity dummies
    // this.totalCVsByEmployees = [
    //   { id: '16001', job_seeker_id: 'NRS250701A01', user_name: 'Aisha Khan', cdate: '01 Jul 2025 10:12 AM' },
    //   { id: '16000', job_seeker_id: 'NRS250630B21', user_name: 'Rahul Verma', cdate: '30 Jun 2025 05:47 PM' },
    //   { id: '15999', job_seeker_id: 'NRS250629C11', user_name: 'Sana Malik', cdate: '29 Jun 2025 02:18 PM' },
    //   { id: '15998', job_seeker_id: 'NRS250628D09', user_name: 'Arun Kumar', cdate: '28 Jun 2025 11:05 AM' },
    //   { id: '15997', job_seeker_id: 'NRS250627E03', user_name: 'Fatima Noor', cdate: '27 Jun 2025 09:26 AM' }
    // ];

    // Alerts
    this.alerts = {
      upcomingInterviews: 7,
      passportsExpiring: 4,
      flightsThisWeek: 3,
    };

    // Reports (sample)
    // this.reports = [
    //   {
    //     title: "MOH NURSES' PROJECT - Bangalore",
    //     role: 'Nurse',
    //     code: '464',
    //     date: '05 Dec 2019',
    //     categories: 'Admin, B Sc Nurse, M Sc Nurse, Ph D Nurse',
    //     stats: [
    //       { label: 'Waiting For Ticket', value: 0 },
    //       { label: 'Waiting For Last Experience', value: 0 },
    //       { label: 'Visa Stamped', value: 0 },
    //       { label: 'Under HRD', value: 0 },
    //       { label: 'Under Culture', value: 0 },
    //       { label: 'PTA Applied', value: 0 },
    //       { label: 'Not Interested Due To Salary', value: 0 },
    //       { label: 'Not Interested Due To Place Of Posting', value: 0 },
    //       { label: 'Not Interested Due To Family Reason', value: 0 },
    //       { label: 'Not Interested As Wife Is Not Selected', value: 0 },
    //       { label: 'Not Interested As Husband Is Not Selected', value: 0 },
    //       { label: 'Medical Unfit', value: 0 },
    //       { label: 'Deployed', value: 13 }
    //     ]
    //   },
    //   {
    //     title: "MOH NURSES' PROJECT - Mumbai",
    //     role: 'Nurse',
    //     code: '462',
    //     date: '09 Dec 2019',
    //     categories: 'Admin, B Sc Nurse, M Sc Nurse, Ph D Nurse',
    //     stats: [
    //       { label: 'Waiting For Ticket', value: 0 },
    //       { label: 'Waiting For Last Experience', value: 0 },
    //       { label: 'Visa Stamped', value: 0 },
    //       { label: 'Under HRD', value: 0 },
    //       { label: 'Under Culture', value: 0 },
    //       { label: 'PTA Applied', value: 0 },
    //       { label: 'Not Interested Due To Salary', value: 0 },
    //       { label: 'Not Interested Due To Place Of Posting', value: 0 },
    //       { label: 'Not Interested Due To Family Reason', value: 0 },
    //       { label: 'Not Interested As Wife Is Not Selected', value: 0 },
    //       { label: 'Not Interested As Husband Is Not Selected', value: 0 },
    //       { label: 'Medical Unfit', value: 0 },
    //       { label: 'Deployed', value: 16 }
    //     ]
    //   },
    //   {
    //     title: '1st Health Cluster- Eastern Province',
    //     role: 'Doctor',
    //     date: '16 Sep 2019',
    //     categories: 'Consultant, Specialist',
    //     stats: [
    //       { label: 'Waiting For Ticket', value: 0 },
    //       { label: 'Waiting For Last Experience', value: 0 },
    //       { label: 'Visa Stamped', value: 0 },
    //       { label: 'Under HRD', value: 0 },
    //       { label: 'Under Culture', value: 0 },
    //       { label: 'PTA Applied', value: 0 },
    //       { label: 'Not Interested Due To Salary', value: 0 },
    //       { label: 'Not Interested Due To Place Of Posting', value: 0 },
    //       { label: 'Not Interested Due To Family Reason', value: 0 },
    //       { label: 'Not Interested As Wife Is Not Selected', value: 0 },
    //       { label: 'Not Interested As Husband Is Not Selected', value: 0 },
    //       { label: 'Medical Unfit', value: 0 },
    //       { label: 'Deployed', value: 1 }
    //     ]
    //   }
    // ];

    // Mini bar chart (dummy 6 months)
    // this.miniBarData = [
    //   { label: 'Jan', valuePct: 40 },
    //   { label: 'Feb', valuePct: 65 },
    //   { label: 'Mar', valuePct: 30 },
    //   { label: 'Apr', valuePct: 75 },
    //   { label: 'May', valuePct: 55 },
    //   { label: 'Jun', valuePct: 80 }
    // ];
  }

  private animateKpiCounts(): void {
    const duration = 500; // 1 second
    const steps = 60;
    const stepTime = duration / steps;

    const animate = (start: number, end: number, setter: (value: number) => void) => {
      let current = start;
      const increment = (end - start) / steps;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setter(end);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, stepTime);
    };

    // Animate each KPI
    animate(0, this.totalCandidates || 0, (v) => this.animatedValues.totalCandidates = v);
    animate(0, this.totalTodayCandidate || 0, (v) => this.animatedValues.totalTodayCandidate = v);
    animate(0, this.totalYesCandidate || 0, (v) => this.animatedValues.totalYesCandidate = v);
    animate(0, this.totalWeekCandidate || 0, (v) => this.animatedValues.totalWeekCandidate = v);
  }
}
