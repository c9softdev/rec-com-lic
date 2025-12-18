import { Component, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { CommonService } from '../../core/services/common.service';
import { AllRemarkModal } from './all-remark-modal/all-remark-modal';
import { InterviewManagerModal } from './interview-manager-modal/interview-manager-modal';
import { InterviewSchedulerModal } from './interview-scheduler-modal/interview-scheduler-modal';
import { VisaProcessModal } from './visa-process-modal/visa-process-modal';
import { EmigrationModal } from './emigration-modal/emigration-modal';
import { DepartureDetailsModal } from './departure-details-modal/departure-details-modal';
import { JobProcessModal } from './job-process-modal/job-process-modal';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { LoadingService } from '../../core/services/loading.service';
import { AuthService } from '../../core/services/auth.service';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { EmailWriterService } from '../../core/services/email-writer.service';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../core/services/session.service';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-selection-process',
  standalone: true,
  imports: [InterviewSchedulerModal, InterviewManagerModal, VisaProcessModal,
    EmigrationModal, DepartureDetailsModal, JobProcessModal,
    PaginationComponent, ReactiveFormsModule, AllRemarkModal, FormsModule, CommonModule, QuillModule],
  templateUrl: './selection-process.html',
  styleUrls: ['./selection-process.scss']
})


export class SelectionProcess {
  readonly Math = Math;
  readonly Number = Number;
  noDataMessage: string = '';
  projectName: string = '';
  totalRecords: number = 0;
  // totalPages: number = 0;
  listRec: any[] = [];
  genderArr: any[] = [];
  intrvSchedulArr: any[] = [];
  prjManagerArr: any[] = [];
  intrvManagerArr: any[] = [];
  medicalArr: any[] = [];
  clientResArr: any[] = [];
  projectArr: any[] = [];
  sprojectArr: any[] = [];
  intvCityArr: any[] = [];
  currentPage: number = paginationProperties.currentPage;
  pageSize: number = paginationProperties.pageSize;
  totalPages: number = paginationProperties.totalPages;
  paginationRange: number[] = paginationProperties.paginationRange;
  jumpToPage: number = paginationProperties.jumpToPage;
  selectedItems: Set<string> = new Set();
  seelctRecords: any[] = [];
  showSearchSection = false;
  searchForm!: FormGroup;
  submitted = false;
  sendEmailForm!: FormGroup;

  // Expose loading state to template via getter
  public get isLoading$() {
    return this.loadingService.loading$;
  }

  userId: any;
  userType: any;
  emailId: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;

