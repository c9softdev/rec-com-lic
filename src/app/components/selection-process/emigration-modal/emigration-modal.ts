import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../../core/services/common.service';
import { LoadingService } from '../../../core/services/loading.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { SelectionProcess } from '../selection-process';
import { DownloadService } from '../../../core/services/download.service';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/services/session.service';

declare var bootstrap: any;

@Component({
  selector: 'app-emigration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './emigration-modal.html',
  styleUrls: ['./emigration-modal.scss']
})
export class EmigrationModal {

  isMaximized = false;

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  @ViewChild('emigrationModal') modal!: ElementRef;

  @Input() jobseekerId: string = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId: string = '';
  @Input() projectId: string = '';
  @Input() userType: string = '';
  @Input() userId: string = '';
  @Input() parentComponent!: SelectionProcess;

  uploadedFileName = '';
  selectedDocFile: File | null = null;
  emigrationForm!: FormGroup;
  hasEmigrationDocument = false;
  private modalInstance: any;
  comp_id: any;
  superAdminID: any;

  private resetFileSelection() {
    this.selectedDocFile = null;
    this.uploadedFileName = '';
  }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private sweetAlert: SweetAlertService,
    private downloadService: DownloadService,
    private sessionService: SessionService
  ) { }

  ngOnInit() {
    this.superAdminID = environment.superAdminID;
        const sess = this.sessionService.getSession();
        this.comp_id = sess?.comp_id || '';

    this.initForm();
  }

  private initForm() {
    this.emigrationForm = this.fb.group({
      econtract: [''],
      emigration: [''],
      emgRemark: ['']
    });
  }

  private loadEmigrationData() {
    if (!this.candidateId || !this.projectId) {
      this.sweetAlert.showError('Missing required IDs');
      return;
    }

    const payload = {
      event: 'astsk',
      mode: 'usrd',
      InputData: [
        { prjid: this.projectId, id: this.candidateId }
      ]
    };

    this.loadingService.show('Loading...');
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success' && res?.data?.emigrationArr) {
          const data = res.data.emigrationArr;
          this.hasEmigrationDocument = !!data?.doc_status;
          this.emigrationForm.patchValue({
            econtract: data?.econtact_status || '',
            emigration: data?.emigration_status || '',
            emgRemark: data?.emgRemark || ''
          });
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to load emigration details.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to load emigration data.');
      }
    });
  }

  open() {
    this.modalInstance = new bootstrap.Modal(this.modal.nativeElement);
    this.modalInstance.show();
    this.loadEmigrationData();
  }

  close() {
    this.modalInstance?.hide();
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedDocFile = event.target.files[0];
      this.uploadedFileName = this.selectedDocFile?.name || '';
    }
  }

  downloadFile() {
    const payload = {
      event: 'astsk',
      mode: 'dvisadoc',
      InputData: [
        { id: this.candidateId, prjId: this.projectId }
      ]
    };
    this.downloadService.downloadFileFromApi(this.commonService.postDownload(payload, true), `Emigration_${this.projectId}_${this.candidateId}`);
  }

  uploadDocument() {
    if (!this.selectedDocFile) {
      this.sweetAlert.showError('Please select a file to upload.');
      return;
    }
    if (!this.candidateId || !this.projectId) {
      this.sweetAlert.showError('Missing required information.');
      return;
    }

    const formData = new FormData();
    formData.append('event', 'astsk');
    formData.append('mode', 'svdc');
    formData.append('id', this.candidateId);
    formData.append('prjId', this.projectId);
    formData.append('doc_file', this.selectedDocFile);

    this.loadingService.show('Uploading...');
    this.commonService.postWithFiles(formData).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res?.message || 'File uploaded successfully.', 'success');
          this.resetFileSelection();
          this.hasEmigrationDocument = true;
          this.loadEmigrationData();
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

  submitEmigration() {
    if (!this.candidateId || !this.projectId) {
      this.sweetAlert.showError('Missing required information.');
      return;
    }

    const formValue = this.emigrationForm.value;
    const payload = {
      event: 'astsk',
      mode: 'svem',
      InputData: [
        {
          id: this.candidateId,
          prjId: this.projectId,
          userType: this.userType || '',
          userId: this.userId || '',
          emigration: formValue.emigration || '',
          econtract: formValue.econtract || '',
          emgRemark: formValue.emgRemark || ''
        }
      ]
    };

    this.loadingService.show('Saving...');
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res?.message || 'Information saved successfully.', 'success');
          if (this.parentComponent?.refreshData) {
            this.parentComponent.refreshData();
          }
          this.close();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to save emigration information.');
      }
    });
  }

}
