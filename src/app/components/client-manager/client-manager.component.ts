import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { FileValidatorService, FileValidationOptions } from '../../core/services/file-validator.service';
import { LoadingService } from '../../core/services/loading.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-client-manager',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PaginationComponent],
  templateUrl: './client-manager.component.html',
  styleUrl: './client-manager.component.scss'
})
export class ClientManagerComponent {
  readonly Math = Math;
  readonly Number = Number;
  showSearchSection = true;
  ClientsForm: FormGroup;
  searchForm: FormGroup;
  currentPage = paginationProperties.currentPage;
  pageSize = paginationProperties.pageSize;
  totalPages = paginationProperties.totalPages;
  paginationRange = paginationProperties.paginationRange;
  jumpToPage = paginationProperties.jumpToPage;
  totalRecords = paginationProperties.totalRecords;
  selectedItems: Set<string> = new Set();
  isEditMode = false;
  addRecdFlg = false;
  listRecdFlg = true;
  clients: any[] = [];
  editId: string | null = null;
  submitted = false;
  orderChanges: { [id: string]: number } = {};
  noDataMessage = '';
  viewModalOpen = false;
  viewClient: any = null;
  isMaximized = false;
  selectedFile: File | null = null;
  fileError: string | null = null;
  previewUrl: string | null = null;
  private currentObjectUrl: string | null = null;
  selectedFileName: string | null = null;
  isSaving = false;

