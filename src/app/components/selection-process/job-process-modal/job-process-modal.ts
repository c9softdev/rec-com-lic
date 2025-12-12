import { Component, ElementRef, Input, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SelectionProcess } from '../selection-process';
import { LoadingService } from '../../../core/services/loading.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonService } from '../../../core/services/common.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/services/session.service';

declare var bootstrap: any;

@Component({
  selector: 'app-job-process-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './job-process-modal.html',
  styleUrls: ['./job-process-modal.scss']
})
export class JobProcessModal {
  @ViewChild('jobProcessModal') modal!: ElementRef;
  @Input() jobseekerId: string = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId: string = '';
  @Input() projectId: string = '';
  @Input() parentComponent!: SelectionProcess;
  
  private modalInstance: any;
  isMaximized: boolean = false;
  currentStatusArr: { id: string; name: string }[] = [];
  visaIssuedArr: { id: string; name: string }[] = [];
  visaSubCityArr: { id: string; name: string }[] = [];
  gradeArr: { id: string; name: string }[] = [];
  processManagerArr: { id: string; name: string }[] = [];
  postingPosition: { id: string; name: string }[] = [];

  // selected model bindings
  processForm!: FormGroup;
  currentForm!: FormGroup;
  selectedCurrentStatus = '';
  selectedVisaStatus = '';
  selectedSubmissionCity = '';
  selectedPosition = '';
  selectedProcessManager = '';

