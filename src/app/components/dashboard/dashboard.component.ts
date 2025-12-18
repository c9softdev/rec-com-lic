import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/auth.model';
import { Router } from '@angular/router';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { paginationProperties } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { SessionService } from '../../core/services/session.service';
// import { forkJoin, Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
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
  
  employeeCvChartData: any = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  categoryChartData: any = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  remarkChartData: any = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  pieOptions: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  pieTypeEmp: any = 'pie';
  pieTypeCat: any = 'doughnut';
  pieTypeRmk: any = 'pie';

  trendMonths = 6;
  categoryTrendLabels: string[] = [];
  categoryTrendDataSets: any[] = [];
  totalCVbyLastMonths: any[] = [];
  parseMonthYear = (m: any): { year: number; monthIndex: number } => {
    const name: string = String(m?.MonthName || '');
    const monthStr: string = String(m?.Month || '');
    let year = parseInt(name.split(' ').pop() || `${new Date().getFullYear()}`, 10);
    let monthIndex = Math.max(0, Math.min(11, (parseInt(monthStr || '1', 10) - 1)));
    if (isNaN(monthIndex)) {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const found = months.findIndex((mm) => name.startsWith(mm));
      monthIndex = found >= 0 ? found : 0;
    }
    return { year, monthIndex };
  };
  trendOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { stacked: false }, y: { stacked: false, beginAtZero: true } },
    plugins: { legend: { display: false } }
  };

  // View model helpers
  get kpis(): Array<{ icon: string; label: string; value: number | null; meterPct: number; trend: 'trend-up' | 'trend-down' | 'trend-flat'; meterClass?: 'warn' | 'ok' }> {
    return [
      { icon: 'fa-database', label: 'Total CV', value: this.animatedValues.totalCandidates, meterPct: 100, trend: 'trend-up' },
      { icon: 'fa-triangle-exclamation', label: 'CVs (Today)', value: this.animatedValues.totalTodayCandidate, meterPct: this.new7dPct, trend: 'trend-up' },
      { icon: 'fa-check-circle', label: 'CVs (Yesterday)', value: this.animatedValues.totalYesCandidate, meterPct: this.docsPendingPct, trend: 'trend-down', meterClass: 'warn' },
      { icon: 'fa-check-circle', label: 'CVs (This Week)', value: this.animatedValues.totalWeekCandidate, meterPct: this.visaPct, trend: 'trend-flat', meterClass: 'ok' }
    ];
  }

  get glance(): Array<{ icon: string; colorClass: string; title: string; value: number | null }> {
    return [
      { icon: 'fa-solid fa-database', colorClass: 'text-theme-primary', title: 'Total CV', value: this.animatedValues.totalCandidates },
      { icon: 'fa-solid fa-calendar-day', colorClass: 'text-success', title: 'CVs (Today)', value: this.animatedValues.totalTodayCandidate },
      { icon: 'fa-regular fa-calendar', colorClass: 'text-warning', title: 'CVs (Yesterday)', value: this.animatedValues.totalYesCandidate },
      { icon: 'fa-solid fa-calendar-week', colorClass: 'text-info', title: 'CVs (This Week)', value: this.animatedValues.totalWeekCandidate }
    ];
  }

  get topCategories(): Array<{ title: string; key: any; totalCv: number; color: string }> {
    const src = (this.totalCvByCategory || []).slice().sort((a: any, b: any) => Number(b.totalCv || 0) - Number(a.totalCv || 0)).slice(0, 4);
    const colors: string[] = (this.categoryChartData?.datasets?.[0]?.backgroundColor as string[]) || [];
    return src.map((c: any, i: number) => ({ title: String(c.CategoryTitle || ''), key: c.CategoryKey, totalCv: Number(c.totalCv || 0), color: colors[i % (colors.length || 1)] || '#0d6efd' }));
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
    private commonService: CommonService,
    private loadingService: LoadingService,
    private sessionService: SessionService
  ) { }

  ngOnInit() {
    const sess = this.sessionService.getSession();
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

  goToJobseekers(): void {
    const queryParams: any = { page: 1, pageSize: paginationProperties.pageSize };
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

    // Total candidates (fetch only total_records)
    const totalPayload = {
      event: 'home',
      mode: 'lr',
      InputData: [{ page: '1', perPage: '1' }]
    } as const;
    this.commonService.post(totalPayload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        this.totalCandidates = Number(res?.data?.totalCvTotal ?? 0);
        this.totalTodayCandidate = Number(res?.data?.totalCvtoday ?? 0);
        this.totalCvByCategory = res.data.totalCVbyCategory || [];
        this.totalCVbyLastMonths = res.data.totalCVbyLastMonths || [];

        this.reports = res.data.prjArr || [];
        this.totalYesCandidate = res.data?.totalCvyesterday ?? 0;
        this.totalWeekCandidate = res.data?.totalCvWeek ?? 0;;
        this.miniBarData = res.data.totalCVbyRemarks || [];
        this.totalCVsByEmployees = res.data.totalCVbyEmployee || [];

        this.animateKpiCounts();
        this.updateCharts();
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

  private updateCharts(): void {
    const empLabels = (this.totalCVsByEmployees || []).map((e: any) => e.EmployeeName);
    const empValues = (this.totalCVsByEmployees || []).map((e: any) => Number(e.totalCv || 0));
    const catLabels = (this.totalCvByCategory || []).map((c: any) => c.CategoryTitle);
    const catValues = (this.totalCvByCategory || []).map((c: any) => Number(c.totalCv || 0));
    const rmkLabels = (this.miniBarData || []).map((r: any) => r.IntvRmkTitle);
    const rmkValues = (this.miniBarData || []).map((r: any) => Number(r.totalCv || 0));

    const palette = ['#0d6efd','#6f42c1','#198754','#dc3545','#fd7e14','#20c997','#6610f2','#0dcaf0','#ffc107','#6c757d'];

    this.employeeCvChartData = {
      labels: empLabels,
      datasets: [{ data: empValues, backgroundColor: empLabels.map((_: any, i: number) => palette[i % palette.length]) }]
    };
    this.categoryChartData = {
      labels: catLabels,
      datasets: [{ data: catValues, backgroundColor: catLabels.map((_: any, i: number) => palette[(i+2) % palette.length]) }]
    };
    this.remarkChartData = {
      labels: rmkLabels,
      datasets: [{ data: rmkValues, backgroundColor: rmkLabels.map((_: any, i: number) => palette[(i+4) % palette.length]) }]
    };

    this.updateCategoryTrend();
  }

  onEmployeeChartClick(evt: any): void {
    const a = (evt?.active && evt.active[0]) || null;
    if (!a) return;
    const idx = (typeof a.index === 'number') ? a.index : (typeof a._index === 'number' ? a._index : null);
    if (idx === null) return;
    const item = (this.totalCVsByEmployees || [])[idx];
    if (!item) return;
    this.applySearch('sempl', item.EmployeeId, '', '');
  }

  private updateCategoryTrend(): void {
    const all = this.totalCVbyLastMonths || [];
    const months = all.slice(0, this.trendMonths).reverse();
    const labels: string[] = months.map((m: any) => {
      const { year, monthIndex } = this.parseMonthYear(m);
      return new Date(year, monthIndex, 1).toLocaleString('en-GB', { month: 'short' });
    });
    const values: number[] = months.map((m: any) => Number(m.totalCv || 0));
    this.categoryTrendLabels = labels;
    this.categoryTrendDataSets = [{ label: 'CVs', data: values, backgroundColor: '#20C997', borderWidth: 0 }];
  }

  private computeMonths(n: number): string[] {
    const out: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(d.toLocaleString('en-GB', { month: 'short' }));
    }
    return out;
  }

  setTrendMonths(n: number): void {
    this.trendMonths = n;
    this.updateCategoryTrend();
  }

  // parseMonthYear utility declared as a property above

  onCategoryTrendClick(evt: any): void {
    const a = (evt?.active && evt.active[0]) || null;
    if (!a) return;
    const idx = (typeof a.index === 'number') ? a.index : null;
    if (idx === null) return;
    const all = this.totalCVbyLastMonths || [];
    const months = all.slice(0, this.trendMonths).reverse();
    const item = months[idx];
    if (!item) return;
    const { year, monthIndex } = this.parseMonthYear(item);
    const sfdate = this.formatDateDdMmYyyy(new Date(year, monthIndex, 1));
    const stodate = this.formatDateDdMmYyyy(new Date(year, monthIndex + 1, 0));
    this.applySearch('sfdate', sfdate, 'stodate', stodate);
  }

  onCategoryChartClick(evt: any): void {
    const a = (evt?.active && evt.active[0]) || null;
    if (!a) return;
    const idx = (typeof a.index === 'number') ? a.index : (typeof a._index === 'number' ? a._index : null);
    if (idx === null) return;
    const item = (this.totalCvByCategory || [])[idx];
    if (!item) return;
    this.applySearch('sparCat', item.CategoryKey, '', '');
  }

  onRemarkChartClick(evt: any): void {
    const a = (evt?.active && evt.active[0]) || null;
    if (!a) return;
    const idx = (typeof a.index === 'number') ? a.index : (typeof a._index === 'number' ? a._index : null);
    if (idx === null) return;
    const item = (this.miniBarData || [])[idx];
    if (!item) return;
    this.applySearch('sfinalremark', item.IntvRmkKey, '', '');
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
