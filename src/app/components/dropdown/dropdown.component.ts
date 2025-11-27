import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements OnInit {
  readonly Number = Number;
  showSearchSection = true;
  addRecdFlg = false;
  listRecdFlg = true;
  isEditMode = false;
  editId: string | null = null;
  submitted = false;
  currentPage = paginationProperties.currentPage;
  pageSize = paginationProperties.pageSize;
  totalPages = paginationProperties.totalPages;
  paginationRange = paginationProperties.paginationRange;
  jumpToPage = paginationProperties.jumpToPage;
  totalRecords = paginationProperties.totalRecords;
  noDataMessage = '';
  selectedItems: Set<string> = new Set();
  dropdownTypes: any[] = [];
  dropdowns: any[] = [];

  searchForm: FormGroup;
  dropdownForm: FormGroup;
  
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
    private loadingService: LoadingService,
    private authService: AuthService
  ) {
    this.searchForm = this.fb.group({
      ssection: ['']
    });
    this.dropdownForm = this.fb.group({
      drpName: ['', Validators.required],
      cattype: ['', Validators.required],
      status: [false]
    });
  }

  ngOnInit(): void {
    this.loadDropdownTypes();
    this.listDropdowns();
  }

  loadDropdownTypes(): void {
    const payload = {
      event: 'drpdwn',
      mode: 'vdropval',
      InputData: [{}]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        if (res && res.data && res.data.list) {
          this.dropdownTypes = Object.entries(res.data.list).map(([id, name]) => ({ id, name }));
        } else {
          this.dropdownTypes = [];
        }
      },
      error: () => {
        this.dropdownTypes = [];
      }
    });
  }

  listDropdowns(): void {
    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    this.loadingService.show('Removing...');
    const payload = {
      event: 'drpdwn',
      mode: 'lr',
      InputData: [{
        ssection: this.searchForm.controls['ssection'].value || '',
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res?.data?.list) {
          this.dropdowns = res.data.list;
          this.totalRecords = res.data.total_records || this.dropdowns.length;
          this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = res?.message || 'No data found.';
          this.dropdowns = [];
          this.totalRecords = 0;
          this.totalPages = 0;
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load dropdowns. Please try again.');
        this.dropdowns = [];
        this.totalRecords = 0;
        this.totalPages = 0;
      }
    });
  }

  onSearch(): void {
    if (!this.searchForm.controls['ssection'].value) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.listDropdowns();
  }

  onClearSearch(): void {
    this.searchForm.reset({ ssection: '' });
    this.listDropdowns();
    this.updateFloatingLabels();
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.isEditMode = false;
    this.editId = null;
    this.dropdownForm.reset({ drpName: '', cattype: '', status: false });
  }

  onCancelClick(): void {
    this.submitted = false;
    this.isEditMode = false;
    this.editId = null;
    this.addRecdFlg = false;
    this.listRecdFlg = true;
    this.dropdownForm.reset({ drpName: '', cattype: '', status: false });
    this.updateFloatingLabels();
  }

  onClearClick(): void {
    this.submitted = false;
    this.dropdownForm.reset({ drpName: '', cattype: '', status: false });
  }

  onSaveNewRecord(): void {
    this.submitted = true;
    if (this.dropdownForm.invalid) {
      this.dropdownForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'drpdwn',
      mode: 'sv',
      InputData: [{
        cattype: this.dropdownForm.controls['cattype'].value,
        publish: this.dropdownForm.controls['status'].value ? '1' : '0',
        drpName: this.dropdownForm.controls['drpName'].value
      }]
    };
    this.loadingService.show();
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Dropdown saved.', 'success');
          this.onCancelClick();
          this.loadDropdownTypes();
          this.listDropdowns();
        } else {
          this.sweetAlert.showError(res.message || 'Failed to save dropdown.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to save dropdown. Please try again.');
      }
    });
  }

  onEditClick(item: any): void {
    const payload = {
      event: 'drpdwn',
      mode: 'er',
      InputData: [{
        id: item.id,
        ssection: this.searchForm.controls['ssection'].value || '',
        drpName: item.drpName || '',
        cattype: item.cattype || '',
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        if (res && res.status === 'success' && res.data) {
          this.isEditMode = true;
          this.editId = res.data.id;
          this.addRecdFlg = true;
          this.listRecdFlg = false;
          this.dropdownForm.patchValue({
            drpName: res.data.drpName || '',
            cattype: res.data.var_ddvalue || '',
            status: res.data.chr_status === '1'
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

  onUpdateRecord(): void {
    this.submitted = true;
    if (!this.isEditMode || !this.editId) return;
    if (this.dropdownForm.invalid) {
      this.dropdownForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'drpdwn',
      mode: 'up',
      InputData: [{
        id: this.editId,
        ssection: this.searchForm.controls['ssection'].value || '',
        page: this.currentPage.toString(),
        drpName: this.dropdownForm.controls['drpName'].value,
        publish: this.dropdownForm.controls['status'].value ? '1' : '0',
        cattype: this.dropdownForm.controls['cattype'].value
      }]
    };
    this.loadingService.show();
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res && res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Dropdown updated.', 'success');
          this.isEditMode = false;
          this.editId = null;
          this.addRecdFlg = false;
          this.listRecdFlg = true;
          this.dropdownForm.reset({ drpName: '', cattype: '', status: false });
          this.listDropdowns();
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

  onChangeVisibilityClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to change visibility', 'warning');
      return;
    }
    const payload = {
      event: 'drpdwn',
      mode: 'cs',
      InputData: [{
        catId: Array.from(this.selectedItems),
        ssection: this.searchForm.controls['ssection'].value || '',
        page: this.currentPage.toString()
      }]
    };
    this.sweetAlert.confirmStatusChange('Are you sure you want to change the visibility of the selected dropdowns?').then((result: any) => {
      if (result.isConfirmed) {
        this.loadingService.show('Updating...');
        this.commonService.post(payload).subscribe({
          next: (res) => {
            this.loadingService.hide();
            if (res.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Visibility updated.', 'success');
              this.selectedItems.clear();
              this.listDropdowns();
            } else {
              this.sweetAlert.showError(res.message || 'Failed to update visibility');
            }
          },
          error: () => {
            this.loadingService.hide();
            this.sweetAlert.showError('Failed to update visibility. Please try again.');
          }
        });
      }
    });
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to delete', 'warning');
      return;
    }
    const payload = {
      event: 'drpdwn',
      mode: 'dr',
      InputData: [{
        catId: Array.from(this.selectedItems),
        ssection: this.searchForm.controls['ssection'].value || '',
        page: this.currentPage.toString()
      }]
    };
    this.sweetAlert.confirmDelete('Are you sure you want to delete the selected dropdowns?').then((result: any) => {
      if (result.isConfirmed) {
        this.loadingService.show('Deleting...');
        this.commonService.post(payload).subscribe({
          next: (res) => {
            this.loadingService.hide();
            if (res.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Dropdowns deleted.', 'success');
              this.selectedItems.clear();
              this.listDropdowns();
            } else {
              this.sweetAlert.showError(res.message || 'Failed to delete records');
            }
          },
          error: () => {
            this.loadingService.hide();
            this.sweetAlert.showError('Failed to delete dropdowns. Please try again.');
          }
        });
      }
    });
  }

  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.dropdowns.forEach(item => this.selectedItems.add(item.id)) : this.selectedItems.clear();
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
      this.listDropdowns();
    }
  }

  onItemSelect(itemId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.selectedItems.add(itemId) : this.selectedItems.delete(itemId);
  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
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
}
