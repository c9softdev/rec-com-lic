import { Component, Input, ViewChild, ElementRef, viewChild, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { SelectionProcess } from '../selection-process';
import { CommonService } from '../../../core/services/common.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/services/session.service';

declare var bootstrap: any;

@Component({
  selector: 'app-interview-scheduler-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './interview-scheduler-modal.html',
  styleUrls: ['./interview-scheduler-modal.scss']
})
export class InterviewSchedulerModal {
  isMaximized = false;
  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  @ViewChild('schedulerModal') modal!: ElementRef;
  @Input() jobseekerId: string = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId: string = '';
  @Input() projectId: string = '';
  @Input() userType: string = '';
  @Input() userId: string = '';
  @Input() intrvSchedulArr: any[] = [];
  @Input() intvCityArr: any[] = [];
  @Input() parentComponent!: SelectionProcess;
  
  schedulerForm!: FormGroup;
  private modalInstance: any; 
  submitted = false;
  comp_id: any;
  superAdminID: any;

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private sessionService: SessionService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Any initialization logic can go here

    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';
   
  }

  private initializeForm(): void {
    this.schedulerForm = this.fb.group({
      interviewCity: ['', [Validators.required]],
      remark: ['', [Validators.required]],
      interviewDate: [''],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  // Custom validator for future dates only
  private futureDateValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison
    
    if (selectedDate < today) {
      return { pastDate: true };
    }
    
    return null;
  }

  open() {
    this.submitted = false;
    this.schedulerForm.reset();
    this.modalInstance = new bootstrap.Modal(this.modal.nativeElement);
    this.modalInstance.show();
  }

  close() {
    this.submitted = false;
    this.schedulerForm.reset();
    this.modalInstance?.hide();
  }

  submitForm() {
    this.submitted = true;
    
    if (this.schedulerForm.invalid) {
      this.markAllFieldsAsTouched();
      this.scrollToFirstInvalid();
      return;
    }

    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    const formData = this.schedulerForm.value;
    // console.log('Form Submitted:', formData);
    // Call API or pass data to parent here
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
          IntvCity: formData.interviewCity,
          intvDate: formData.interviewDate,
          remarks: formData.remark,
          remarkTxt: formData.description || ''
        }
      ]
    };
    
    console.log('Payload to be sent:', payload);
    
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        // console.log('Response:', res);
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Information Submitted successfully.', 'success');
          this.schedulerForm.reset();
          this.parentComponent.loadAllDropdownData?.();
          this.parentComponent.loadAllSelectionCV?.(); 
          
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to Update Information.');
        }
      },
      error: () => {
        this.sweetAlert.showError('Error submitting form. Please try again.');
      }
    });


    this.close();
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.schedulerForm.controls).forEach(key => {
      const control = this.schedulerForm.get(key);
      control?.markAsTouched();
    });
  }

  private scrollToFirstInvalid(): void {
    const firstInvalidControl = document.querySelector('.ng-invalid');
    if (firstInvalidControl) {
      firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Helper methods for template validation
  isInvalid(controlName: string): boolean {
    const control = this.schedulerForm.get(controlName);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.schedulerForm.get(controlName);
    return !!(control && control.hasError(errorType) && (control.touched || this.submitted));
  }

  // Get validation message for a field
  getValidationMessage(controlName: string): string {
    const control = this.schedulerForm.get(controlName);
    
    if (!control || !control.errors || (!control.touched && !this.submitted)) {
      return '';
    }

    const errors = control.errors;
    
    if (errors['required']) {
      return 'This field is required';
    }
    
    if (errors['pastDate']) {
      return 'Interview date cannot be in the past';
    }
    
    if (errors['maxlength']) {
      return `Description cannot exceed ${errors['maxlength'].requiredLength} characters`;
    }

    return 'Invalid value';
  }

  // Check if form has any errors to show submit button state
  hasFormErrors(): boolean {
    return this.schedulerForm.invalid && this.submitted;
  }
  
}
