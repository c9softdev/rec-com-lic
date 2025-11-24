import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { CommonService } from '../../core/services/common.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FileValidatorService, FileValidationOptions } from '../../core/services/file-validator.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DownloadService } from '../../core/services/download.service';

@Component({
  selector: 'archive-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './archive-manager.html',
  styleUrls: ['./archive-manager.scss']
})
export class ArchiveManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  readonly Math = Math;
  readonly Number = Number;

  // Form and UI state
  archiveForm!: FormGroup;
  searchForm!: FormGroup;
  showSearchSection = true;
  totalRecords = '0';
  submitted = false;
  records: any[] = [];
  selectedItems: Set<string> = new Set();
  noDataMessage = '';
  jobseekerId: string = '';
  isLoading = false;
  
  // File upload properties
  selectedFile: File | null = null;
  fileError: string | null = null;
  selectedFileName: string | null = null;
  isSaving = false;
  previewUrl: string | null = null;
  private currentObjectUrl: string | null = null;

  // Archival types
  archivalTypes: { [key: string]: string } = {};
  
  // Session properties
  userId: string = '0';
  userType: string = '0';
  archivalchk: string = '';

  // Allowed file types
  readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  readonly allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  downloadFile(fileUrl: string, filename = 'Document_download') {
    const payload = {
      event: 'msp',
      mode: 'dwnld',
      InputData: [{ fileUrl }]
    };
    this.downloadService.downloadFileFromApi(this.commonService.postBlob(payload), filename);
  }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private sweetAlert: SweetAlertService,
    private loadingService: LoadingService,
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService,
    private fileValidator: FileValidatorService,
    private downloadService: DownloadService

  ) {
    this.initForm();
  }

  private initForm(): void {
    this.archiveForm = this.fb.group({
      fileType: ['', Validators.required],
      uploadFile: [null]
    });

    this.searchForm = this.fb.group({
      searchType: [''],
      searchDate: ['']
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeObjectURL();
  }

  private loadArchivalTypes(): void {
    const payload = {
      event: 'jobseeker',
      mode: 'rmkList',
      InputData: [{ rmType: '3' }]
    };

    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        if (res?.status === 'success' && res.data?.list) {
          console.log('Archival types response:', res.data);
          this.archivalTypes = res.data.list;
          
          // If archival types loaded but empty
          if (Object.keys(this.archivalTypes).length === 0) {
            this.sweetAlert.showToast('No archival types available.', 'warning');
          }
        } else {
          this.sweetAlert.showError('Failed to load archival types.');
          console.error('Invalid response format:', res);
        }
      },
      error: (error) => {
        console.error('Error loading archival types:', error);
        this.sweetAlert.showError('Failed to load archival types. Please try again.');
      }
    });
  }

  ngOnInit(): void {
    // Get session values
    const session = this.authService.currentUserValue;
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.archivalchk = session?.archivalchk || '';

    // Check archive privilege
    if (this.archivalchk !== '1' && !(this.userId === '1' && this.userType === '1')) {
      this.sweetAlert.showToast('You do not have permission to access archive manager.', 'error');
      this.router.navigate(['/']);
      return;
    }

    // Load archival types
    this.loadArchivalTypes();

    // Get the jobseeker ID from the route parameter
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.jobseekerId = id;
      this.loadArchiveDocs();
    } else {
      this.sweetAlert.showError('Missing Jobseeker Id.');
    }
  }

  loadArchiveDocs(): void {
    if (!this.jobseekerId) {
      this.sweetAlert.showError('Missing Jobseeker Id.');
      return;
    }

    this.isLoading = true;
    this.loadingService.show('Loading archive documents...');

    const payload = {
      event: 'jobseeker',
      mode: 'listArcDoc',
      InputData: [{ id: this.jobseekerId }]
    };

    this.commonService.post(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.loadingService.hide();
          // Only show error if response is truly error
          if (response?.status === 'error') {
            this.handleError(response.message || 'Failed to load archive documents');
            return;
          }
          // Treat undefined/null/empty list as empty, never as error
          const list = response?.data?.list;
          if (Array.isArray(list)) {
            this.records = list;
            this.totalRecords = response.data.total_records?.toString() || '0';
            this.noDataMessage = list.length === 0 ? 'No archive documents found, Please upload some documents.' : '';
          } else {
            // If 'list' is null/undefined, treat as empty
            this.records = [];
            this.totalRecords = '0';
            this.noDataMessage = 'No archive documents found, Please upload some documents.';
          }
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    
    this.clearFile();
    
    if (!file) return;

    // Validate file
    const validationResult = this.fileValidator.validate(file, {
      maxSize: this.maxFileSize,
      allowedTypes: [...this.allowedImageTypes, ...this.allowedDocTypes]
    });

    if (!validationResult.valid) {
      this.fileError = validationResult.error || 'Invalid file';
      input.value = '';
      this.sweetAlert.showToast(this.fileError, 'warning');
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.archiveForm.patchValue({ uploadFile: file });

    // Create file preview if it's an image
    if (this.allowedImageTypes.includes(file.type)) {
      this.createFilePreview(file);
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileError = null;
    this.selectedFileName = null;
    this.archiveForm.patchValue({ uploadFile: null });
    this.revokeObjectURL();
  }

  private createFilePreview(file: File): void {
    this.revokeObjectURL();
    const objectUrl = URL.createObjectURL(file);
    this.previewUrl = objectUrl;
    this.currentObjectUrl = objectUrl;
  }

  private revokeObjectURL(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
      this.previewUrl = null;
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    this.loadingService.hide();
    
    let errorMessage = 'An error occurred. Please try again.';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    console.error('Archive Manager Error:', error);
    this.sweetAlert.showError(errorMessage);
    
    // Reset data
    this.records = [];
    this.noDataMessage = errorMessage;
  }

  onSaveRecord(): void {
    this.submitted = true;

    if (this.archiveForm.invalid || !this.selectedFile) {
      this.archiveForm.markAllAsTouched();
      this.validateForm();
      return;
    }

    // Validate file size and type one last time
    const validationResult = this.fileValidator.validate(this.selectedFile, {
      maxSize: this.maxFileSize,
      allowedTypes: [...this.allowedImageTypes, ...this.allowedDocTypes]
    });

    if (!validationResult.valid) {
      const errorMessage = validationResult.error || 'Invalid file';
      this.fileError = errorMessage;
      this.sweetAlert.showError(errorMessage);
      return;
    }

    this.isSaving = true;
    this.loadingService.show('Uploading archive document...');

    // Prepare FormData with binary file and required fields
    const formData = new FormData();
    formData.append('event', 'jobseeker');
    formData.append('mode', 'upArchDoc');
    formData.append('id', this.jobseekerId);
    formData.append('FrontdegreeFile', this.selectedFile, this.selectedFile.name);
    formData.append('doctype', this.archiveForm.get('fileType')?.value || '');
    formData.append('sessionUser', this.userId);

    this.commonService.postWithFiles(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loadingService.hide();
          this.isSaving = false;
          if (response?.status === 'success') {
            this.sweetAlert.showToast(response.message || 'Document uploaded successfully.', 'success');
            this.clearFile();
            this.archiveForm.reset();
            this.submitted = false;
            this.loadArchiveDocs();
          } else {
            this.handleError(response.message || 'Failed to upload document');
          }
        },
        error: (error) => {
          this.loadingService.hide();
          this.isSaving = false;
          this.handleError(error);
        }
      });
}

  confirmDelete(): void {
    if (this.selectedItems.size === 0) return;

    const idsToDelete = Array.from(this.selectedItems);
    const payload = {
      event: 'jobseeker',
      mode: 'delArchDoc',
      InputData: [{
        userId: idsToDelete,
        id: this.jobseekerId
      }]
    };

    this.loadingService.show('Deleting documents...');
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        if (response?.status === 'success') {
          this.sweetAlert.showToast(response.message || 'Documents deleted successfully.', 'success');
          this.selectedItems.clear();
          this.loadArchiveDocs();
        } else {
          this.sweetAlert.showError(response?.message || 'Failed to delete documents.');
        }
      },
      error: (error) => {
        console.error('Error deleting documents:', error);
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to delete documents. Please try again.');
      }
    });
  }
  //     }]
  //   };
  //   this.loadingService.show('Saving...');
  //   this.commonService.post(payload).subscribe({
  //     next: (response: any) => {
  //       this.loadingService.hide();
  //       if (response.status === 'success') {
  //         this.sweetAlert.showToast(response.message || 'City saved successfully.', 'success');
  //         this.PageForm.controls['cityName'].reset();
  //         this.loadCities();
  //       } else {
  //         this.sweetAlert.showError(response.message || 'Failed to save City.');
  //       }
  //     },
  //     error: () => {
  //       this.loadingService.hide();
  //       this.sweetAlert.showError('Failed to save City. Please try again.');
  //     }
  //   });
  // }

  // onSearch(): void {
  //   const searchValues = this.PageForm.value;
  //   const allEmpty = !searchValues.cityName && !searchValues.stateName;
  //   if (allEmpty) {
  //     this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
  //   }
    
  //   this.loadArchiveDocs();
  // }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to delete', 'warning');
      return;
    }

    const count = this.selectedItems.size;
    const message = count === 1
      ? 'Are you sure you want to delete this document? This action cannot be undone.'
      : `Are you sure you want to delete ${count} documents? This action cannot be undone.`;

    this.sweetAlert.confirmDelete(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }

  onSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      // Clear existing and add all current record ids (docid)
      const newSet = new Set<string>();
      this.records.forEach(record => {
        const id = record?.docid ?? record?.id ?? null;
        if (id != null) newSet.add(String(id));
      });
      this.selectedItems = newSet;
    } else {
      this.selectedItems = new Set<string>();
    }
  }

  onItemSelect(itemId: string | number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const idStr = String(itemId);
    if (checkbox.checked) {
      const newSet = new Set(this.selectedItems);
      newSet.add(idStr);
      this.selectedItems = newSet;
    } else {
      const newSet = new Set(this.selectedItems);
      newSet.delete(idStr);
      this.selectedItems = newSet;
    }
  }

  /**
   * Returns true when all visible records are selected.
   */
  isAllSelected(): boolean {
    if (!this.records || this.records.length === 0) return false;
    return this.records.every(r => this.selectedItems.has(String(r?.docid ?? r?.id ?? '')));
  }

  /**
   * Returns true when the given id is selected.
   */
  isSelected(id: string | number): boolean {
    return this.selectedItems.has(String(id));
  }

  onSearch(): void {
    const searchValues = this.searchForm.value;
    const allEmpty = !searchValues.searchType && !searchValues.searchDate;
    
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    
    this.loadArchiveDocs();
  }

  onClearSearch(): void {
    this.searchForm.reset();
    this.loadArchiveDocs();
  }

  validateForm(): void {
    if (this.archiveForm.get('fileType')?.invalid) {
      this.sweetAlert.showToast('Please select an archival type.', 'warning');
    }
    
    if (!this.selectedFile) {
      this.sweetAlert.showToast('Please select a file to upload.', 'warning');
    }
  }

  onClear(): void {
    this.submitted = false;
    this.archiveForm.reset();
    this.clearFile();
  }

  private updateFormValidation(): void {
    if (this.submitted) {
      Object.keys(this.archiveForm.controls).forEach(key => {
        const control = this.archiveForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  checkInput(input: EventTarget | null): void {
    if (!input) return;
    const element = input as HTMLInputElement | HTMLSelectElement;
    if (element.value && element.value.toString().length > 0) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  }

  // checkInput(input: EventTarget | null): void {
  //   if (!input) return;
  //   const element = input as HTMLInputElement | HTMLSelectElement;
  //   if (element.value.length > 0) {
  //     element.classList.add('active');
  //   } else {
  //     element.classList.remove('active');
  //   }
  // }

  // onJumpToPage(page?: number): void {
  //   const targetPage = page ?? this.jumpToPage;
  //   if (targetPage >= 1 && targetPage <= this.totalPages) {
  //     this.onPageChange(targetPage);
  //   } else {
  //     this.jumpToPage = this.currentPage;
  //   }
  // }

  // onPageChange(page: number): void {
  //   if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
  //     this.currentPage = page;
  //     this.loadCities();
  //   }
  // } 

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }
}
