import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { projectStatusType } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-project-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './project-manager.component.html',
  styleUrl: './project-manager.component.scss',
  
})
export class ProjectManagerComponent implements OnInit {
  readonly Number = Number;
  showSearchSection = true;
  addRecdFlg = false;
  addSecRecFlg = false;
  listRecdFlg = true;
  isEditMode = false;
  editId: string | null = null;
  projectId: string | null = null;
  submitted = false;
  currentPage = paginationProperties.currentPage;
  pageSize = paginationProperties.pageSize;
  totalPages = paginationProperties.totalPages;
  paginationRange = paginationProperties.paginationRange;
  jumpToPage = paginationProperties.jumpToPage;
  totalRecords = paginationProperties.totalRecords;
  noDataMessage = '';
  taskName = '';
  selectedItems: Set<string> = new Set();
  projects: any[] = [];
  projectStatusTypes = projectStatusType;
  cities: any[] = [];
  States: any[] = [];

  searchForm: FormGroup;
  projectForm: FormGroup;
  projectDtlForm: FormGroup;
  clientArr: any[] = [];
  projectStatus = [];

  comp_id: any;
  superAdminID: any;

  userId: any;
  userType: any;
  emailId: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;
  selectionId: string | undefined;
  additionalInterviewDates: { value: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private sessionService: SessionService

  ) {
    this.searchForm = this.fb.group({
      projectName: [''],
      sclient_name: [''],
      STask_status: [''],
      takeywrd: ['']
    });
    this.projectDtlForm = this.fb.group({
      state: ['', Validators.required],
      currLocCity: [''],
      intvDate: [''],
      interviewVenu: ['', Validators.required],
      intvTime: [''],
      cont_person: [''],
      cintactNo: [''],
      splCat: [''],
      projectId: [''],
      remarks: ['']
    });

    this.projectForm = this.fb.group({
      task_name: ['', Validators.required],
      task_status: ['', Validators.required],
      sessionUser: [''],
      cintactNo: [''],
      intvTime: [''],
      cont_person: [''],
      IdNo: [''],
      client_name: [''],
      hod: [''],
      requirment: [''],
      publishOnline: [false],
      publishtask: [false]
    });
  }

  ngOnInit(): void {
    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';
    // console.log('Session :', sess);

    this.listProjects();
    this.clientList();
  }

  clientList(): void {
    this.selectionId = this.route.snapshot.data['selectionId'];
    console.log('Selection ID from route data:', this.selectionId);

    const session = this.authService.currentUserValue;
    // console.log
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    this.commonService.loadClientList().subscribe({
      next: (res) => {
        if (res && res.data && res.data.list) {
          this.clientArr = res.data.list;
          this.noDataMessage = '';
        } else {
          this.clientArr = [];
          this.noDataMessage = res?.message || 'No data found.';
        }
      },
      error: () => {
        this.clientArr = [];
        this.sweetAlert.showError('Failed to load clients. Please try again.');
      }
    });
  }

