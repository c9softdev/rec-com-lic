import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { SelectionProcess } from '../selection-process';
import { CommonService } from '../../../core/services/common.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';

declare var bootstrap: any;

@Component({
  selector: 'app-interview-manager-modal',
  standalone: true,
  // ✅ FIX: include both CommonModule and ReactiveFormsModule
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './interview-manager-modal.html',
  styleUrls: ['./interview-manager-modal.scss']
})

export class InterviewManagerModal {
  isMaximized = false;
  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }
  @ViewChild('managerModal') modal!: ElementRef;
  @Input() jobseekerId = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId = '';
  @Input() projectId = '';
  @Input() userType = '';
  @Input() userId = '';
  @Input() intrvManagerArr: any[] = [];
  @Input() parentComponent!: SelectionProcess;

  openAllRemarks(jobseekerId: any, candidateId: any, projectId: any) {
    this.parentComponent.openAllRemarks(jobseekerId, candidateId, projectId);
  }

  managerForm!: FormGroup;
  private modalInstance: any;
  submitted = false;
  showOfferFields = false;
  selectedFile: File | null = null;

  // private modalInstance: any; 

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private authService: AuthService,
    private loadingService: LoadingService,
  ) { }

  ngOnInit(): void {
    // Any initialization logic can go here
    this.managerForm = this.fb.group({
      interviewStatus: ['', Validators.required],
      description: [''],
      offerLetter: [''],
      offerFile: [null]
    });

  }

  uploadOfferLetter(projectId: any, candidateId: any): void {
    if (!this.selectedFile) {
      this.sweetAlert.showError('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('event', 'astsk');
    formData.append('mode', 'ofrSv');
    formData.append('prjId', projectId);
    formData.append('id', candidateId);
    formData.append('offerLetter', this.selectedFile); // ✅ must match PHP key

    this.loadingService.show('Uploading file...');

    this.commonService.postWithFiles(formData).subscribe({
      next: (response: any) => {
        this.loadingService.hide();

        // ✅ Defensive check in case API returns string instead of JSON
        if (typeof response === 'string') {
          try { response = JSON.parse(response); } catch { }
        }

        if (response?.status === 'success') {
          this.sweetAlert.showToast(response.message || 'File uploaded successfully', 'success');
          this.selectedFile = null;
          this.managerForm.patchValue({ offerFile: null });
        } else {
          this.sweetAlert.showError(response?.message || 'File upload failed.');
        }
      },
      error: (err) => {
        this.loadingService.hide();
        console.error('Upload error:', err);
        this.sweetAlert.showError('Something went wrong while uploading.');
      }
    });

  }

  open() {
    this.submitted = false;
    this.managerForm.reset();
    this.modalInstance = new bootstrap.Modal(this.modal.nativeElement);
    this.modalInstance.show();
  }

  close() {
    this.submitted = false;
    this.managerForm.reset();
    this.modalInstance?.hide();
  }

  submitForm() {

    this.submitted = true;
    if (this.managerForm.invalid) return;
    const formData = this.managerForm.value;

    const session = this.authService.currentUserValue;
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    this.loadingService.show('Loading...');
    const payload = {
      event: 'astsk',
      mode: 'rsvIntv',
      InputData: [
        {
          sprojrct: this.projectId,
          candidateId: this.candidateId,
          userId: this.userId,
          userType: this.userType,
          remarks: formData.interviewStatus,
          intvStatus: formData.interviewStatus,
          offerLetter: formData.offerLetter, // ✅ added
          remarkTxt: formData.description || ''
        }
      ]
    };
    console.log("Payload", payload);

    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        // console.log("Response", res); return;
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Interview manager data submitted.', 'success');
          this.managerForm.reset();
          this.parentComponent.loadAllDropdownData?.();
          this.parentComponent.loadAllSelectionCV?.();
          this.close();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to submit.');
        }
      },
      error: () => this.sweetAlert.showError('Error submitting form. Please try again.')
    });

    this.close();
  }

  onInterviewResultChange(event: any): void {
    const selectedValue = event.target.value;
    const selectedText = this.intrvManagerArr.find((x: any) => x.id == selectedValue)?.name?.toLowerCase();

    // If Interview result is "Passed"
    if (selectedText === 'passed') {
      this.showOfferFields = true;

      // Make Offer Letter radio required
      this.managerForm.get('offerLetter')?.setValidators([Validators.required]);
    } else {
      this.showOfferFields = false;

      // Clear and remove validators
      this.managerForm.patchValue({ offerLetter: '', offerFile: null });
      this.managerForm.get('offerLetter')?.clearValidators();
    }

    // Recalculate validation state
    this.managerForm.get('offerLetter')?.updateValueAndValidity();
  }

  // Handle file selection
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.managerForm.patchValue({ offerFile: file });
    }
  }
  isInvalid(controlName: string): boolean {
    const control = this.managerForm.get(controlName);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  getValidationMessage(controlName: string): string {
    const control = this.managerForm.get(controlName);
    if (!control?.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['maxlength']) return `Max ${control.errors['maxlength'].requiredLength} chars`;
    return 'Invalid value';
  }

}