  userId: any;
  userType: any;
  emailId: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private fileValidator: FileValidatorService, 
    private loadingService: LoadingService,
    private authService: AuthService
  ) {
    this.ClientsForm = this.fb.group({
      clname: ['', Validators.required],
      clemail: [''],
      clwebsite: [''],
      cldesc: [''],
      publish: [false],
      front: [false]
    });
    this.searchForm = this.fb.group({
      sname: [''],
      semail: ['']
    });
  }

  ngOnInit() {
    this.loadClientManager();
  }

  onSearch(): void {
    const searchValues = this.searchForm.value;
    const allEmpty = !searchValues.sname && !searchValues.semail;
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.loadClientManager();
    this.updateFloatingLabels();
  }

  onClearSearch(): void {
    this.searchForm.reset({ sname: '', semail: '' });
    setTimeout(() => {
      const searchInputs = document.querySelectorAll('#sname, #semail');
      searchInputs.forEach((input: Element) => input.classList.remove('active'));
    }, 0);
    this.updateFloatingLabels();
    this.loadClientManager();
  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.clearForm();
    this.updateFloatingLabels();
  }

  private fetchClientDetails(item: any, onSuccess: (data: any) => void, onError?: (msg: string) => void): void {
    const payload = {
      event: 'client',
      mode: 'er',
      InputData: [
        {
          id: item.id,
          sname: this.searchForm.controls['sname'].value,
          semail: this.searchForm.controls['semail'].value
        }
      ]
    };
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        if (response?.status === 'success' && response.data) {
          onSuccess(response.data);
        } else {
          if (onError) onError(response?.message || 'Failed to retrieve client data.');
          else this.sweetAlert.showError(response?.message || 'Failed to retrieve client data.');
        }
      },
      error: () => {
        if (onError) onError('Error retrieving client data.');
        else this.sweetAlert.showError('Error retrieving client data.');
      }
    });
  }

  onEditClick(item: any): void {
    this.fetchClientDetails(item, (data) => {
      this.ClientsForm.patchValue({
        clname: data.client_name || '',
        clemail: data.var_email || '',
        clwebsite: data.var_websites || '',
        cldesc: data.text_client_desc || '',
        publish: data.chr_status === '1',
        front: data.portal === '1',
        clientLogo: data.var_cl_logo || ''
      });
      this.isEditMode = true;
      this.addRecdFlg = true;
      this.listRecdFlg = false;
      this.editId = data.id;
      // show existing logo preview if available
      if (data.var_cl_logo) {
        this.setPreviewUrl(data.var_cl_logo);
      } else {
        this.clearPreviewObjectUrl();
        this.previewUrl = null;
      }
      this.updateFloatingLabels();
    });
  }

  onViewClick(item: any): void {
    this.fetchClientDetails(item, (data) => {
      this.viewClient = {
        clientName: data.client_name || '',
        website: data.var_websites || '',
        description: data.text_client_desc || '',
        logo: data.var_cl_logo || ''
      };
      this.viewModalOpen = true;
      this.isMaximized = false;
    });
}
toggleMaximize(): void {
    this.isMaximized = !this.isMaximized;
}

  closeViewModal(): void {
    this.viewModalOpen = false;
    this.viewClient = null;
  }

  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.clients.forEach(item => this.selectedItems.add(item.id)) : this.selectedItems.clear();
  }

  onItemSelect(itemId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.selectedItems.add(itemId) : this.selectedItems.delete(itemId);
  }

  onOrderInputChange(id: string, value: string): void {
    const num = Number(value);
    if (!value || isNaN(num) || num < 1 || num > Number(this.totalRecords)) {
      delete this.orderChanges[id];
    } else {
      this.orderChanges[id] = num;
    }
  }

  onChangeOrderClick(): void {
    const changedIds = Object.keys(this.orderChanges);
    if (changedIds.length === 0) {
      this.sweetAlert.showToast('Please change at least one order value.', 'warning');
      return;
    }
    const payload = {
      event: 'client',
      mode: 'upord',
      InputData: [
        {
          catId: changedIds.map(id => Number(id)),
          setOrder: changedIds.map(id => this.orderChanges[id]),
          page: this.currentPage.toString(),
          sname: this.searchForm.controls['sname'].value || '',
          semail: this.searchForm.controls['semail'].value || ''
        }
      ]
    };
    this.sweetAlert.confirmStatusChange('Are you sure you want to update the order of the selected clients?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (response: any) => {
            if (response.status === 'success') {
              this.sweetAlert.showToast(response.message, 'success');
              this.loadClientManager();
              this.orderChanges = {};
            } else {
              this.sweetAlert.showError(response.message);
            }
          },
          error: () => {
            this.sweetAlert.showError('Failed to update client order. Please try again.');
          }
        });
      }
    });
  }

  onDisplayPortalClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one client to update portal visibility.', 'warning');
      return;
    }
    const payload = {
      event: 'client',
      mode: 'ps',
      InputData: [
        {
          catId: Array.from(this.selectedItems).map(id => Number(id)),
          page: this.currentPage.toString(),
          sname: this.searchForm.controls['sname'].value || '',
          semail: this.searchForm.controls['semail'].value || ''
        }
      ]
    };
    this.sweetAlert.confirmStatusChange('Are you sure you want to change the portal visibility of the selected clients?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (response: any) => {
            if (response.status === 'success') {
              this.sweetAlert.showToast(response.message, 'success');
              this.loadClientManager();
              this.selectedItems.clear();
            } else {
              this.sweetAlert.showError(response.message);
            }
          },
          error: () => {
            this.sweetAlert.showError('Failed to update client portal visibility. Please try again.');
          }
        });
      }
    });
  }

  onChangeVisibilityClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one client to update visibility.', 'warning');
      return;
    }
    const payload = {
      event: 'client',
      mode: 'cs',
      InputData: [
        {
          catId: Array.from(this.selectedItems).map(id => Number(id)),
          page: this.currentPage.toString(),
          sname: this.searchForm.controls['sname'].value || '',
          semail: this.searchForm.controls['semail'].value || ''
        }
      ]
    };
    this.sweetAlert.confirmStatusChange('Are you sure you want to change the visibility of the selected clients?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (response: any) => {
            if (response.status === 'success') {
              this.sweetAlert.showToast(response.message, 'success');
              this.loadClientManager();
              this.selectedItems.clear();
            } else {
              this.sweetAlert.showError(response.message);
            }
          },
          error: () => {
            this.sweetAlert.showError('Failed to update client visibility. Please try again.');
          }
        });
      }
    });
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one client to delete.', 'warning');
      return;
    }
    const payload = {
      event: 'client',
      mode: 'dr',
      InputData: [
        {
          catId: Array.from(this.selectedItems).map(id => Number(id)),
          page: this.currentPage.toString(),
          sname: this.searchForm.controls['sname'].value || '',
          semail: this.searchForm.controls['semail'].value || ''
        }
      ]
    };
    this.sweetAlert.confirmDelete('Are you sure you want to delete the selected clients?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (response: any) => {
            if (response.status === 'success') {
              this.sweetAlert.showToast(response.message, 'success');
              this.loadClientManager();
              this.selectedItems.clear();
            } else {
              this.sweetAlert.showError(response.message);
            }
          },
          error: () => {
            this.sweetAlert.showError('Failed to delete clients. Please try again.');
          }
        });
      }
    });
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
      this.loadClientManager();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Validate file type and size using shared service (default: images, 500KB)
      const result = this.fileValidator.validate(file);
      if (!result.valid) {
        this.selectedFile = null;
        this.ClientsForm.patchValue({ clientLogo: '' });
        try { input.value = ''; } catch (e) {}
        // Split the validator message into a title and details on the first ':' if present
  const title = result.title || 'Invalid file.';
  const details = result.details || undefined;
  this.fileError = title;
  this.sweetAlert.showValidationError(title, details);
        return;
      }
  this.selectedFile = file;
  this.selectedFileName = file.name;
      this.fileError = null;
      // create preview object URL for the selected file
      try {
        this.clearPreviewObjectUrl();
        this.currentObjectUrl = URL.createObjectURL(file);
        this.previewUrl = this.currentObjectUrl;
      } catch (e) {
        this.previewUrl = null;
      }
      this.ClientsForm.patchValue({ clientLogo: this.selectedFile });
      this.ClientsForm.get('clientLogo')?.updateValueAndValidity();
    } else {
      this.selectedFile = null;
      this.ClientsForm.patchValue({ clientLogo: '' });
  this.clearPreviewObjectUrl();
  this.previewUrl = null;
  this.selectedFileName = null;
    }
  }

  onClearClick(): void {
    this.submitted = false;
    this.clearForm();
  }

  onCancelClick(): void {
    this.submitted = false;
    this.isEditMode = false;
    this.editId = null;
    this.addRecdFlg = false;
    this.listRecdFlg = true;
    this.clearForm();
  }

  onUpdateRecord(): void {
    this.submitted = true;
    if (!this.isEditMode || !this.editId) return;
    if (this.ClientsForm.invalid) {
      this.ClientsForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const formData = new FormData();
    formData.append('event', 'client');
    formData.append('mode', 'ur');
    formData.append('id', this.editId || '');
    formData.append('page', this.currentPage.toString());
    formData.append('sname', this.searchForm.controls['sname'].value || '');
    formData.append('semail', this.searchForm.controls['semail'].value || '');
    formData.append('clname', this.ClientsForm.controls['clname'].value);
    formData.append('clemail', this.ClientsForm.controls['clemail'].value);
    formData.append('clwebsite', this.ClientsForm.controls['clwebsite'].value);
    formData.append('cldesc', this.ClientsForm.controls['cldesc'].value);
    formData.append('front', this.ClientsForm.controls['front'].value ? '1' : '0');
    formData.append('publish', this.ClientsForm.controls['publish'].value ? '1' : '0');

    if (this.selectedFile) {
      const file = this.selectedFile;
      const result = this.fileValidator.validate(file);
      if (!result.valid) {
        const title = result.title || 'Invalid file.';
        const details = result.details || undefined;
        this.fileError = title;
        this.sweetAlert.showValidationError(title, details);
        return;
      }
      this.fileError = null;
      formData.append('clientLogo', file);
    }
    this.isSaving = true;
    this.loadingService.show();
    this.commonService.post(formData).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.loadingService.hide();
        if (response.status === 'success') {
          this.sweetAlert.showToast(response.message, 'success');
          this.loadClientManager();
          this.clearForm();
          this.onCancelClick();
        } else {
          this.sweetAlert.showError(response.message);
        }
      },
      error: () => {
        this.isSaving = false;
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to update client. Please try again.');
      }
    });
  }

  public onSaveNewRecord(): void {
  // save handler
    this.submitted = true;

    if (this.ClientsForm.valid) {
      const formData = new FormData();

      // Append file only if selected
      if (this.selectedFile) {
        const result = this.fileValidator.validate(this.selectedFile);
        if (!result.valid) {
          this.sweetAlert.showError(result.error || 'Invalid file.');
          return;
        }
        formData.append('clientLogo', this.selectedFile);
      }

      // Append other fields
      formData.append('event', 'client');
      formData.append('mode', 'sv');

      // Flatten and append the form values
      formData.append('clname', this.ClientsForm.value.clname);
      formData.append('clemail', this.ClientsForm.value.clemail);
      formData.append('clwebsite', this.ClientsForm.value.clwebsite);
      formData.append('cldesc', this.ClientsForm.value.cldesc);
      formData.append('front', this.ClientsForm.value.front ? '1' : '0');
      formData.append('publish', this.ClientsForm.value.publish ? '1' : '0');

      this.isSaving = true;
      this.loadingService.show();
      this.commonService.post(formData).subscribe({
        next: (response: any) => {
          this.isSaving = false;
          this.loadingService.hide();
          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message, 'success');
            this.loadClientManager();
            this.clearForm();
            this.onCancelClick();
          } else {
            this.sweetAlert.showError(response.message);
          }
        },
        error: () => {
          this.isSaving = false;
          this.loadingService.hide();
          this.sweetAlert.showError('Failed to save client. Please try again.');
        }
      });

    } else {
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
    }
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  private loadClientManager(): void {
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    const payload = {
      event: 'client',
      mode: 'lr',
      InputData: [
        {
          sname: this.searchForm.controls['sname'].value || '',
          semail: this.searchForm.controls['semail'].value || '',
          page: this.currentPage.toString(),
        }
      ]
    };
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        if (response?.data?.list) {
          this.clients = response.data.list;
          this.totalRecords = response.data.total_records?.toString() || '0';
          this.totalPages = Math.ceil(Number(this.totalRecords) / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = response?.message || 'No data found.';
          this.clients = [];
          this.totalRecords = 0;
          this.totalPages = 0;
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load Clients. Please try again.');
        this.clients = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.noDataMessage = 'Failed to load Clients.';
      }
    });
  }

  private updateFloatingLabels(): void {
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

  private clearForm(): void {
    this.ClientsForm.reset({
      clname: '',
      clemail: '',
      clwebsite: '',
      cldesc: '',
      publish: false,
      front: false
    });
    this.selectedFile = null;
  this.fileError = null;
    this.clearPreviewObjectUrl();
    this.previewUrl = null;
    this.updateFloatingLabels();
  }

  public clearFile(fileInput?: HTMLInputElement | null): void {
    // Clear selection and preview
    this.selectedFile = null;
    this.selectedFileName = null;
    this.fileError = null;
    if (fileInput) {
      try { fileInput.value = ''; } catch (e) {}
    }
    this.ClientsForm.patchValue({ clientLogo: '' });
    this.clearPreviewObjectUrl();
    this.previewUrl = null;
  }

  private setPreviewUrl(urlOrObject: string) {
    // If passed a remote URL (string), just set it. If it's an object URL, ensure we manage revocation.
    this.clearPreviewObjectUrl();
    this.previewUrl = urlOrObject;
  }

  private clearPreviewObjectUrl() {
    if (this.currentObjectUrl) {
      try { URL.revokeObjectURL(this.currentObjectUrl); } catch (e) {}
      this.currentObjectUrl = null;
    }
  }

  public checkInput(input: EventTarget | null): void {
    if (!input) return;
    const element = input as HTMLInputElement | HTMLSelectElement;
    if (element.value.length > 0) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  }

  // ...existing code...
}