  listProjects(): void {

    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';
    
    this.loadingService.show('Loading...');
    const payload = {
      event: 'task',
      mode: 'lr',
      InputData: [{
        takeywrd: this.searchForm.controls['takeywrd'].value || '',
        STask_status: this.searchForm.controls['STask_status'].value || '',
        sclient_name: this.searchForm.controls['sclient_name'].value || '',
        page: this.currentPage.toString(),
        userType: '',
        sortto: '',
        sortby: 'DESC'
      }]
    };
    console.log("Input", payload);
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res?.data?.list) {
          this.projects = res.data.list;
          this.totalRecords = res.data.total_records || this.projects.length;
          this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = res?.message || 'No data found.';
          this.projects = [];
          this.totalRecords = 0;
          this.totalPages = 0;
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load projects. Please try again.');
        this.projects = [];
        this.totalRecords = 0;
        this.totalPages = 0;
      }
    });
  }

  applySelection(field: string, value: any): void  
  {
    //selection-process
    const queryParams: any = {};
    queryParams[field] = value;
    queryParams['page'] = 1;
    queryParams['pageSize'] = paginationProperties.pageSize;
    this.router.navigate(['/selection-process'], { queryParams });
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
  
  loadCityOnState(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.checkInput(select);
    this.cityListOnState(event);
  }


  cityListOnState(eventOrStateId: Event | string): void {
    let selectedId: string;
    if (typeof eventOrStateId === 'string') {
      selectedId = eventOrStateId;
      this.projectDtlForm.controls['state'].setValue(selectedId);
      this.projectDtlForm.controls['currLocCity'].setValue('');
    } else {
      const selectElm = eventOrStateId.target as HTMLSelectElement;
      selectedId = selectElm.value;
      this.checkInput(selectElm);
      this.projectDtlForm.controls['state'].setValue(selectedId);
      this.projectDtlForm.controls['currLocCity'].setValue('');
    }
    this.cities = [];
    if (selectedId) {
      const payload = {
        event: 'city',
        mode: 'lc',
        InputData: [
          { stateName: selectedId }
        ]
      };
      this.commonService.post(payload).subscribe({
        next: (response) => {
          if (response && response.status === 'success' && response.data) {
            this.cities = response.data.list;
          } else {
            this.sweetAlert.showError((response?.message) || 'Failed to fetch sub categories.');
          }
        },
        error: () => {
          this.sweetAlert.showError('Failed to fetch sub categories. Please try again.');
        }
      });
    }
  }

  loadStates(): void {
    this.commonService.loadStates().subscribe({
      next: (states) => {
        this.States = states;
      },
      error: (error) => {
        this.sweetAlert.showError(error?.message || 'Failed to fetch States List.');
      }
    });
  }

  onSearch(): void {
    if (!this.searchForm.controls['takeywrd'].value && !this.searchForm.controls['sclient_name'].value && !this.searchForm.controls['STask_status'].value) {
      this.sweetAlert.showToast('Please enter/select atleast one search criteria', 'warning');
    }
    this.currentPage = 1;
    this.listProjects();
  }

  onClearSearch(): void {
    this.searchForm.reset({ projectName: '' });
    this.listProjects();
    this.updateFloatingLabels();
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.addSecRecFlg = false;
    this.isEditMode = false;
    this.editId = null;
  }

  onShowAddForm2(item: any): void {
    this.listRecdFlg = false;
    this.addRecdFlg = false;
    this.addSecRecFlg = true;
    this.isEditMode = false;
    this.projectId = item.id;
    this.loadStates();            // Load States for the project
    this.projectDtlForm.reset();  // Clear Task Details form

    const payload = {
      event: 'task',
      mode: 'tskDtls',
      InputData: [
        {
          prjId: item.id
        }
      ]

    };
    // console.log('Edit Response:', payload);
    // return;
    this.commonService.post(payload).subscribe({
      next: (res) => {
        if (res && res.status === 'success' && res.data) {
          this.taskName = res.data.recDetl.project;

        } else {
          this.sweetAlert.showError(res?.message || 'Failed to fetch record for editing.');
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to fetch record for editing.');
      }
    });
    // console.log('Selected Project ID:', this.projectId);
  }

  onCancelClick(): void {
    this.submitted = false;
    this.isEditMode = false;
    this.editId = null;
    this.addRecdFlg = false;
    this.addSecRecFlg = false;
    this.listRecdFlg = true;
    this.additionalInterviewDates = [];
    this.updateFloatingLabels();
  }

  onClearClick(): void {
    this.submitted = false;
    this.projectForm.reset();
  }

  onClearClick2(): void {
    this.submitted = false;
    this.projectDtlForm.reset();
    this.additionalInterviewDates = [];
  }

  onSaveNewRecord(): void {

    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    this.submitted = true;
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'task',
      mode: 'sv',
      InputData: [{
        task_name: this.projectForm.controls['task_name'].value,
        task_status: this.projectForm.controls['task_status'].value,
        chrType: this.userType,
        sessionUser: this.userId,
        cintactNo: this.projectForm.controls['cintactNo'].value,
        intvTime: this.projectForm.controls['intvTime'].value,
        cont_person: this.projectForm.controls['cont_person'].value,
        IdNo: this.projectForm.controls['IdNo'].value,
        client_name: this.projectForm.controls['client_name'].value,
        requirment: this.projectForm.controls['requirment'].value,
        hod: this.projectForm.controls['hod'].value,
        publishOnline: this.projectForm.controls['publishOnline'].value ? '1' : '0',
        publishtask: this.projectForm.controls['publishtask'].value ? '1' : '0'
      }]
    };
    this.loadingService.show();
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Project saved.', 'success');
          this.onCancelClick();
          this.listProjects();
        } else {
          this.sweetAlert.showError(res.message || 'Failed to save project.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to save project. Please try again.');
      }
    });
  }

  onSaveNewRecord2(): void {
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    this.submitted = true;
    if (this.projectDtlForm.invalid) {
      this.projectDtlForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    
    // Validate interview dates
    const allDates = this.getAllInterviewDates();
    if (!allDates || allDates.trim() === '') {
      this.sweetAlert.showToast('Please provide at least one interview date.', 'warning');
      return;
    }
    const payload = {
      event: 'task',
      mode: 'svd',
      InputData: [{
        prjId: this.projectId,
        state: this.projectDtlForm.controls['state'].value,
        currLocCity: this.projectDtlForm.controls['currLocCity'].value,
        chrType: this.userType,
        sessionUser: this.userId,
        interviewVenu: this.projectDtlForm.controls['interviewVenu'].value,
        splCat: this.projectDtlForm.controls['splCat'].value,
        cintactNo: this.projectDtlForm.controls['cintactNo'].value,
        intvDate: this.getAllInterviewDates(),
        intvTime: this.projectDtlForm.controls['intvTime'].value,
        remarks: this.projectDtlForm.controls['remarks'].value,
        cont_person: this.projectDtlForm.controls['cont_person'].value,
        publish: '1'
      }]
    };
    // console.log('Payload for saving new record:', payload);

    this.commonService.post(payload).subscribe({
      next: (res) => {
        console.log('Payload for saving new record:', res);
        if (res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Project Details saved.', 'success');
          this.onCancelClick();
          this.listProjects();
          this.projectForm.reset();
        } else {
          this.sweetAlert.showError(res.message || 'Failed to save Project Details.');
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to save Project Details. Please try again.');
      }
    });
  }

  onEditClick(item: any): void {
    const payload = {
      event: 'task',
      mode: 'eta',
      InputData: [{
        id: item.id,
        takeywrd: this.searchForm.controls['takeywrd'].value,
        STask_status: this.searchForm.controls['STask_status'].value,
        sclient_name: this.searchForm.controls['sclient_name'].value,
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        // console.log('Edit Response:', res);
        if (res && res.status === 'success' && res.data) {
          this.isEditMode = true;
          this.editId = res.data.id;
          this.addRecdFlg = true;
          this.addSecRecFlg = false;
          this.listRecdFlg = false;
          this.projectForm.patchValue({
            task_name: res.data.list.var_task_name || '',
            task_status: res.data.list.chr_task_stau || '',
            cintactNo: res.data.list.var_contact_no || '',
            intvTime: res.data.list.var_intv_time || '',
            cont_person: res.data.list.var_cont_perso || '',
            IdNo: res.data.list.var_id_number || '',
            client_name: res.data.list.int_client_id || '',
            requirment: res.data.list.var_requirment || '',
            hod: res.data.list.var_hod || '',
            publishOnline: res.data.list.chr_online_status === '1',
            publishtask: res.data.list.chr_tas_pub === '1'
          });
          this.updateFloatingLabels();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to fetch record for editing.');
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to fetch record for editing.');
      }
    });
  }

  onEditClick2(editId: any, projectId: any): void {
    const payload = {
      event: 'task',
      mode: 'tskDtls',
      InputData: [
        {
          id: editId,
          prjId: projectId
        }
      ]

    };
    console.log('Edit Response:', payload);
    // return;
    this.commonService.post(payload).subscribe({
      next: (res) => {
        console.log('Edit Response:', res);
        if (res && res.status === 'success' && res.data) {
          this.loadStates();
          this.cityListOnState(res.data.taskDetails.int_state);

          this.isEditMode = true;
          this.editId = res.data.id;
          this.addRecdFlg = false;
          this.addSecRecFlg = true;
          this.listRecdFlg = false;
          this.taskName = res.data.recDetl.project;
          this.projectDtlForm.patchValue({
            id: res.data.id,
            prjId: res.data.prjId,
            state: res.data.taskDetails.int_state || '',
            currLocCity: res.data.taskDetails.int_city || '',
            interviewVenu: res.data.taskDetails.var_intv_venue || '',
            splCat: res.data.taskDetails.txt_splCat || '',
            cintactNo: res.data.taskDetails.var_par_cat || '',
            intvDate: res.data.taskDetails.dtm_intv_date || '',
            intvTime: res.data.taskDetails.var_intv_time || '',
            remarks: res.data.taskDetails.var_intv_time || '',
            cont_person: res.data.taskDetails.var_cont_perso || ''

          });

          // Populate interview dates from comma-separated string
          this.populateInterviewDatesFromString(res.data.taskDetails.dtm_intv_date || '');

          // this.updateFloatingLabels();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to fetch record for editing.');
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to fetch record for editing.');
      }
    });
  }


  onUpdateRecord(): void {
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    this.submitted = true;
    if (!this.isEditMode || !this.editId) return;
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'task',
      mode: 'ut',
      InputData: [{
        id: this.editId,
        task_id: this.editId,
        takeywrd: this.searchForm.controls['takeywrd'].value,            // Search keyword
        STask_status: this.searchForm.controls['STask_status'].value,    // Search keyword
        sclient_name: this.searchForm.controls['sclient_name'].value,    // Search keyword

        task_name: this.projectForm.controls['task_name'].value,
        task_status: this.projectForm.controls['task_status'].value,
        chrType: this.userType,
        sessionUser: this.userId,
        cintactNo: this.projectForm.controls['cintactNo'].value,
        intvTime: this.projectForm.controls['intvTime'].value,
        cont_person: this.projectForm.controls['cont_person'].value,
        IdNo: this.projectForm.controls['IdNo'].value,
        client_name: this.projectForm.controls['client_name'].value,
        requirment: this.projectForm.controls['requirment'].value,
        hod: this.projectForm.controls['hod'].value,
        publishOnline: this.projectForm.controls['publishOnline'].value ? '1' : '0',
        publishtask: this.projectForm.controls['publishtask'].value ? '1' : '0',
        page: this.currentPage.toString()
      }]
    };
    // console.log('Response:', payload);
    this.commonService.post(payload).subscribe({
      next: (res) => {

        console.log('Response:', res);
        this.loadingService.hide();
        if (res && res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Project updated.', 'success');
          this.isEditMode = false;
          this.editId = null;
          this.addRecdFlg = false;
          this.addSecRecFlg = false;
          this.listRecdFlg = true;
          this.projectForm.reset({ projectName: '', projectDesc: '', status: false });
          this.listProjects();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to update record.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to update record. Please try again.');
      }
    });
    this.loadingService.show('Updating...');
  }

  onUpdateRecord2(): void {
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    this.submitted = true;
    if (!this.isEditMode || !this.editId) return;
    if (this.projectDtlForm.invalid) {
      this.projectDtlForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    
    // Validate interview dates
    const allDates = this.getAllInterviewDates();
    if (!allDates || allDates.trim() === '') {
      this.sweetAlert.showToast('Please provide at least one interview date.', 'warning');
      return;
    }
    const payload = {
      event: 'task',
      mode: 'utde',
      InputData: [{
        id: this.editId,

        state: this.projectDtlForm.controls['state'].value,
        currLocCity: this.projectDtlForm.controls['currLocCity'].value,
        chrType: this.userType,
        sessionUser: this.userId,
        interviewVenu: this.projectDtlForm.controls['interviewVenu'].value,
        splCat: this.projectDtlForm.controls['splCat'].value,
        cintactNo: this.projectDtlForm.controls['cintactNo'].value,
        intvDate: this.getAllInterviewDates(),
        intvTime: this.projectDtlForm.controls['intvTime'].value,
        remarks: this.projectDtlForm.controls['remarks'].value,
        cont_person: this.projectDtlForm.controls['cont_person'].value
      }]
    };
    // console.log('Response:', payload);
    this.commonService.post(payload).subscribe({
      next: (res) => {
        // console.log('Response:', res);
        this.loadingService.hide();
        if (res && res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Project Details updated.', 'success');
          this.isEditMode = false;
          this.editId = null;
          this.addRecdFlg = false;
          this.addSecRecFlg = false;
          this.listRecdFlg = true;
          this.projectDtlForm.reset();
          this.listProjects();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to update record.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to update record. Please try again.');
      }
    });
    this.loadingService.show('Updating...');
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to delete', 'warning');
      return;
    }
    const payload = {
      event: 'task',
      mode: 'delta',
      InputData: [{
        userId: Array.from(this.selectedItems),
        takeywrd: this.searchForm.controls['takeywrd'].value,
        STask_status: this.searchForm.controls['STask_status'].value,
        sclient_name: this.searchForm.controls['sclient_name'].value,
        page: this.currentPage.toString()
      }]
    };
    // console.log('Response:', payload);
    this.sweetAlert.confirmDelete('Are you sure you want to delete the selected projects?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (res) => {
            // console.log('Response:', res);
            if (res.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Projects deleted.', 'success');
              this.selectedItems.clear();
              this.listProjects();
            } else {
              this.sweetAlert.showError(res.message || 'Failed to delete records');
            }
          },
          error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to delete projects. Please try again.');
          }
        });
      this.loadingService.show('Deleting...');
      }
    });
  }

  onDeleteClick2(editId: any): void {
    const payload = {
      event: 'task',
      mode: 'dtsk',
      InputData: [{
        id: editId
      }]
    };
    // console.log('Response:', payload);
    this.sweetAlert.confirmDelete('Are you sure you want to delete the selected Details?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (res) => {
            // console.log('Response:', res);
            if (res.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Project Details deleted.', 'success');
              this.editId = '';
              this.isEditMode = false;
              this.listProjects();
            } else {
              this.sweetAlert.showError(res.message || 'Failed to delete records');
            }
          },
          error: () => {
            this.sweetAlert.showError('Failed to delete projects. Please try again.');
          }
        });
      }
    });
  }

  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.projects.forEach(item => this.selectedItems.add(item.id)) : this.selectedItems.clear();
  }

  onItemSelect(itemId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.selectedItems.add(itemId) : this.selectedItems.delete(itemId);
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
      this.listProjects();
    }
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

  updateFloatingLabels(): void {
    setTimeout(() => {
      const inputs = document.querySelectorAll('.input-group input, .input-group select');
      inputs.forEach((input: Element) => {
        const element = input as HTMLInputElement | HTMLSelectElement;
        if (element.value && element.value.length > 0) {
          element.classList.add('active');
        } else {
          element.classList.remove('active');
        }
      });
    }, 100);
  }

  addInterviewDate(): void {
    this.additionalInterviewDates.push({ value: '' });
  }

  removeInterviewDate(index: number): void {
    this.additionalInterviewDates.splice(index, 1);
  }

  getAllInterviewDates(): string {
    const mainDate = this.projectDtlForm.get('intvDate')?.value || '';
    const additionalDates = this.additionalInterviewDates
      .map(date => date.value)
      .filter(date => date && date.trim() !== '');
    
    const allDates = [mainDate, ...additionalDates].filter(date => date && date.trim() !== '');
    return allDates.join(',');
  }

  populateInterviewDatesFromString(dateString: string): void {
    if (!dateString || dateString.trim() === '') {
      this.additionalInterviewDates = [];
      return;
    }
    
    const dates = dateString.split(',').map(date => date.trim()).filter(date => date !== '');
    if (dates.length > 0) {
      // Set the first date as the main interview date
      this.projectDtlForm.get('intvDate')?.setValue(dates[0]);
      
      // Set remaining dates as additional dates
      this.additionalInterviewDates = dates.slice(1).map(date => ({ value: date }));
    }
  }
}

