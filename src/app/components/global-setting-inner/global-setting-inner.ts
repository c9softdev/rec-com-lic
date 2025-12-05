import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { CommonService } from '../../core/services/common.service';
import { LoadingService } from '../../core/services/loading.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-global-setting-inner',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './global-setting-inner.html',
  styleUrl: './global-setting-inner.scss'
})
export class GlobalSettingInner {

  isEditMode = false;
  editId: string | null = null;
  submitted = false;
  pageForm: FormGroup;
  globalSetting: any;

  userId: any;
  userType: any;
  emailId: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;
  comp_id: any;
  superAdminID: any;

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private sessionService: SessionService
  ) {



    this.pageForm = this.fb.group({
      email_from: ['', Validators.required],
      email_to: ['', Validators.required],
      app_root_url: [''],
      site_name: [''],
      site_com: [''],
      email_bcc: [''],
      var_logo_url: [''],
      var_logo_client: [''],
      var_version: ['']
    });
  }

  ngOnInit(): void {
    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    this.onEditClick({ id: '1' }); // Example call to onEditClick with a dummy ID
  }

  onEditClick(item: any): void {

    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    this.loadingService.show('Loading...');
    const payload = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [{
        id: item.id,
        comp_id: this.comp_id  // Use comp_id instead of sec_key
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        // console.log('Edit Response:', res);
        if (res && res.status === 'success' && res.data) {
          this.pageForm.patchValue({
            setting_id: res.data.setting_id || '',
            email_to: res.data.email_to || '',
            app_root_url: res.data.app_root_url || '',
            site_name: res.data.var_title || '',
            site_com: res.data.site_com || '',
            email_from: res.data.email_from || '',
            email_bcc: res.data.email_bcc || '',
            var_logo_url: res.data.var_logo_url || '',
            var_logo_client: res.data.var_logo_client || '',
            var_version: res.data.var_version || ''
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

  onUpdateRecord(): void {
    this.submitted = true;
    if (this.pageForm.invalid) {
      this.pageForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'msp',
      mode: 'upgc',
      InputData: [{
        id: "1",    
        sName: this.pageForm.controls['site_name'].value,  
        var_logo_url: this.pageForm.controls['var_logo_url'].value,
        var_logo_client: this.pageForm.controls['var_logo_client'].value,
        emailto: this.pageForm.controls['email_to'].value,
        emailfrom: this.pageForm.controls['email_from'].value,  
        var_version: this.pageForm.controls['var_version'].value
      }]
    };
    console.log('Response:', payload);
    this.loadingService.show('Updating...');
    this.commonService.post(payload).subscribe({ 
      next: (res) => {
        this.loadingService.hide();
        console.log('Response:', res);
        if (res && res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Master Setting has been updated.', 'success');
          this.onEditClick({ id: '1' });
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to update record.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to update record. Please try again.');
      }
    });
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

}