  emailPrompt = "";
  generatedEmail = "";
  comp_id: any;
  superAdminID: any;
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image']
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private emailWriterService: EmailWriterService,
    private sessionService: SessionService
  ) {
    this.searchForm = this.fb.group({
      passport_no: [''],
      sjobid: [''],
      scontactNo: [''],
      sremarkIntvSch: [''],
      sremarkIntvMan: [''],
      sremarkIntvPrs: [''],
      sfdate: [''],
      stodate: [''],
      sgender: ['']
    });

    this.sendEmailForm = this.fb.group({
      additionalEmails: [''],
      emailSubject: [''],
      emailMessage: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Ensure loading is active before first render to avoid empty-state flash

    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    this.loadingService.show('Loading...');
    // console.log('Field Value:', sprojrct);
    this.loadAllDropdownData(); // All Drop Down Data
    this.loadAllSelectionCV();
  }
  
  async generateEmailNow() {
    this.generatedEmail = "Generating...";

    this.generatedEmail = await this.emailWriterService.generateEmail(this.emailPrompt);
  }

  onDeleteClick() {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to Remove', 'warning');
      return;
    }
    const count = this.selectedItems.size;
    const message = count === 1
      ? 'Are you sure you want to Remove these CVs? This action cannot be undone.'
      : `Are you sure you want to Remove ${count} CVs? This action cannot be undone.`;
    this.sweetAlert.confirmDelete(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }

  private confirmDelete() {

    const sprojrct = this.route.snapshot.queryParamMap.get('sprojrct');
    const idsToDelete = Array.from(this.selectedItems);
    this.loadingService.show('Removing...');

    const payload = {
      event: 'astsk',
      mode: 'delAsg',
      InputData: [
        {
          userId: idsToDelete,
          sprojrct: sprojrct
        }
      ]
    };
    // console.log('Payload for deletion:', payload);
    //     return
    this.commonService.post(payload)
      .subscribe({

        next: (response: any) => {
          this.loadingService.hide();

          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message || 'CVs have been Removed now.', 'success');
            this.selectedItems.clear();
            this.loadAllSelectionCV();
          } else {
            this.sweetAlert.showError(response.message || 'Failed to Remove records');
          }
        },
        error: () => {
          this.loadingService.hide();
          this.sweetAlert.showError('Failed to Remove Record. Please try again.');
        }
      });
    // this.loadingService.show('Removing...');
  }

  onJumpToPage(page?: number): void {
    const targetPage = page ?? this.jumpToPage;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.onPageChange(targetPage);
    } else {
      this.jumpToPage = this.currentPage;
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadAllSelectionCV();
    }
  }

  onItemSelect(itemId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
  }


  onSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.listRec.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
  }

  loadAllSelectionCV() {

    // Get user session details
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.viewresumechk = session?.viewresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    // Project ID from query param (From Select Prcess)
    const sprojrct = this.route.snapshot.queryParamMap.get('sprojrct');
    this.loadingService.show('Loading...');

    const payload = {
      event: 'astsk',
      mode: 'ascv',
      InputData: [{
        sprojrct: sprojrct,
        sremarkIntvSch: this.searchForm.get('sremarkIntvSch')?.value || '',
        sremarkIntvMan: this.searchForm.get('sremarkIntvMan')?.value || '',
        sremarkIntvPrs: this.searchForm.get('sremarkIntvPrs')?.value || '',
        passport_no: this.searchForm.get('passport_no')?.value || '',
        sjobid: this.searchForm.get('sjobid')?.value || '',
        sfdate: this.searchForm.get('sfdate')?.value || '',
        stodate: this.searchForm.get('stodate')?.value || '',
        scontactNo: this.searchForm.get('scontactNo')?.value || '',
        sgender: this.searchForm.get('sgender')?.value || '',
        clk: '', // dnd
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        // console.log('Payload:', payload);
        this.loadingService.hide();
        if (res?.status === 'success' && res.data?.listArr?.length) {
          this.listRec = res.data.listArr;
          this.projectArr = res.data.projectArr;
          this.totalRecords = res.data.total_records || res.data.listArr.length;
          this.projectName = res.data.parJName;
          this.totalPages = Math.ceil(Number(this.totalRecords) / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = res?.message || 'No data found.';
          this.listRec = [];
          this.projectArr = [];
          this.projectName = '';
          this.totalRecords = 0;
          this.totalPages = 0;
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load projects. Please try again.');
        this.listRec = [];
        this.totalRecords = 0;
        this.totalPages = 0;
      }
    });
  }

  loadAllDropdownData() {

    // Project ID from query param (From Select Prcess)
    const sprojrct = this.route.snapshot.queryParamMap.get('sprojrct');
    const payload = {
      event: 'astsk',
      mode: 'psgs',
      InputData: [{
        sprojrct: sprojrct,
        intv: '', // dnd
        pass: ''
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        if (res?.status === 'success' && res.data) {
          const data = res.data;
          if (Array.isArray(data.gender)) {
            this.genderArr = data.gender.map((g: string, index: number) => ({
              id: index.toString(),
              name: g
            }));
          } else {
            this.genderArr = [];
          }
          this.intrvSchedulArr = data.remarks
            ? Object.entries(data.remarks).map(([id, name]) => ({ id, name })) : [];
          this.intrvManagerArr = data.remarksIntv
            ? Object.entries(data.remarksIntv).map(([id, name]) => ({ id, name })) : [];
          this.prjManagerArr = data.processManager
            ? Object.entries(data.processManager).map(([id, name]) => ({ id, name })) : [];
          this.medicalArr = data.medical
            ? Object.entries(data.medical).map(([id, name]) => ({ id, name })) : [];
          this.sprojectArr = data.taskArr
            ? Object.entries(data.taskArr).map(([id, name]) => ({ id, name })) : [];
          this.intvCityArr = data.intvCityArr
            ? Object.entries(data.intvCityArr).map(([id, name]) => ({ id, name })) : [];

        } else {
          this.genderArr = [];
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load Details. Please try again.');
        this.genderArr = [];
      }
    });
  }


  downloadFile(projectId: any, jobseekerId: any) {
    const payload = {
      event: 'astsk',
      mode: 'dwn', // Example mode — change it to your actual API mode
      InputData: [
        {
          prjId: projectId,
          id: jobseekerId
        }
      ]
    };

    this.loadingService.show('Downloading...');
    this.commonService.postDownload(payload, true).subscribe({
      next: (res: any) => {
        this.loadingService.hide();

        // Check if response is JSON with status message
        if (res?.status && res.status === 'failed') {
          this.sweetAlert.showError(res.message || 'File does not exist!');
          return;
        }

        // If not JSON, treat it as file
        const contentType = res.type || 'application/octet-stream';
        const blob = new Blob([res], { type: contentType });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `Document_${projectId}_${jobseekerId}`;
        link.click();

        window.URL.revokeObjectURL(url); // cleanup
        this.sweetAlert.showToast('File downloaded successfully', 'success');
      },
      error: (err) => {
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong while downloading.');
      }
    });

  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }

  checkInput(input: EventTarget | null): void {
    if (!input) return;
    const element = input as HTMLInputElement | HTMLSelectElement;
    if (element.value.length > 0) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  }

  onClearSearch(): void {
    this.submitted = false;
    this.searchForm.reset();
    this.currentPage = 1;

    this.loadAllSelectionCV();
  }

  onSearch(): void {
    const v = this.searchForm.value as any;
    const isEmpty = (val: any) => {
      if (val === null || val === undefined) return true;
      if (typeof val === 'string') return val.trim() === '';
      return false;
    };
    const allEmpty = isEmpty(v.passport_no)
      && isEmpty(v.sjobid)
      && isEmpty(v.scontactNo)
      && isEmpty(v.sremarkIntvSch)
      && isEmpty(v.sremarkIntvMan)
      && isEmpty(v.sremarkIntvPrs)
      && isEmpty(v.sfdate)
      && isEmpty(v.stodate)
      && isEmpty(v.sgender);
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
      return; // avoid unnecessary API call
    }
    this.currentPage = 1;
    this.loadAllSelectionCV();
  }


  @ViewChild('schedulerModal') schedulerModal!: InterviewSchedulerModal;
  @ViewChild('managerModal') managerModal!: InterviewManagerModal;
  @ViewChild('visaProcessModal') visaProcessModal!: VisaProcessModal;
  @ViewChild('emigrationModal') emigrationModal!: EmigrationModal;
  @ViewChild('departureDetailsModal') departureDetailsModal!: DepartureDetailsModal;
  @ViewChild('jobProcessModal') jobProcessModal!: JobProcessModal;
  // @ViewChild('allRemarkModal') allRemarkModal!: AllRemarkModal;
  @ViewChild('allRemarkModal') allRemarkModal!: any;

  // UI state for toolbar collapsibles
  showProjectDetails: boolean = false;
  showSendEmailForm: boolean = false;

  // Toggle handlers to mimic accordion behavior
  toggleProjectDetails(): void {
    this.showProjectDetails = !this.showProjectDetails;
    if (this.showProjectDetails) {
      this.showSendEmailForm = false;
    }
  }

  toggleSendEmail(): void {
    this.showSendEmailForm = !this.showSendEmailForm;
    if (this.showSendEmailForm) {
      this.showProjectDetails = false;
      this.sendEmailForm.reset();
    }
  }

  openAllRemarks(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.allRemarkModal.jobseekerId = jobseekerId;
    this.allRemarkModal.candidateId = candidateId;
    this.allRemarkModal.projectId = projectId;
    if (jobseekerName) this.allRemarkModal.jobseekerName = jobseekerName;
    this.schedulerModal.parentComponent = this;
    this.allRemarkModal.open();

    setTimeout(() => {
      const remarkModal = document.getElementById('allRemarkModal');
      if (remarkModal) remarkModal.style.zIndex = '1070'; // above visa modal
      const backdrops = document.getElementsByClassName('modal-backdrop');
      if (backdrops.length > 0) {
        const lastBackdrop = backdrops[backdrops.length - 1] as HTMLElement;
        lastBackdrop.style.zIndex = '1069'; // one less than modal
      }
    }, 300);
  }

  openJobProcess(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.jobProcessModal.jobseekerId = jobseekerId;
    this.jobProcessModal.candidateId = candidateId;
    this.jobProcessModal.projectId = projectId;
    if (jobseekerName) this.jobProcessModal.jobseekerName = jobseekerName;
    this.jobProcessModal.parentComponent = this;  // ✅ Add this line
    this.jobProcessModal.open();
  }

  openDepartureDetails(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.departureDetailsModal.jobseekerId = jobseekerId;
    this.departureDetailsModal.candidateId = candidateId;
    this.departureDetailsModal.projectId = projectId;
    if (jobseekerName) this.departureDetailsModal.jobseekerName = jobseekerName;
    this.departureDetailsModal.open();
  }

  openEmigration(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.emigrationModal.jobseekerId = jobseekerId;
    this.emigrationModal.candidateId = candidateId;
    this.emigrationModal.projectId = projectId;
    this.emigrationModal.userId = this.userId;
    this.emigrationModal.userType = this.userType;
    if (jobseekerName) this.emigrationModal.jobseekerName = jobseekerName;
    this.emigrationModal.parentComponent = this;
    this.emigrationModal.open();
  }

  openVisaProcess(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.visaProcessModal.jobseekerId = jobseekerId;
    this.visaProcessModal.candidateId = candidateId;
    this.visaProcessModal.projectId = projectId;
    this.visaProcessModal.userId = this.userId;
    this.visaProcessModal.userType = this.userType;
    if (jobseekerName) this.visaProcessModal.jobseekerName = jobseekerName;
    this.visaProcessModal.parentComponent = this;  // ✅ link parent
    this.visaProcessModal.open();
  }

  openScheduler(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.schedulerModal.jobseekerId = jobseekerId;
    this.schedulerModal.candidateId = candidateId;
    this.schedulerModal.projectId = projectId;

    this.schedulerModal.intrvSchedulArr = this.intrvSchedulArr;
    this.schedulerModal.intvCityArr = this.intvCityArr;

    this.schedulerModal.parentComponent = this;
    if (jobseekerName) this.schedulerModal.jobseekerName = jobseekerName;
    /// Fetch interview details before opening the modal

    this.schedulerModal.open(); // Open the modal 
  }

  openInterviewManager(jobseekerId: any, candidateId: any, projectId: any, jobseekerName?: string) {
    this.managerModal.jobseekerId = jobseekerId;
    this.managerModal.candidateId = candidateId;
    this.managerModal.projectId = projectId;

    this.managerModal.intrvManagerArr = this.intrvManagerArr;
    if (jobseekerName) this.managerModal.jobseekerName = jobseekerName;
    this.managerModal.parentComponent = this;

    this.managerModal.open();
  }

  /**
   * Open the Archive Manager for the selected candidate in a new window.
   * Mirrors behavior used in jobseeker-manager's onUploadClick.
   */
  openArchiveManager(item: any): void {
    const id = item?.id || item?.job_seeker_id || '';
    if (!id) {
      this.sweetAlert.showToast('No record id found to Archive.', 'warning');
      return;
    }
    // const absolute = `${window.location.origin}/archive-manager/${encodeURIComponent(id)}`;
    // window.open(absolute, 'resumeArchiveWindow', 'noopener,noreferrer,width=924,height=668');

    const baseHref = document.getElementsByTagName('base')[0].href;
    const absolute = `${baseHref}archive-manager/${encodeURIComponent(id)}`;

    window.open(
      absolute,
      'resumeViewresumeArchiveWindowWindow',
      'noopener,noreferrer,width=1024,height=768'
    );

  }

  openViewJobseeker(item: any): void {
    // Check view permission
    if (this.viewresumechk !== '1') {
      this.sweetAlert.showToast('You do not have permission to view resumes.', 'error');
      return;
    }

    const id = item?.id || item?.job_seeker_id || '';
    if (!id) {
      this.sweetAlert.showToast('No record id found to view.', 'warning');
      return;
    }
    // const absolute = `${window.location.origin}/print-resume/${encodeURIComponent(id)}?mode=view`;
    // window.open(absolute, 'resumeViewWindow', 'noopener,noreferrer,width=1024,height=768');

    const baseHref = document.getElementsByTagName('base')[0].href;
    const absolute = `${baseHref}print-resume/${encodeURIComponent(id)}?mode=view`;

    window.open(
      absolute,
      'resumeViewWindow',
      'noopener,noreferrer,width=1024,height=768'
    );
  }
  
  refreshData(): void {
    this.loadAllSelectionCV();
  }

  /**
   * Navigate to jobseeker-manager and open the edit form for the given jobseeker id.
   */
  openEditJobseeker(item: any): void {
    const id = item?.id || item?.job_seeker_id || '';
    if (!id) {
      this.sweetAlert.showToast('No record id found to edit.', 'warning');
      return;
    }
    // Open the edit page in a standalone window so selection page stays intact
    const url = `${window.location.origin}/jobseeker-edit/${encodeURIComponent(id)}`;
    // Open a blank popup first (helps some browsers and popup blockers)
    const windowName = `jobseekerEdit_${encodeURIComponent(id)}`;
    const win = window.open('', windowName, 'width=924,height=668');

    if (!win) {
      // Could not open a popup at all (blocked by browser). Show a single helpful message and bail out.
      this.sweetAlert.showToast('Unable to open edit window. Please allow popups for this site.', 'error');
      return;
    }

    // Now navigate the newly opened window to the desired URL. Use try/catch because assigning
    // location can throw in strict cross-origin cases (unlikely here, but safe to guard).
    try {
      win.location.href = url;
    } catch (e) {
      try { win.location = url; } catch (e2) { /* ignore */ }
    }

    // Focus the new window when possible
    try { win.focus(); } catch (e) { /* ignore */ }

    // Listener: refresh list when the edit window posts the expected message
    const handler = (ev: MessageEvent) => {
      // Only accept messages from the same origin
      if (ev.origin !== window.location.origin) return;
      if (ev.data && ev.data.type === 'jobseeker-updated') {
        this.loadAllSelectionCV();
        // cleanup
        window.removeEventListener('message', handler);
        if (pollInterval) clearInterval(pollInterval);
      }
    };

    window.addEventListener('message', handler);

    // Poll the popup window so we can remove the message listener if user closes it manually
    const pollInterval = setInterval(() => {
      try {
        if (win.closed) {
          clearInterval(pollInterval);
          window.removeEventListener('message', handler);
        }
      } catch (e) {
        // Accessing win.closed can throw in some cross-origin scenarios; ignore
      }
    }, 500);
  }

  /**
   * Send email to selected candidates from Selection Manager.
   */
  onSendEmail(): void {
    if (this.sendEmailForm.invalid) {
      this.sendEmailForm.markAllAsTouched();
      this.sweetAlert.showToast('Please enter an email message.', 'warning');
      return;
    }

    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one jobseeker to send email.', 'warning');
      return;
    }

    const formValue = this.sendEmailForm.value;
    const artId = Array.from(this.selectedItems).map(id => Number(id));
    const currUser = this.authService.currentUserValue;
    const fromEmail = currUser?.emailId || currUser?.email || '';

    const payload = {
      event: 'jobseeker',
      mode: 'smail',
      InputData: [
        {
          artId,
          fromEmail,
          subject: formValue.emailSubject || '',
          emaildesc: formValue.emailMessage || '',
          additionalEmails: (formValue.additionalEmails || '').trim()
        }
      ]
    };

    this.loadingService.show('Sending email...');
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Email sent successfully.', 'success');
          this.sendEmailForm.reset();
          this.showSendEmailForm = false;
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to send email.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to send email. Please try again.');
      }
    });
  }

}
