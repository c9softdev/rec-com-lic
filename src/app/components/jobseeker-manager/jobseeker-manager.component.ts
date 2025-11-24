import { Component, OnInit, NgZone, OnDestroy, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { take, takeUntil } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { JobseekerManagerService } from './jobseeker-manager.service';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { paginationProperties, GENDERS, RELIGIONS, SORT_TO, SORT_BY, MARITAL_STATUS } from '../../app.config';
import { PaginationComponent } from '../pagination/pagination.component';
import { CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { CommonService } from '../../core/services/common.service';
import { MultiSelectDropdownComponent, MultiSelectOption } from '../multi-select-dropdown/multi-select-dropdown.component';
import { LoadingService } from '../../core/services/loading.service';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DownloadService } from '../../core/services/download.service';
import { GlobalSettingsService } from '../../core/services/global-settings.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { QuillModule } from 'ngx-quill';
import { LicenseStateService } from '../../core/services/license-state.service';

declare const bootstrap: any;

@Component({
  selector: 'app-jobseeker-manager',
  templateUrl: './jobseeker-manager.component.html',
  styleUrls: ['./jobseeker-manager.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    DecimalPipe,
    NgClass,
    MultiSelectDropdownComponent,
    FormsModule,
    QuillModule
  ]
})
export class JobseekerManagerComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly Math = Math;
  readonly Number = Number;

  addRecdFlg = false;
  listRecdFlg = true;
  assignCvMode = false;
  selectedProjectId = '';
  jobseekers: any[] = [];
  totalRecords = '0';
  showSearchSection = false;
  currentPage = paginationProperties.currentPage;
  pageSize = paginationProperties.pageSize;
  totalPages = paginationProperties.totalPages;
  paginationRange: number[] = paginationProperties.paginationRange;
  jumpToPage = paginationProperties.jumpToPage;
  noDataMessage = '';
  searchForm!: FormGroup;
  selectedItems: Set<string> = new Set();
  submitted = false;
  exportEnabled = false;
  isExporting = false;
  exportCooldownUntil: number | null = null;
  isStandaloneWindow = false;

  // Dropdown data
  parentCategories: any[] = [];
  subCategories: any[] = [];
  specializations: any[] = [];
  subCategoryOptions: MultiSelectOption[] = [];
  specializationOptions: MultiSelectOption[] = [];
  employees: any[] = [];
  qualifications: any[] = [];
  projects: any[] = [];
  locations: any[] = [];
  selectedCountryId = '';
  userId: any;
  userType: any;
  emailId: any;
  currentUser: any = null;
  printresumechk: any;
  archivalchk: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;

  /**
   * Quick search by passport number
   */
  onQuickSearch(): void {
    if (!this.quickSearchPassport || this.quickSearchPassport.trim() === '') {
      return;
    }

    // Reset the search form
    this.searchForm.reset();

    // Set only the passport field
    this.searchForm.patchValue({
      spassport: this.quickSearchPassport.trim()
    });

    // Call the existing search method
    this.onSearch();
  }

  /**
   * Clear quick search and trigger search
   */
  clearQuickSearch(): void {
    this.quickSearchPassport = '';
    this.searchForm.reset();
    this.onSearch();
  }

  /**
   * Handle keyup events in quick search
   */
  onQuickSearchKeyUp(event: KeyboardEvent): void {
    // Don't trigger on Enter key as it's handled by onQuickSearch
    if (event.key === 'Enter') {
      return;
    }
    
    // Emit to trigger debounced search
    this.searchSubject.next(this.quickSearchPassport);
  }

  /**
   * Load cities for dropdowns (flat list) using CommonService.loadCityListByCountry
   */
  loadCityDropdown(countryId?: string): void {
    const cid = countryId || this.jobseekerForm.get('country')?.value || '56';
    this.selectedCountryId = cid ? String(cid) : '';
    this.commonService.loadCityListByCountry(String(cid)).subscribe({
      next: (list: any[]) => {
        // list is [{id,name}]
        this.cityOptions = (list || []).map((c: any) => ({ id: String(c.id), name: String(c.name) }));
        // locations used by single-select add/edit
        this.locations = (list || []).map((c: any) => ({ id: String(c.id), name: String(c.name) }));
      },
      error: () => {
        this.cityOptions = [];
        this.locations = [];
      }
    });
  }
  remarks: any[] = [];
  cityOptions: MultiSelectOption[] = [];
  countries: any[] = [];
  maritalStatus = MARITAL_STATUS;
  graduationList: any[] = [];
  postGraduationList: any[] = [];
  fellowshipList: any[] = [];
  yearsList: number[] = [];
  monthsList: number[] = Array.from({ length: 12 }, (_, i) => i);
  experienceYears: number[] = Array.from({ length: 31 }, (_, i) => i);
  selectedResumeFile: File | null = null;
  quickSearchPassport: string = '';
  selectedDocumentFile: File | null = null;
  // Track existing uploaded files
  existingResumeUrl: string = '';
  existingResumeFileName: string = '';
  existingDocumentUrl: string = '';
  existingDocumentFileName: string = '';
  calculatedAge: number | null = null;
  isEditMode = false;
  editJobseekerId: string | null = null;
  // Email form properties
  showEmailForm = false;
  emailForm!: FormGroup;
  // Quill editor configuration
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
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
  private searchSubject = new Subject<string>();

  // Collapsible form sections
  showPersonalSection = true;
  showPassportSection = true;
  showEducationSection = true;

  // Header filter for CV source: 0=All, 1=Self CV, 2=CV by Me
  clickval: string = '0';
  cvFilterOpen = false;

  // Static dropdowns
  genders = GENDERS;
  religions = RELIGIONS;
  sortTo = SORT_TO;
  sortBy = SORT_BY;

  showRemarkModal = false;
  remarkForm!: FormGroup;
  currentRemarkJobseeker: any = null;
  isRemarkMaximized = false;
  @ViewChild('jobseekerRemarkModal') remarkModalEl!: ElementRef;
  private remarkModalInstance: any = null;

  @ViewChild('resumeLogModal') resumeLogModalEl!: ElementRef;
  private resumeLogModalInstance: any = null;
  resumeLogList: any[] = [];
  currentResumeLogJobseeker: any = null;
  isResumeLogMaximized = false;

  jobseekerForm!: FormGroup;
  emailExistsMessage: string = '';
  isCheckingEmail: boolean = false;

  licenseData: any;
  private destroy$ = new Subject<void>();
  readonly ALWAYS_ACTIVE_IDS = new Set<string>(['quickPassport','fsssubCat', 'fssplCat', 'sfdate', 'stodate', 'syear', 'sortto', 'dob', 'date_issue', 'date_exp']);

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.searchSubject.complete();
  }

  constructor(
    private fb: FormBuilder,
    private jobseekerService: JobseekerManagerService,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    public authService: AuthService,
    public downloadService: DownloadService,
    private globalSettingsService: GlobalSettingsService,
    private licenseState: LicenseStateService 
  ) {
    // Initialize debounce subscription
    this.searchSubject.pipe(
      debounceTime(5000) // 5 seconds delay
    ).subscribe(() => {
      if (this.quickSearchPassport.trim() === '') {
        this.searchForm.reset();
        this.searchForm.patchValue({
          spassport: ''
        });
        this.onSearch();
      }
    });
    this.searchForm = this.fb.group({
      sparCat: [''],
      fsssubCat: [[]],
      fssplCat: [[]],
      sjobid: [''],
      susrName: [''],
      semail: [''],
      sfdate: [''],
      stodate: [''],
      sgender: [''],
      sempl: [''],
      syear: [''],
      smonth: [''],
      txtsquali: [''],
      sreligoin: [''],
      sprojrct: [''],
      sortto: [''],
      sortby: [''],
      spassport: [''],
      sddcity: [[]],
      sfatherName: [''],
      sfinalremark: [''],
      archdoc: [false]
    });
    this.jobseekerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      upassword: ['', Validators.required],
      contact_no: ['', Validators.required],
      fname: ['', Validators.required],
      lname: [''],
      parCat: ['', Validators.required],
      sssubCat: ['', Validators.required],
      ssplCat: ['', Validators.required],
      father_name: [''],
      gender: ['', Validators.required],
      dob: ['', Validators.required],
      birth_place: [''],
      country: ['', Validators.required],
      ddcity: ['', Validators.required],
      religoin: [''],
      marri: [''],
      locationtxt: [''],
      presentadd: [''],
      txtpermadd: [''],
      passport_no: [''],
      issue_place: [''],
      date_issue: [''],
      date_exp: [''],
      graduation: [''],
      graduation_year: [''],
      pgraduation: [''],
      pgraduation_year: [''],
      Felloship: [''],
      Felloship_year: [''],
      year: ['', Validators.required],
      month: ['', Validators.required],
      resu_headline: ['', Validators.required],
      resume_file: [null],
      document_file: [null],
      presume: [''],
      sassignTsk: ['']
    });
    this.remarkForm = this.fb.group({
      finalremark: ['', Validators.required],
      rmktext: ['']
    });
    this.emailForm = this.fb.group({
      additionalEmails: [''],
      emailSubject: [''],
      emailMessage: ['', Validators.required]
    });
  }

  ngAfterViewInit(): void {
    try {
      if (this.remarkModalEl?.nativeElement) {
        this.remarkModalInstance = new bootstrap.Modal(this.remarkModalEl.nativeElement, {
          backdrop: 'static',
          keyboard: false
        });
      }
      if (this.resumeLogModalEl?.nativeElement) {
        this.resumeLogModalInstance = new bootstrap.Modal(this.resumeLogModalEl.nativeElement, {
          backdrop: 'static',
          keyboard: false
        });
      }
      this.updateFloatingLabels();
    } catch (e) {
      console.error('Failed to initialize modals:', e);
    }
  }
  // ngOnDestroy(): void {
  //   throw new Error('Method not implemented.');
  // }

  ngOnInit(): void {
    this.licenseState.licenseData$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.licenseData = data;
      // console.log('License Data in Employee Manager:', this.licenseData);
    });

    // populate currentUser; template should reference privileges via currentUser?.printresumechk etc
    this.currentUser = this.authService.currentUserValue;

    this.route.queryParams.subscribe(params => {
      // Patch only keys that exist in the searchForm
      const patch: any = {};
      Object.keys(params).forEach(key => {
        if (this.searchForm.contains(key)) {
          patch[key] = params[key];
        }
      });
      if (Object.keys(patch).length > 0) {
        this.searchForm.patchValue(patch);
        this.exportEnabled = true;
        this.listJobseekers();
      } else {
        this.listJobseekers();
      }

      // If an editId query param is present, navigate to edit after list loads
      const editId = params['editId'] || null;
      if (editId) {
        // call onEditClick with minimal object once list is loaded
        // Use a small timeout to ensure list rendering and services are ready
        setTimeout(() => {
          this.onEditClick({ id: String(editId) });
        }, 200);
      }
      // If route param 'id' present (standalone edit route), show only the add/edit form
      const routeParamId = this.route.snapshot.paramMap.get('id');
      if (routeParamId) {
        // show add/edit area only
        this.addRecdFlg = true;
        this.listRecdFlg = false;
        this.isEditMode = true;
        this.editJobseekerId = String(routeParamId);
        // populate form
        setTimeout(() => {
          this.onEditClick({ id: String(routeParamId) });
        }, 150);
      }
      
      // Check if route data indicates to show add form (for left menu navigation)
      const showAddForm = this.route.snapshot.data['showAddForm'];
      if (showAddForm) {
        // Show add form directly
        setTimeout(() => {
          this.onShowAddForm();
        }, 100);
      }
      
      // Check if route data indicates assign CV mode
      const assignCvMode = this.route.snapshot.data['assignCvMode'];
      if (assignCvMode) {
        this.assignCvMode = true;
      }
      this.loadParentCategories();
      this.loadEmployees();
      this.loadQualifications();
      this.loadProjects();
      // load cities first so locations/cityOptions are available
      // default country for Indian users
      this.jobseekerForm.patchValue({ country: '56' });
      // populate city dropdowns for default country
      this.loadCityDropdown('56');
      this.loadRemarks();
      this.loadCountries();
      this.loadQualificationLists();
      this.generateYearsList();

      // detect if opened as a standalone edit window (popup) or via standalone route
      try {
        this.isStandaloneWindow = !!(window && window.opener) || (this.route.snapshot.paramMap.get('id') !== null);
      } catch (e) {
        this.isStandaloneWindow = false;
      }
    });
    this.updateFloatingLabels();
  }

  loadParentCategories(): void {
    this.commonService.loadParentCategories().subscribe(res => {
      if (res?.status === 'success' && res.data) {
        this.parentCategories = Object.entries(res.data).map(([id, name]) => ({ id, name }));
      }
    });
  }

  // ...existing code...

  onParentCategoryChange(): void {
    // Handle search form
    const searchCatId = this.searchForm.controls['sparCat'].value;
    this.subCategories = [];
    this.specializations = [];
    this.subCategoryOptions = [];
    this.specializationOptions = [];
    this.searchForm.patchValue({ fsssubCat: [], fssplCat: [] });

    // Handle add form
    const addCatId = this.jobseekerForm.controls['parCat'].value;
    this.jobseekerForm.patchValue({ sssubCat: '', ssplCat: '' });

    // Load sub categories for search form
    if (searchCatId) {
      this.commonService.loadSubCategories(searchCatId).subscribe(res => {
        if (res?.status === 'success' && res.data) {
          this.subCategories = Object.entries(res.data).map(([id, name]) => ({ id, name }));
          this.subCategoryOptions = this.subCategories.map((s: any) => ({ id: String(s.id), name: String(s.name) }));
        }
      });
    }

    // Load sub categories for add form
    if (addCatId) {
      this.commonService.loadSubCategories(addCatId).subscribe(res => {
        if (res?.status === 'success' && res.data) {
          this.subCategories = Object.entries(res.data).map(([id, name]) => ({ id, name }));
        }
      });
    }
  }

  onAddFormParentCategoryChange(): void {
    const catId = this.jobseekerForm.controls['parCat'].value;
    this.jobseekerForm.patchValue({ sssubCat: '', ssplCat: '' });
    if (catId) {
      this.commonService.loadSubCategories(catId).subscribe(res => {
        if (res?.status === 'success' && res.data) {
          this.subCategories = Object.entries(res.data).map(([id, name]) => ({ id, name }));
        }
      });
    }
  }

  onAddFormSubCategoryChange(): void {
    const catId = this.jobseekerForm.controls['parCat'].value;
    const subCatId = this.jobseekerForm.controls['sssubCat'].value;
    this.jobseekerForm.patchValue({ ssplCat: '' });
    if (catId && subCatId) {
      this.commonService.loadSpecializations(catId, subCatId).subscribe(res => {
        if (res?.status === 'success' && res.data) {
          this.specializations = Object.entries(res.data).map(([id, name]) => ({ id, name }));
        }
      });
    }
  }

  onCountryChange(countryId?: string): void {
    const cid = countryId || this.jobseekerForm.get('country')?.value;
    this.selectedCountryId = cid ? String(cid) : '';
    // clear previous city selection
    this.jobseekerForm.patchValue({ ddcity: '' });
    if (!cid) {
      this.locations = [];
      this.cityOptions = [];
      return;
    }
    this.loadCityDropdown(String(cid));
  }

  onSubCategoryChange(): void {
    const catId = this.searchForm.controls['sparCat'].value;
    const subCats: string[] = this.searchForm.controls['fsssubCat'].value || [];
    this.specializations = [];
    this.specializationOptions = [];
    this.searchForm.patchValue({ fssplCat: [] });
    if (catId && Array.isArray(subCats) && subCats.length > 0) {
      const seen: Record<string, boolean> = {};
      subCats.forEach((subCatId: string) => {
        this.commonService.loadSpecializations(catId, subCatId).subscribe(res => {
          if (res?.status === 'success' && res.data) {
            const items = Object.entries(res.data).map(([id, name]) => ({ id, name }));
            // merge unique
            items.forEach((it: any) => {
              const key = String(it.id);
              if (!seen[key]) {
                seen[key] = true;
                this.specializations.push({ id: it.id, name: it.name });
              }
            });
            this.specializationOptions = this.specializations.map((s: any) => ({ id: String(s.id), name: String(s.name) }));
          }
        });
      });
    }
  }

  loadEmployees(): void {
    this.commonService.loadEmployees().subscribe(res => {
      if (res?.status === 'success' && res.data?.list) {
        this.employees = res.data.list;
      }
    });
  }

  loadQualifications(): void {
    this.commonService.loadQualifications().subscribe(res => {
      if (res?.status === 'success' && res.data?.list) {
        this.qualifications = res.data.list;
      }
    });
  }

  loadProjects(): void {
    this.commonService.loadProjects().subscribe(res => {
      if (res?.status === 'success' && res.data?.list) {
        this.projects = res.data.list;
      }
    });
  }


  // loadCities migrated to use CommonService.loadCityListByCountry via loadCityDropdown()

  loadRemarks(): void {
    const payload = { event: 'jobseeker', mode: 'rmkList', InputData: [{ rmType: '9' }] };
    this.jobseekerService.post(payload).subscribe(res => {
      if (res?.status === 'success' && res.data?.list) {
        this.remarks = Object.entries(res.data.list).map(([id, name]) => ({ id, name }));
      }
    });
  }

  loadCountries(): void {
    this.commonService.loadCountries().subscribe((res: any) => {
      const list = res?.status === 'success' ? res.data?.list : (res?.list || null);
      if (Array.isArray(list)) {
        this.countries = list;
      } else if (list && typeof list === 'object') {
        this.countries = Object.entries(list).map(([id, nameOrObj]: any) => {
          if (typeof nameOrObj === 'string' || typeof nameOrObj === 'number') return { id, name: nameOrObj };
          return { id, ...(nameOrObj as any) };
        });
      } else {
        this.countries = [];
      }
    }, () => { this.countries = []; });
  }

  loadQualificationLists(): void {
    // Graduation
    this.commonService.loadQualifications({ parentCategory: '6' }).subscribe((res: any) => {
      if (res?.status === 'success' && res.data?.list) {
        this.graduationList = res.data.list;
      }
    });
    // Post Graduation
    this.commonService.loadQualifications({ parentCategory: '7' }).subscribe((res: any) => {
      if (res?.status === 'success' && res.data?.list) {
        this.postGraduationList = res.data.list;
      }
    });
    // Fellowship/PhD
    this.commonService.loadQualifications({ parentCategory: '41' }).subscribe((res: any) => {
      if (res?.status === 'success' && res.data?.list) {
        this.fellowshipList = res.data.list;
      }
    });
  }

  generateYearsList(): void {
    const currentYear = new Date().getFullYear();
    this.yearsList = Array.from({ length: 100 }, (_, i) => currentYear - i);
  }

  toggleSection(section: 'personal' | 'passport' | 'education'): void {
    if (section === 'personal') this.showPersonalSection = !this.showPersonalSection;
    if (section === 'passport') this.showPassportSection = !this.showPassportSection;
    if (section === 'education') this.showEducationSection = !this.showEducationSection;
  }

  onFileSelected(event: Event, fileType: 'resume' | 'document'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Set the selected file based on type
      if (fileType === 'resume') {
        this.selectedResumeFile = file;
      } else {
        this.selectedDocumentFile = file;
      }
    }
  }

  clearFile(input: HTMLInputElement, fileType: 'resume' | 'document'): void {
    if (input) {
      input.value = '';
    }

    if (fileType === 'resume') {
      this.selectedResumeFile = null;
      const resumeCtrl = this.jobseekerForm.get('resume_file');
      if (resumeCtrl) {
        resumeCtrl.setValue(null);
        resumeCtrl.markAsPristine();
        resumeCtrl.markAsUntouched();
      }
    } else {
      this.selectedDocumentFile = null;
      const documentCtrl = this.jobseekerForm.get('document_file');
      if (documentCtrl) {
        documentCtrl.setValue(null);
        documentCtrl.markAsPristine();
        documentCtrl.markAsUntouched();
      }
    }
  }

  // Download existing uploaded files
  downloadExistingResume(): void {
    if (this.existingResumeUrl) {
      const payload = {
        event: 'msp',
        mode: 'dwnld',
        InputData: [{ fileUrl: this.existingResumeUrl }]
      };
      const filename = this.existingResumeFileName || 'Resume_download';
      this.downloadService.downloadFileFromApi(this.commonService.postBlob(payload), filename);
    }
  }

  downloadExistingDocument(): void {
    if (this.existingDocumentUrl) {
      const payload = {
        event: 'msp',
        mode: 'dwnld',
        InputData: [{ fileUrl: this.existingDocumentUrl }]
      };
      const filename = this.existingDocumentFileName || 'Document_download';
      this.downloadService.downloadFileFromApi(this.commonService.postBlob(payload), filename);
    }
  }

  // Remove existing file selections
  removeExistingResume(): void {
    // Call API to delete the file if editing an existing jobseeker
    if (this.editJobseekerId && this.existingResumeUrl) {
      const payload = {
        event: 'jobseeker',
        mode: 'delJsFiles',
        InputData: [
          {
            fileType: '1', // Resume file type
            artId: this.editJobseekerId
          }
        ]
      };
      this.jobseekerService.post(payload).subscribe({
        next: (res: any) => {
          if (res?.status === 'success') {
            this.sweetAlert.showToast('Resume file deleted successfully.', 'success');
          } else {
            this.sweetAlert.showToast(res?.message || 'Failed to delete resume file.', 'error');
          }
        },
        error: () => {
          this.sweetAlert.showToast('Error deleting resume file.', 'error');
        }
      });
    }

    // Clear local variables
    this.existingResumeUrl = '';
    this.existingResumeFileName = '';
    this.selectedResumeFile = null;
    // Clear the file input
    const resumeInput = document.getElementById('txtResume') as HTMLInputElement;
    if (resumeInput) {
      resumeInput.value = '';
    }
  }

  removeExistingDocument(): void {
    // Call API to delete the file if editing an existing jobseeker
    if (this.editJobseekerId && this.existingDocumentUrl) {
      const payload = {
        event: 'jobseeker',
        mode: 'delJsFiles',
        InputData: [
          {
            fileType: '2', // Document file type
            artId: this.editJobseekerId
          }
        ]
      };
      this.jobseekerService.post(payload).subscribe({
        next: (res: any) => {
          if (res?.status === 'success') {
            this.sweetAlert.showToast('Document file deleted successfully.', 'success');
          } else {
            this.sweetAlert.showToast(res?.message || 'Failed to delete document file.', 'error');
          }
        },
        error: () => {
          this.sweetAlert.showToast('Error deleting document file.', 'error');
        }
      });
    }

    // Clear local variables
    this.existingDocumentUrl = '';
    this.existingDocumentFileName = '';
    this.selectedDocumentFile = null;
    // Clear the file input
    const documentInput = document.getElementById('documentfile') as HTMLInputElement;
    if (documentInput) {
      documentInput.value = '';
    }
  }


  onDobChange(): void {
    const dob = this.jobseekerForm.get('dob')?.value;
    if (!dob) {
      this.calculatedAge = null;
      return;
    }

    const parseDate = (s: any): Date | null => {
      if (!s) return null;
      if (s instanceof Date) return s;
      const str = String(s).trim();
      // yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      }
      // dd-mm-yyyy
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [dd, mm, yyyy] = str.split('-');
        const iso = `${yyyy}-${mm}-${dd}`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
      }
      // fallback to Date constructor
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const birthDate = parseDate(dob);
    if (!birthDate) {
      this.calculatedAge = null;
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.calculatedAge = age;
  }

  onSubmitJobseeker(): void {
    if (this.jobseekerForm.invalid) {
      this.sweetAlert.showToast('Please fill all required fields.', 'warning');
      return;
    }

    const formValue = { ...this.jobseekerForm.value };

    // Normalize dates to dd-MM-yyyy for API (accept yyyy-MM-dd or dd-MM-yyyy)
    const normalizeToApiDate = (val: any) => {
      if (!val) return '';
      const s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-');
        return `${d}-${m}-${y}`;
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        return s;
      }
      // try Date parse
      const dObj = new Date(s);
      if (isNaN(dObj.getTime())) return '';
      const dd = String(dObj.getDate()).padStart(2, '0');
      const mm = String(dObj.getMonth() + 1).padStart(2, '0');
      const yy = dObj.getFullYear();
      return `${dd}-${mm}-${yy}`;
    };

    if (formValue.dob) formValue.dob = normalizeToApiDate(formValue.dob);
    if (formValue.date_issue) formValue.date_issue = normalizeToApiDate(formValue.date_issue);
    if (formValue.date_exp) formValue.date_exp = normalizeToApiDate(formValue.date_exp);

    // Add session fields from auth service
    const session = this.authService.currentUserValue;
    formValue.sess_userid = session?.userId || '0';
    // formValue.sassignTsk = session?.sassignTsk || '0';
    formValue.userType = session?.empType || '';
    // formValue.chrType = session?.chrType || '0';

    // Create payload object first (similar to client manager)
    const payload = {
      event: 'jobseeker',
      mode: this.isEditMode ? 'ur' : 'sv',
      InputData: [formValue]
    };

    // For update, add id if editing
    if (this.isEditMode && this.editJobseekerId) {
      payload.InputData[0].id = this.editJobseekerId;
    }

    // Check if we have files to upload
    if (this.selectedResumeFile || this.selectedDocumentFile) {
      // Use FormData for file uploads
      const formData = new FormData();

      // Add files to FormData if selected
      if (this.selectedResumeFile) {
        formData.append('txtResume', this.selectedResumeFile, this.selectedResumeFile.name);
      }

      if (this.selectedDocumentFile) {
        formData.append('documentfile', this.selectedDocumentFile, this.selectedDocumentFile.name);
      }

      // Add form fields directly to FormData (not nested in InputData)
      formData.append('event', 'jobseeker');
      formData.append('mode', this.isEditMode ? 'ur' : 'sv');

      // Add all form values directly to FormData
      Object.keys(formValue).forEach(key => {
        formData.append(key, formValue[key] !== null && formValue[key] !== undefined ? formValue[key] : '');
      });

      // For update, add id if editing
      // if (this.isEditMode && this.editJobseekerId) {
      //   formData.append('id', this.editJobseekerId);
      // }

      console.log('Submitting jobseeker payload with files:', formValue);
      console.log('formdata payload', formData);
      this.commonService.postWithFiles(formData).subscribe(res => {
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Jobseeker saved.', 'success');
          // If opened as standalone popup/window, notify opener and close
          if (this.notifyOpenerAndClose('saved', this.editJobseekerId || (res?.data && res.data.id) || '')) return;
          this.addRecdFlg = false;
          this.listRecdFlg = true;
          this.listJobseekers();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save jobseeker.');
        }
      }, () => {
        this.sweetAlert.showError('Failed to save jobseeker. Please try again.');
      });
    } else {
      // No files, use regular JSON payload
      console.log('Submitting jobseeker payload without files:', formValue);
      this.jobseekerService.post(payload).subscribe(res => {
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Jobseeker saved.', 'success');
          // If opened as standalone popup/window, notify opener and close
          if (this.notifyOpenerAndClose('saved', this.editJobseekerId || (res?.data && res.data.id) || '')) return;
          this.addRecdFlg = false;
          this.listRecdFlg = true;
          this.listJobseekers();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save jobseeker.');
        }
      }, () => {
        this.sweetAlert.showError('Failed to save jobseeker. Please try again.');
      });
    }
  }

  listJobseekers(): void {
    // Enable Session values
    // const session = this.authService.getSession ? this.authService.getSession() : this.authService.currentUserValue;
    const session = this.authService.currentUserValue;
    console.log('Session data-1:', session);

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.archivalchk = session?.archivalchk || '';
    this.printresumechk = session?.printresumechk || '';
    this.editresumechk = session?.editresumechk || '';
    this.viewresumechk = session?.viewresumechk || '';
    this.deleteOption = session?.deleteOption || '';
    // End Enable Session values

    this.loadingService.show('Loading jobseekers...');
    const formValue = { ...this.searchForm.value } as any;
    // Convert dates from yyyy-MM-dd to dd-MM-yyyy as API expects
    const formatDateForApi = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      const [y, m, d] = String(dateStr).split('-');
      return (d && m && y) ? `${d}-${m}-${y}` : String(dateStr);
    };
    formValue.sfdate = formatDateForApi(formValue.sfdate);
    formValue.stodate = formatDateForApi(formValue.stodate);

    // Ensure multi-select fields are numeric arrays
    formValue.fsssubCat = Array.isArray(formValue.fsssubCat) ? formValue.fsssubCat.map((v: any) => Number(v)) : [];
    formValue.fssplCat = Array.isArray(formValue.fssplCat) ? formValue.fssplCat.map((v: any) => Number(v)) : [];
    formValue.sddcity = Array.isArray(formValue.sddcity) ? formValue.sddcity.map((v: any) => Number(v)) : [];

    const payload = {
      event: 'jobseeker',
      mode: 'lr',
      InputData: [{
        ...formValue,
        page: this.currentPage.toString(),
        perPage: this.pageSize.toString(),
        clickval: this.clickval,
        userId: this.userId
      }]
    };
    this.jobseekerService.post(payload).subscribe(res => {
      this.loadingService.hide();
      if (res?.status === 'success' && res.data?.list) {
        console.log('Jobseekers response data:', res.data);
        this.jobseekers = res.data.list;
        this.totalRecords = res.data.total_records?.toString() || '0';
        this.totalPages = Math.ceil(Number(this.totalRecords) / this.pageSize);
        this.noDataMessage = '';
      } else {
        this.noDataMessage = res?.message || 'No data found.';
        this.sweetAlert.showToast('No jobseekers found.', 'info');
        this.jobseekers = [];
        this.totalRecords = '0';
        this.totalPages = 0;
      }
    }, () => {
      this.sweetAlert.showError('Failed to load jobseekers. Please try again.');
      this.jobseekers = [];
      this.totalRecords = '0';
      this.totalPages = 0;
    });
  }

  /**
   * Set clickval filter (0=All,1=Self CV,2=CV by Me) and reload listing
   */
  setClickval(val: string): void {
    if (this.clickval === val) return; // no-op
    this.clickval = val;
    this.currentPage = 1;
    this.listJobseekers();
  }

  onExport(): void {

    // Cooldown guard
    if (this.isInCooldown) {
      const seconds = Math.ceil(((this.exportCooldownUntil || 0) - Date.now()) / 1000);
      this.sweetAlert.showToast(`Please wait ${seconds}s before exporting again.`, 'info');
      return;
    }

    // Global export limit guard
    const settings = this.globalSettingsService.getSettings();
    const limit = Number(settings.export_excel_limit || '0');
    const total = Number(this.totalRecords || '0');
    if (limit > 0 && total > limit) {
      this.sweetAlert.showToast(`Export restricted to ${limit} records. Please narrow your search.`, 'warning');
      return;
    }

    this.isExporting = true;
    this.loadingService.show('Exporting...');

    const formValue = { ...this.searchForm.value } as any;
    // Convert dates from yyyy-MM-dd to dd-MM-yyyy as API expects
    const formatDateForApi = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      const [y, m, d] = String(dateStr).split('-');
      return (d && m && y) ? `${d}-${m}-${y}` : String(dateStr);
    };
    formValue.sfdate = formatDateForApi(formValue.sfdate);
    formValue.stodate = formatDateForApi(formValue.stodate);

    // Ensure multi-select fields are numeric arrays
    formValue.fsssubCat = Array.isArray(formValue.fsssubCat) ? formValue.fsssubCat.map((v: any) => Number(v)) : [];
    formValue.fssplCat = Array.isArray(formValue.fssplCat) ? formValue.fssplCat.map((v: any) => Number(v)) : [];
    formValue.sddcity = Array.isArray(formValue.sddcity) ? formValue.sddcity.map((v: any) => Number(v)) : [];

    const payload = {
      event: 'jobseeker',
      mode: 'lr',
      InputData: [{
        ...formValue,
        page: this.currentPage.toString(),
        perPage: this.pageSize.toString(),
        clk: 'exp'
      }]
    };
    this.jobseekerService.post(payload).subscribe({
      next: (res) => {
        // hide global spinner before showing any toast so they don't overlap
        this.loadingService.hide();
        if (res?.status === 'success' && res.data?.content) {
          this.saveHtmlAsXls(res.data.content as string);
          this.sweetAlert.showToast('Jobseekers exported successfully.', 'success');
          this.exportCooldownUntil = Date.now() + 10000; // 10s cooldown
        } else {
          this.sweetAlert.showToast(res?.message || 'No jobseekers found.', 'info');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.isExporting = false;
        this.sweetAlert.showError('Failed to export jobseekers. Please try again.');
      },
      complete: () => {
        // ensure flags and spinner are reset
        this.isExporting = false;
        this.loadingService.hide();
      }
    });
  }

  private saveHtmlAsXls(htmlTable: string): void {
    const blob = new Blob([`\ufeff${htmlTable}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const pad = (n: number) => n.toString().padStart(2, '0');
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const stamp = `${pad(now.getDate())}${monthAbbr[now.getMonth()]}${now.getFullYear()}`;
    a.href = url;
    a.download = `Job_Seeker_${stamp}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.listJobseekers();
    }
  }

  onJumpToPage(page?: number): void {
    const targetPage = page ?? this.jumpToPage;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.onPageChange(targetPage);
    } else {
      this.jumpToPage = this.currentPage;
    }
  }

  onSearch(): void {
    const hasAnyCriteria = Object.values(this.searchForm.value).some((v: any) => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'boolean') return v === true;
      return v !== null && v !== undefined && String(v).trim() !== '';
    });
    if (!hasAnyCriteria) this.sweetAlert.showToast('Please enter/select at least one search criteria', 'warning');
    this.currentPage = 1;
    this.exportEnabled = hasAnyCriteria;
    this.listJobseekers();
  }

  onClearSearch(): void {
    this.searchForm.reset();
    this.currentPage = 1;
    this.exportEnabled = false;
    this.listJobseekers();
    this.updateFloatingLabels();
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const inputs = document.querySelectorAll('.input-group input, .input-group select');
      inputs.forEach((input: Element) => {
        const element = input as HTMLInputElement | HTMLSelectElement;
        this.checkInput(element);
      });
    });
  }

  onClearJobseeker(): void {
    this.jobseekerForm.reset();
    // set country by default india that is id 56
    this.jobseekerForm.controls['country'].setValue(56);
    this.jobseekerForm
    this.submitted = false;
    this.updateFloatingLabels();
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const inputs = document.querySelectorAll('.input-group input, .input-group select');
      inputs.forEach((input: Element) => {
        const element = input as HTMLInputElement | HTMLSelectElement;
        this.checkInput(element);
      });
    });
  }

  onItemSelect(itemId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
  }

  onSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.jobseekers.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
  }

  onChangeVisibilityClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to change visibility', 'warning');
      return;
    }
    this.sweetAlert.confirmStatusChange('Are you sure you want to change the visibility of selected jobseekers?').then((result: any) => {
      if (result.isConfirmed) {
        this.confirmChangeVisibility();
      }
    });
  }

  private confirmChangeVisibility(): void {
    const idsToChange = Array.from(this.selectedItems);
    const payload = {
      event: 'jobseeker',
      mode: 'cs',
      InputData: [{ ...this.searchForm.value, page: this.currentPage.toString(), artId: idsToChange }]
    };
    this.jobseekerService.post(payload).subscribe(res => {
      this.loadingService.hide();
      if (res?.status === 'success') {
        this.sweetAlert.showToast(res.message || 'Visibility updated.', 'success');
        this.selectedItems.clear();
        this.listJobseekers();
      } else {
        this.sweetAlert.showError(res?.message || 'Failed to update visibility');
      }
    }, () => {
      this.loadingService.hide();
      this.sweetAlert.showError('Failed to change visibility. Please try again.');
    });
    this.loadingService.show('Updating...');
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to delete', 'warning');
      return;
    }
    this.sweetAlert.confirmDelete('Are you sure you want to delete selected jobseekers?').then((result: any) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }

  private confirmDelete(): void {
    const idsToDelete = Array.from(this.selectedItems);
    const payload = {
      event: 'jobseeker',
      mode: 'dr',
      InputData: [{ ...this.searchForm.value, page: this.currentPage.toString(), artId: idsToDelete }]
    };
    this.jobseekerService.post(payload).subscribe(res => {
      this.loadingService.hide();
      if (res?.status === 'success') {
        this.sweetAlert.showToast(res.message || 'Jobseekers deleted.', 'success');
        this.selectedItems.clear();
        this.listJobseekers();
      } else {
        this.sweetAlert.showError(res?.message || 'Failed to delete records');
      }
    }, () => {
      this.loadingService.hide();
      this.sweetAlert.showError('Failed to delete jobseekers. Please try again.');
    });
    this.loadingService.show('Deleting...');
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.isEditMode = false;
    this.editJobseekerId = null;
    this.jobseekerForm.reset();
    this.selectedResumeFile = null;
    this.selectedDocumentFile = null;
    // Clear existing file information
    this.existingResumeUrl = '';
    this.existingResumeFileName = '';
    this.existingDocumentUrl = '';
    this.existingDocumentFileName = '';
    this.calculatedAge = null;
    // set default country (India id=56) and clear city selection
    this.jobseekerForm.patchValue({ country: '56', ddcity: '' });
    this.updateFloatingLabels();
  }

  onCancelClick(): void {
    // If opened in standalone mode, notify opener and close window
    if (this.notifyOpenerAndClose('cancelled', this.editJobseekerId || '')) return;
    this.addRecdFlg = false;
    this.listRecdFlg = true;
    this.updateFloatingLabels();
  }

  // Email form methods
  onShowEmailForm(): void {
    this.showEmailForm = true;
    this.emailForm.reset();
  }

  onCancelEmailForm(): void {
    this.showEmailForm = false;
    this.emailForm.reset();
  }

  onSendEmail(): void {
    if (this.emailForm.invalid) {
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (this.selectedItems.size === 0) {
      this.sweetAlert.showAlertCenter('No Jobseekers Selected', 'Please select at least one jobseeker to send email.', 'warning');
      return;
    }

    const formValue = this.emailForm.value;
    const artId = Array.from(this.selectedItems).map(Number);
    // Get the logged-in user's email (try different keys)
    const currUser = this.authService.currentUserValue;
    const fromEmail = currUser?.emailId || currUser?.email || '';

    this.sweetAlert.confirmAction(
      'Send Email?',
      `Are you sure you want to send email to <b>${artId.length}</b> jobseeker(s)?`,
      'Send', 'Cancel', 'question'
    ).then((result) => {
      if (result.isConfirmed) {
        const payload = {
          event: 'jobseeker',
          mode: 'smail',
          InputData: [
            {
              artId: artId,
              fromEmail: fromEmail,
              subject: formValue.emailSubject || '',
              emaildesc: formValue.emailMessage || ''
            }
          ]
        };
        console.log('Email payload:', payload);

        this.loadingService.show('Sending email...');
        this.jobseekerService.post(payload).subscribe({
          next: (res: any) => {
            console.log('Email response:', res);
            this.loadingService.hide();
            if (res?.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Email sent successfully.', 'success');
              this.onCancelEmailForm();
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
    });
  }

  /**
   * If this window was opened by another window (window.opener exists), post a message and close.
   * Returns true when the opener was notified and this window closed (or attempted to), false otherwise.
   */
  private notifyOpenerAndClose(action: 'saved' | 'cancelled', id: string): boolean {
    try {
      if (typeof window !== 'undefined' && (window.opener as any)) {
        try {
          window.opener.postMessage({ type: 'jobseeker-updated', id: id || '', action }, window.location.origin);
        } catch (postErr) {
          // ignore postMessage errors (best-effort)
        }
        try { window.close(); } catch (closeErr) { /* ignore */ }
        return true;
      }
    } catch (e) {
      // ignore any access errors
    }
    return false;
  }

  onEditClick(item: any): void {
    // Fetch full record from server (mode 'er') and populate add/edit form
    this.loadingService.show('Loading jobseeker...');
    const payload = {
      event: 'jobseeker',
      mode: 'er',
      InputData: [
        {
          id: item.id,
          sparCat: item.sparCat || '',
          fssplCat: item.fssplCat || '',
          fsssubCat: item.fsssubCat || '',
          susrName: item.susrName || '',
          sjobid: item.sjobid || '',
          sfdate: item.sfdate || '',
          stodate: item.stodate || '',
          sgender: item.sgender || '',
          sfatherName: item.sfatherName || '',
          semail: item.semail || '',
          page: item.page || '1'
        }
      ]
    };

    this.jobseekerService.post(payload).subscribe({
      next: (res: any) => {
        console.log('Edit fetch response:', res);
        this.loadingService.hide();
        if (res?.status === 'success' && res.data) {
          const data = res.data;
          const row = data.row || data;

          const convertDateForForm = (dateStr: string) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return dateStr;
          };

          this.isEditMode = true;
          this.editJobseekerId = data.id || row.int_user_id || item.id;
          this.addRecdFlg = true;
          this.listRecdFlg = false;

          // Map server row fields to form controls
          this.jobseekerForm.patchValue({
            email: row.var_email || row.var_email || '',
            upassword: row.var_password || '',
            contact_no: row.var_contactno || '',
            fname: row.var_fname || '',
            lname: row.var_lname || '',
            parCat: row.int_cat_id ? String(row.int_cat_id) : '',
            sssubCat: row.int_sub_cat_id ? String(row.int_sub_cat_id) : '',
            ssplCat: row.int_subspeci_id ? String(row.int_subspeci_id) : '',
            father_name: row.var_father_name || '',
            gender: row.int_gender ? String(row.int_gender) : '',
            dob: convertDateForForm(row.date_dob || row.dob || ''),
            birth_place: row.var_place_birth || '',
            country: row.int_country ? String(row.int_country) : '',
            ddcity: row.int_state ? String(row.int_state) : (row.var_city || ''),
            religoin: row.int_religon ? String(row.int_religon) : '',
            marri: row.int_married ? String(row.int_married) : '',
            locationtxt: row.locationtxt || '',
            presentadd: row.var_paddress || '',
            txtpermadd: row.var_prmaddress || '',
            passport_no: row.passport_no || '',
            issue_place: row.issue_place || '',
            date_issue: convertDateForForm(row.date_issue || ''),
            date_exp: convertDateForForm(row.date_exp || ''),
            graduation: row.int_garduation ? String(row.int_garduation) : '',
            graduation_year: row.int_gq_year ? String(row.int_gq_year) : '',
            pgraduation: row.int_post_gradu ? String(row.int_post_gradu) : '',
            pgraduation_year: row.int_pg_year ? String(row.int_pg_year) : '',
            Felloship: row.phd ? String(row.phd) : '',
            Felloship_year: row.phd_year ? String(row.phd_year) : '',
            year: row.int_exp_year ? String(row.int_exp_year) : '',
            month: row.int_exp_month ? String(row.int_exp_month) : '',
            resu_headline: row.var_rheadline || '',
            presume: row.text_resume || '',
            sassignTsk: row?.int_project_id || ''
          });

          // Ensure floating labels reflect prefilled values after initial patch
          this.updateFloatingLabels();

          // Load dependent dropdowns and cities
          if (row.int_cat_id) {
            const catIdStr = String(row.int_cat_id);
            // Load subcategories for the category, then patch subcat and load specializations
            this.commonService.loadSubCategories(catIdStr).subscribe({
              next: (subRes: any) => {
                if (subRes?.status === 'success' && subRes.data) {
                  this.subCategories = Object.entries(subRes.data).map(([id, name]) => ({ id, name }));
                } else if (subRes && Array.isArray(subRes)) {
                  // handle some endpoints that might directly return array
                  this.subCategories = subRes;
                } else {
                  this.subCategories = [];
                }
                // Patch selected subcategory from server row
                const selectedSub = row.int_sub_cat_id ? String(row.int_sub_cat_id) : '';
                this.jobseekerForm.patchValue({ sssubCat: selectedSub });

                // If there's a selected subcategory, load specializations and patch
                const subCatId = row.int_sub_cat_id ? String(row.int_sub_cat_id) : '';
                if (catIdStr && subCatId) {
                  this.commonService.loadSpecializations(catIdStr, subCatId).subscribe({
                    next: (specRes: any) => {
                      if (specRes?.status === 'success' && specRes.data) {
                        this.specializations = Object.entries(specRes.data).map(([id, name]) => ({ id, name }));
                      } else if (specRes && Array.isArray(specRes)) {
                        this.specializations = specRes;
                      } else {
                        this.specializations = [];
                      }
                      const selectedSpec = row.int_subspeci_id ? String(row.int_subspeci_id) : '';
                      this.jobseekerForm.patchValue({ ssplCat: selectedSpec });
                      // After specialization patch, update floating labels (simple pattern)
                      setTimeout(() => this.updateFloatingLabels(), 0);
                    },
                    error: () => {
                      this.specializations = [];
                    }
                  });
                } else {
                  // no subcategory -> clear specializations
                  this.specializations = [];
                  this.jobseekerForm.patchValue({ ssplCat: row.int_subspeci_id ? String(row.int_subspeci_id) : '' });
                  // Update floating labels when patching without subcategory
                  setTimeout(() => this.updateFloatingLabels(), 0);
                }
              },
              error: () => {
                this.subCategories = [];
                this.specializations = [];
                this.jobseekerForm.patchValue({ sssubCat: row.int_sub_cat_id ? String(row.int_sub_cat_id) : '', ssplCat: row.int_subspeci_id ? String(row.int_subspeci_id) : '' });
                // Update floating labels on error fallback patch
                setTimeout(() => this.updateFloatingLabels(), 0);
              }
            });
          }
          const countryIdStr = row.int_country ? String(row.int_country) : '56';
          this.jobseekerForm.patchValue({ country: countryIdStr });
          const applyCityPatch = () => {
            // filter preloaded locations for the country and set ddcity
            const loc = (this.locations || []).find((l: any) => String(l.country_id || l.CountryId || l.countryid || '') === countryIdStr || String(l.country || l.Country || '') === countryIdStr || String(l.countryid || '') === countryIdStr);
            // prefer int_state or var_city from row
            this.jobseekerForm.patchValue({ ddcity: row.int_state ? String(row.int_state) : (row.var_city || (loc ? String(loc.id) : '')) });
            // Update floating labels after city patch
            setTimeout(() => this.updateFloatingLabels(), 0);
          };
          if (!this.locations || this.locations.length === 0) {
            // ensure list is loaded and then apply
            this.loadCityDropdown(countryIdStr);
            // apply after microtask to mirror Job Category pattern
            setTimeout(() => applyCityPatch(), 0);
          } else {
            applyCityPatch();
          }

          this.selectedResumeFile = null;
          this.selectedDocumentFile = null;
          
          // Populate existing file information (URL only, no need for file names on edit)
          this.existingResumeUrl = data.resume_url || '';
          this.existingDocumentUrl = data.document_url || '';
          
          this.calculatedAge = null;
          this.onDobChange();

        } else {
          this.sweetAlert.showError(res?.message || 'Failed to load jobseeker details.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to load jobseeker details. Please try again.');
      }
    });
    // this.updateFloatingLabels();
  }

  onViewClick(item: any): void {
    // Check view privilege
    if (this.viewresumechk !== '1' && !(this.userId === '1' && this.userType === '1')) {
      this.sweetAlert.showToast('You do not have permission to view resumes.', 'error');
      return;
    }

    const id = item?.id || item?.int_user_id || '';
    if (!id) {
      this.sweetAlert.showToast('No record id found to view.', 'warning');
      return;
    }
    // Open in view mode (without print button)
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

  onPrintClick(item: any): void {
    // Check print privilege
    if (this.printresumechk !== '1' && !(this.userId === '1' && this.userType === '1')) {
      this.sweetAlert.showToast('You do not have permission to print resumes.', 'error');
      return;
    }

    const id = item?.id || item?.int_user_id || '';
    if (!id) {
      this.sweetAlert.showToast('No record id found to print.', 'warning');
      return;
    }

    // Open in hidden iframe and trigger print directly
    // const absolute = `${window.location.origin}/print-resume/${encodeURIComponent(id)}?mode=print`;

    const baseHref = document.querySelector('base')?.href || window.location.href;
    const absolute = `${baseHref}print-resume/${encodeURIComponent(id)}?mode=print`;


    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = absolute;

    document.body.appendChild(iframe);

    let hasPrinted = false;
    let fallbackTimer: any = null;

    // Function to handle print
    const handlePrint = () => {
      if (hasPrinted) return; // Prevent double printing
      hasPrinted = true;

      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.print();
          // Remove iframe after print dialog is closed
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 2000);
        }
      } catch (err) {
        this.sweetAlert.showError('Failed to open print dialog. Please try again.');
        document.body.removeChild(iframe);
      }
    };

    iframe.onload = () => {
      // Listen for the content-ready event from the iframe
      iframe.contentWindow?.addEventListener('resume-content-ready', handlePrint);

      // Fallback: if after 5 seconds we haven't received the event, try to print anyway
      fallbackTimer = setTimeout(() => {
        const content = iframe.contentWindow?.document?.body?.innerHTML;
        if (content && content.length > 0 && !hasPrinted) {
          handlePrint();
        } else if (!hasPrinted) {
          this.sweetAlert.showError('Failed to load resume content. Please try again.');
          document.body.removeChild(iframe);
        }
      }, 5000);
    };
  }

  onUploadClick(item: any): void {
    // TODO: Implement upload functionality
    const id = item?.id || item?.int_user_id || '';
    if (!id) {
      this.sweetAlert.showToast('No record id found to Archive.', 'warning');
      return;
    }
    // Open in a separate browser window (not the app body)
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

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }

  toggleCvFilter(): void {
    this.cvFilterOpen = !this.cvFilterOpen;
  }

  closeCvFilter(): void {
    this.cvFilterOpen = false;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.cvFilterOpen) return;
    const menu = document.getElementById('cvFilterMenu');
    const btn = document.getElementById('cvFilterBtn');
    const target = event.target as Node | null;
    if (menu && btn && target && !menu.contains(target) && !btn.contains(target)) {
      this.cvFilterOpen = false;
    }
  }

  checkInput(input: EventTarget | null): void {
    if (!input) return;
    const element = input as HTMLInputElement | HTMLSelectElement;
    if (this.ALWAYS_ACTIVE_IDS.has(element.id)) {
      element.classList.add('active');
      return;
    }
    if (element.value && element.value.length > 0) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  }

  onJobseekerEmailBlur(): void {
    const control = this.jobseekerForm.get('email');
    const email = (control?.value || '').trim();

    // If empty or fails basic validators, clear duplicate state and skip API
    if (!email || (control?.hasError('required')) || (control?.hasError('email'))) {
      this.setEmailDuplicate(false);
      this.emailExistsMessage = '';
      return;
    }

    const payload: any = {
      event: 'jobseeker',
      mode: this.isEditMode ? 'chkemailed' : 'chkemail',
      InputData: [this.isEditMode ? { email, id: this.editJobseekerId || '' } : { email }]
    };

    this.isCheckingEmail = true;
    this.jobseekerService.post(payload).subscribe(res => {
      this.isCheckingEmail = false;
      const msg: string = (res?.message || '').toString();
      const duplicate = res?.status === 'success' && msg.toLowerCase().includes('exists');
      this.setEmailDuplicate(duplicate);
      this.emailExistsMessage = duplicate ? (msg || 'Email Id already Exists!') : '';
    }, _ => {
      this.isCheckingEmail = false;
      // On API error, don't block submission
      this.emailExistsMessage = '';
      this.setEmailDuplicate(false);
    });
  }

  private setEmailDuplicate(duplicate: boolean): void {
    const control = this.jobseekerForm.get('email');
    if (!control) return;
    const currentErrors = { ...(control.errors || {}) } as any;
    if (duplicate) currentErrors['duplicate'] = true;
    else delete currentErrors['duplicate'];
    const hasErrors = Object.keys(currentErrors).length > 0;
    control.setErrors(hasErrors ? currentErrors : null);
  }

  // checkAddFormInput(input: EventTarget | null): void {
  //   if (!input) return;
  //   const element = input as HTMLInputElement | HTMLSelectElement;
  //   if (element.value && element.value.length > 0) {
  //     element.classList.add('active');
  //   } else {
  //     element.classList.remove('active');
  //   }
  // }

  onCitySelectionChange(selectedIds: string[]): void {
    // Handle city selection change - the form control is automatically updated
  }

  async openRemarkModal(item: any): Promise<void> {
    this.currentRemarkJobseeker = item;

    if (!this.remarks || this.remarks.length === 0) {
      await this.loadRemarks();
    }

    const selectedRemark = item.finalremark || '';
    const remarkText = item.rmktext || '';

    this.remarkForm.patchValue({
      finalremark: selectedRemark,
      rmktext: remarkText
    });

    if (this.remarkModalInstance) {
      this.remarkModalInstance.show();
    }
  }

  closeRemarkModal(): void {
    if (this.remarkModalInstance) {
      this.remarkModalInstance.hide();
    }
    this.isRemarkMaximized = false;
    this.currentRemarkJobseeker = null;
  }

  toggleRemarkMaximize(): void {
    this.isRemarkMaximized = !this.isRemarkMaximized;
  }

  onUpdateRemark(): void {
    if (!this.currentRemarkJobseeker) return;
    if (this.remarkForm.invalid) {
      this.sweetAlert.showToast('Please select a remark.', 'warning');
      return;
    }
    const payload = {
      event: 'jobseeker',
      mode: 'rmkUpdate',
      InputData: [
        {
          jid: this.currentRemarkJobseeker.id,
          finalremark: this.remarkForm.value.finalremark,
          rmktext: this.remarkForm.value.rmktext
        }
      ]
    };
  this.jobseekerService.post(payload).subscribe(res => {
    if (res?.status === 'success') {
      this.sweetAlert.showToast(res.message || 'Remark updated.', 'success');
      this.remarkForm.reset();
      this.listJobseekers();
      this.closeRemarkModal();
    } else {
      this.sweetAlert.showError(res?.message || 'Failed to update remark.');
    }
  }, () => {
    this.sweetAlert.showError('Failed to update remark. Please try again.');
  });
  }

  downloadFile(fileUrl: string, filename: string = 'Document_download') {
    if (!fileUrl) return;
    // NOTE: This is for API-based download of files (document_file, resume_file, etc).
    // API may vary, adjust payload as required for resume/doc download endpoint.
    const payload = {
      event: 'msp', // Adjust if a different event/mode applies for jobseeker documents
      mode: 'dwnld',
      InputData: [{ fileUrl }]
    };
    this.downloadService.downloadFileFromApi(this.commonService.postBlob(payload), filename);
  }

  async openResumeLogModal(item: any): Promise<void> {
    this.loadingService.show('Loading resume log...');
    this.currentResumeLogJobseeker = item;
    const id = item.id;
    if (!id) {
      this.sweetAlert.showError('Invalid jobseeker ID');
      this.loadingService.hide();
      return;
    }

    try {
      const payload = {
        event: 'astsk',
        mode: 'logResUp',
        InputData: [{ id, page: '1' }]
      };

      this.jobseekerService.post(payload).subscribe(
        (res) => {
          this.loadingService.hide();
          if (res?.status === 'success' && Array.isArray(res.data?.list) && res.data.list.length > 0) {
            this.resumeLogList = res.data.list;
            if (this.resumeLogModalInstance) {
              this.resumeLogModalInstance.show();
            }
          } else {
            this.sweetAlert.showToast('No resume log history found.', 'info');
          }
        },
        (error) => {
          console.error('Error fetching resume log:', error);
          this.sweetAlert.showError('Failed to fetch resume log history.');
        }
      );
    } catch (error) {
      console.error('Error in openResumeLogModal:', error);
      this.sweetAlert.showError('An error occurred while showing resume log.');
      this.loadingService.hide();
    }
  }

  closeResumeLogModal(): void {
    if (this.resumeLogModalInstance) {
      this.resumeLogModalInstance.hide();
    }
    this.isResumeLogMaximized = false;
    this.currentResumeLogJobseeker = null;
  }

  toggleResumeLogMaximize(): void {
    this.isResumeLogMaximized = !this.isResumeLogMaximized;
  }

  get isInCooldown(): boolean {
    return this.exportCooldownUntil !== null && Date.now() < (this.exportCooldownUntil as number);
  }

  // Normalized getters to ensure templates always receive arrays for ngFor
  get countriesList(): any[] {
    const c = this.countries;
    if (Array.isArray(c)) return c;
    if (c && typeof c === 'object') {
      return Object.entries(c).map(([id, val]: any) => {
        if (typeof val === 'string' || typeof val === 'number') return { id, name: val };
        return { id, ...(val as any) };
      });
    }
    return [];
  }

  get locationsList(): any[] {
    const l = this.locations;
    if (Array.isArray(l)) return l;
    if (l && typeof l === 'object') {
      return Object.entries(l).map(([id, val]: any) => ({ id, ...(val as any) }));
    }
    return [];
  }

  get exportTooltip(): string {
    if (!this.exportEnabled) return 'Export the Search result in Excel Sheet';
    if (this.isExporting) return 'Exporting... please wait';
    if (this.isInCooldown) {
      const seconds = Math.ceil(((this.exportCooldownUntil || 0) - Date.now()) / 1000);
      return `Please wait ${seconds}s before exporting again`;
    }
    return 'Export the Search result in Excel Sheet';
  }

  onProjectChange(event: any): void {
    this.selectedProjectId = event.target.value;
  }

  onAssignCvsToProject(): void {
    if (!this.selectedProjectId) {
      this.sweetAlert.showToast('Please select a project first.', 'warning');
      return;
    }

    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one CV to assign.', 'warning');
      return;
    }

    const selectedCount = this.selectedItems.size;
    const projectName = this.projects.find(p => p.id === this.selectedProjectId)?.task_name || 'Selected Project';

    this.sweetAlert.confirmAssignment(
      `Are you sure you want to assign ${selectedCount} CV(s) to "${projectName}"?`
    ).then((result: any) => {
      if (result.isConfirmed) {
        this.assignCvsToProject();
      }
    });
  }

  private assignCvsToProject(): void {
    const session = this.authService.currentUserValue;
    const payload = {
      event: 'asgncv',
      mode: 'acvtask',
      InputData: [{
        artId: Array.from(this.selectedItems),
        assignTsk: this.selectedProjectId,
        chrType: '1',
        sessionUser: session?.userId || '1'
      }]
    };

    this.loadingService.show('Assigning CVs to project...');
    this.jobseekerService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'CVs assigned successfully.', 'success');
          this.selectedItems.clear();
          this.selectedProjectId = '';
          this.listJobseekers();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to assign CVs.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to assign CVs. Please try again.');
      }
    });
  }

  /**
   * Ensures floating labels float if field has a value, even after DOM changes.
   */
  updateFloatingLabels(): void {
    setTimeout(() => {
      const inputs = document.querySelectorAll('.input-group input, .input-group select');
      inputs.forEach((input: Element) => {
        const element = input as HTMLInputElement | HTMLSelectElement;
        const isAlwaysActiveMultiSelect = (element as any).dataset && (element as any).dataset.alwaysActive === 'true';
        if (this.ALWAYS_ACTIVE_IDS.has(element.id) || isAlwaysActiveMultiSelect) {
          element.classList.add('active');
          return;
        }
        if ((element.value && element.value.length > 0) || (element instanceof HTMLSelectElement && element.selectedIndex > 0)) {
          element.classList.add('active');
        } else {
          element.classList.remove('active');
        }
      });
    }, 120);
  }
}
