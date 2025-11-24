import { Component, Input, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { SelectionProcess } from '../selection-process';
import { CommonService } from '../../../core/services/common.service';
import { SelectionService } from '../selection-process.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';

declare var bootstrap: any;

@Component({
  selector: 'app-visa-process-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './visa-process-modal.html',
  styleUrls: ['./visa-process-modal.scss']
})



export class VisaProcessModal {
  isMaximized = false;
  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }
  @ViewChild('visaProcessModal') modal!: any;
  @Input() jobseekerId = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId = '';
  @Input() projectId = '';
  @Input() userType = '';
  @Input() userId = '';
  @Input() parentComponent!: SelectionProcess;

  hasVisaDocument = false;

  selectedVisaFile: File | null = null;
  visaForm!: FormGroup;
  private modalInstance: any;
  submitted = false;
  medicalArr: Array<{ id: string; name: string }> = [];

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private authService: AuthService,
    private selectionService: SelectionService,
    private loadingService: LoadingService,
  ) { }

  ngOnInit() {
    this.visaForm = this.fb.group({
      mofaNo: ['', []],
      visaStampedDate: ['', []],
      medicalStatus: ['', Validators.required],
      medicalDate: ['', []],
      medRemark: ['']
    });
  }

  loadVisaDetails() {
    if (!this.candidateId || !this.projectId) {
      this.sweetAlert.showError('Missing required IDs');
      return;
    }

    const payload = {
      event: 'astsk',
      mode: 'usrd',
      InputData: [
        {
          prjid: this.projectId,
          id: this.candidateId
        }
      ]
    };

    this.loadingService.show('Loading details...');
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success' && res.data) {
          // Show download icon only if document exists
          this.hasVisaDocument = res.data.visaArr?.doc_status ? true : false;

          // Update form with visa details
          this.visaForm.patchValue({
            mofaNo: res.data.visaArr?.mofaNa || '',
            visaStampedDate: res.data.visaArr?.date_vstamp || '',
            medicalStatus: res.data.visaArr?.int_med || '',
            medicalDate: res.data.visaArr?.date_med || '',
            medRemark: res.data.visaArr?.txt_med_remark || ''
          });
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to load visa details');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to load visa details');
      }
    });
  }

  open(): void {
    setTimeout(() => {
      const modalEl = document.getElementById('visaProcessModal');
      if (!modalEl) {
        console.error('VisaProcessModal element not found.');
        return;
      }

      const modal = (window as any).bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();

      // Adjust z-index so it appears above other modals
      modalEl.style.zIndex = '1065';
      const backdrops = document.getElementsByClassName('modal-backdrop');
      if (backdrops.length > 0) {
        const lastBackdrop = backdrops[backdrops.length - 1] as HTMLElement;
        lastBackdrop.style.zIndex = '1064';
      }

      // Load dropdowns and visa details
      this.loadDropdowns();
      this.loadVisaDetails();
    }, 100); // small delay ensures DOM ready
  }

  close() {
    const modalEl: any = (window as any).bootstrap.Modal.getInstance(
      document.querySelector('#visaProcessModal')
    );
    modalEl.hide();
  }

  onVisaFileSelected(event: any) {
    if (event?.target?.files && event.target.files.length > 0) {
      this.selectedVisaFile = event.target.files[0];
    }
  }

  uploadVisaDocument() {
    if (!this.selectedVisaFile) {
      this.sweetAlert.showError('Please select a file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('event', 'astsk');
    formData.append('mode', 'visa_sv');
    formData.append('id', this.candidateId || '');
    formData.append('prjId', this.projectId || '');
    formData.append('visa', this.selectedVisaFile);

    this.loadingService.show('Uploading...');
    this.selectionService.uploadFile(formData).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'File uploaded successfully.', 'success');
          this.selectedVisaFile = null;
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to upload file.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong during upload.');
      }
    });
  }

  submitVisaForm() {
    if (this.visaForm.invalid) {
      this.sweetAlert.showError('Please fill all required fields.');
      return;
    }
    const formValue = this.visaForm.value;
    const payload = {
      event: 'astsk',
      mode: 'vsv',
      InputData: [
        {
          user_id: this.candidateId || '',
          prjId: this.projectId || '',
          empId: this.userId || '',
          slctdas: '',
          medi_date: formValue.medicalDate || '',
          medi: formValue.medicalStatus || '',
          Stamped: formValue.visaStampedDate || '',
          medRemark: formValue.medRemark || '',
          mofaNo: formValue.mofaNo || ''
        }
      ]
    };

    this.loadingService.show('Saving...');
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res?.message || 'Information Saved Successfully.', 'success');
          this.close();
          this.parentComponent?.loadAllSelectionCV?.();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save visa details.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to save visa details.');
      }
    });
  }

  downloadVisaFile() {
    const resolvedPrjId = (this.projectId ?? '').toString();
    const resolvedId = ((this.candidateId && this.candidateId !== '') ? this.candidateId : this.jobseekerId ?? '').toString();

    if (!resolvedPrjId || !resolvedId) {
      this.sweetAlert.showError('Missing Project/Candidate Id for download.');
      return;
    }

    const payload = {
      event: 'astsk',
      mode: 'dwn_visa',
      InputData: [
        {
          prjId: resolvedPrjId,
          id: resolvedId
        }
      ]
    };

    this.loadingService.show('Downloading...');
    this.selectionService.postDownload(payload, true).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        const contentType = (res && res.type) || 'application/octet-stream';
        const blob = new Blob([res], { type: contentType as string });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Visa_${this.projectId}_${this.candidateId}`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.sweetAlert.showToast('File downloaded successfully', 'success');
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong while downloading.');
      }
    });
  }

  private loadDropdowns() {
    if (!this.projectId) return;
    const payload = {
      event: 'astsk',
      mode: 'psgs',
      InputData: [
        {
          sprojrct: this.projectId,
          intv: '',
          pass: ''
        }
      ]
    };

    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        if (res?.status === 'success' && res.data) {
          // console.log('Medical Data:', res.data);
          const medical = res.data.medical || {};
          this.medicalArr = Object.entries(medical).map(([id, name]: any) => ({ id, name }));
        } else {
          this.medicalArr = [];
        }
      },
      error: () => {
        this.medicalArr = [];
      }
    });
  }
}