  userId: any;
  userType: any;
  emailId: any;
  comp_id: any;
  superAdminID: any;


  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }
  uploadedFileName: string = '';

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private commonService: CommonService,
    private sessionService: SessionService
  ) { }

  ngOnInit() {
    
    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    this.currentForm = this.fb.group({
      currentStatus: ['', Validators.required],
      currentDate: [''],
      currentRemark: ['']
    });

    // Single form for Visa Info + Posting Details
    this.processForm = this.fb.group({
      // --- Visa Info ---
      visaIssued: ['', Validators.required],
      visaNumber: ['', Validators.required],
      visaDate: [''],
      submissionCity: [''],

      // --- Posting Details ---
      selectedAs: [''],
      placeOfPosting: [''],
      position: [''],
      positionNo: [''],
      grade: ['']
    });
  }

  openAllRemarks(jobseekerId: any, candidateId: any, projectId: any) {
    this.parentComponent.openAllRemarks(jobseekerId, candidateId, projectId);
  }


  open() {
    this.modalInstance = new bootstrap.Modal(this.modal.nativeElement, { backdrop: 'static', keyboard: false });
    this.modalInstance.show();

    // Load dropdowns & API data
    this.loadDropdowns();
    this.loadProcessDetails();
  }

  close() {
    this.modalInstance?.hide();
  }

  SaveProcess(type: number) {
    const formValues = this.processForm.value;
    const session = this.authService.currentUserValue;
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    const payload = {
      event: 'astsk',
      mode: 'saveProMgrVP',
      InputData: [
        {
          id: this.candidateId,
          prjid: this.projectId,
          chrType: this.userType,
          empId: this.userId,
          visaAllotted: '',
          visaNo: '',
          visaSubmition: '',
          visaDate: '',
          slctdas: '',
          placeOfPosting: '',
          position: '',
          positionNo: '',
          grade: ''
        }
      ]
    };

    if (type === 1) {
      if (this.processForm.get('visaIssued')?.invalid || this.processForm.get('visaNumber')?.invalid) {
        this.sweetAlert.showError('Please fill all required Visa fields.');
        this.processForm.markAllAsTouched();
        return;
      }

      payload.InputData[0].visaAllotted = formValues.visaIssued;
      payload.InputData[0].visaNo = formValues.visaNumber;
      payload.InputData[0].visaSubmition = formValues.submissionCity;
      payload.InputData[0].visaDate = formValues.visaDate;
    }

    if (type === 2) {
      if (!formValues.selectedAs || !formValues.placeOfPosting) {
        this.sweetAlert.showError('Selected As and Place of Posting are required.');
        return;
      }

      payload.InputData[0].slctdas = formValues.selectedAs;
      payload.InputData[0].placeOfPosting = formValues.placeOfPosting;
      payload.InputData[0].position = formValues.position;
      payload.InputData[0].positionNo = formValues.positionNo;
      payload.InputData[0].grade = formValues.grade;
    }

    console.log('✅ Final Payload', payload);
  // return;
    // ---- API Call ----
    this.loadingService.show('Saving...');
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast('Saved successfully.');
          this.processForm.reset();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save data.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Error saving data.');
      }
    });
  }



  saveCurrentStatus() {
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    
    // Get form values
    // const status = this.selectedCurrentStatus;
    const status = this.currentForm.get('currentStatus')?.value;
    const date = this.currentForm.get('currentDate')?.value;
    const remark = this.currentForm.get('currentRemark')?.value;

    // Validation
    if (this.currentForm.invalid) {
      this.sweetAlert.showError('Please fill required fields.');
      this.currentForm.markAllAsTouched();
      return;
    }

    // Prepare API payload
    const payload = {
      event: 'astsk',
      mode: 'saveProMgrCS',
      InputData: [
        {
          id: this.candidateId,
          prjid: this.projectId,
          chrType: this.userType,
          empId: this.userId,
          remarks: status,
          remarkTxt: remark,
          currentSt_date: date
        }
      ]
    };
    // console.log('SaveCurrentStatus payload', payload);
    // return;
    // Show loader
    this.loadingService.show('Saving Current Status...');

    // Call API
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          console.log('SaveCurrentStatus success', res);
          this.sweetAlert.showToast('Current Status saved successfully.');
          this.currentForm.patchValue({
            currentStatus: '',
            currentDate: '',
            currentRemark: ''
          });
          this.selectedCurrentStatus = '';
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save Current Status.');
        }
      },
      error: (err) => {
        this.loadingService.hide();
        console.error('SaveCurrentStatus error', err);
        this.sweetAlert.showError('Error saving Current Status.');
      }
    });
  }

  // ========== API CALL to Get Process Details ==========
  loadProcessDetails() {
    if (!this.candidateId || !this.projectId) return;

    const payload = {
      event: 'astsk',
      mode: 'spgs',
      InputData: [
        {
          id: this.candidateId,
          prjid: this.projectId
        }
      ]
    };
    console.log('LoadProcessDetails payload', payload);
    // return;
    this.loadingService.show('Loading Job Process...');
      this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        
          // return;
        if (res?.status === 'success' && res?.data) {
          const detail = res.data.procesDetail ?? {}; // correct spelling

          console.log('Process Detail from API:', detail);
          // ✅ Map API -> Form field names safely
          this.processForm.patchValue({
            visaIssued: detail.visa || '',
            visaNumber: detail.visaNo || '',
            visaDate: detail.visaDate || '',
            submissionCity: detail.visaSubmition || '',
            selectedAs: detail.selected_as || '',
            placeOfPosting: detail.place_pos || '',
            position: detail.posting || '',
            positionNo: detail.pos_no || '',
            grade: detail.grade || ''
          });

          // console.log('✅ Process Details Loaded:', detail);
        } else {
          this.sweetAlert.showError(res?.message || 'No process data found.');
          console.warn('⚠️ Invalid or empty process data:', res);
        }
      },
      error: (err) => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to load job process details.');
        console.error('❌ API Error (Process Details):', err);
      }
    });
  }

  // ========== Load dropdowns (Current Status, etc.) ==========
  private loadDropdowns() {
    if (!this.projectId) return;

    const payload = {
      event: 'astsk',
      mode: 'psgs',
      InputData: [
        {
          sprojrct: this.projectId,
          intv: '1',
          pass: '2'
        }
      ]
    };

    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        if (res?.status === 'success' && res.data) {
          const data = res.data;

          // Convert object key/value pairs to arrays usable in templates
          this.currentStatusArr = this.objectToArray(data.currentStatus);
          this.visaIssuedArr = this.objectToArray(data.visaIssuedArr);
          this.visaSubCityArr = this.objectToArray(data.visaSubCity);
          this.gradeArr = this.objectToArray(data.grade);
          this.processManagerArr = this.objectToArray(data.processManager);
          this.postingPosition = this.objectToArray(data.postingPosition);

          // console.log('Dropdowns loaded:', {
          //   currentStatus: this.currentStatusArr,
          //   visaIssued: this.visaIssuedArr,
          //   visaSubCity: this.visaSubCityArr,
          //   processManager: this.processManagerArr
          // });
        }
      },
      error: (err) => console.error('Dropdown load failed', err)
    });
}

// Helper function
  private objectToArray(obj: Record<string, any>): any[] {
    return Object.entries(obj || {}).map(([id, name]) => ({ id, name }));
  }

  // File Upload Handler
  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFileName = file.name;
    }
  }

  // Download file handler
  downloadFile() {
    // logic to download file
    alert('Download file: ' + this.uploadedFileName);
  }

  // Open Degree Upload Popup (another modal)
  openDegreeUploadPopup() {
    alert('Open Degree Upload Popup');
  }
}
