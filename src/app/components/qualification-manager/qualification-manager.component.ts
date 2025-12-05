import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-qualification-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './qualification-manager.component.html',
  styleUrls: ['./qualification-manager.component.scss']
})
export class QualificationManagerComponent implements OnInit {
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
  parentQualifications: any[] = [];
  qualifications: any[] = [];

  searchForm: FormGroup;
  qualificationForm: FormGroup;

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
    this.searchForm = this.fb.group({
      sparCat: [''],
      scat_title: ['']
    });
    this.qualificationForm = this.fb.group({
      quli_title: ['', Validators.required],
      pcat: [''],
      status: [false]
    });
  }

  ngOnInit(): void {
    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    this.loadParentQualifications();
    this.listQualifications();
  }

  loadParentQualifications(): void {
    this.commonService.loadParentQualifications().subscribe({
      next: (res) => {
        if (res && res.data && res.data.list) {
          this.parentQualifications = Object.entries(res.data.list).map(([id, name]) => ({ id, name }));
        } else {
          this.parentQualifications = [];
        }
      },
      error: () => {
        this.parentQualifications = [];
      }
    });
  }

  listQualifications(): void {

    const session = this.authService.currentUserValue;
    // console.log('Session data-1:', session);

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    this.loadingService.show('Loading...');
    this.commonService.loadQualifications({
      title: this.searchForm.controls['scat_title'].value || '',
      parentCategory: this.searchForm.controls['sparCat'].value || '',
      page: this.currentPage.toString()
    }).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res?.data?.list) {
          this.qualifications = res.data.list;
          this.totalRecords = res.data.total_records || this.qualifications.length;
          this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = res?.message || 'No data found.';
          this.qualifications = [];
          this.totalRecords = 0;
          this.totalPages = 0;
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load qualifications. Please try again.');
        this.qualifications = [];
        this.noDataMessage = 'Error loading data.';
      }
    });
  }

  onSearch(): void {
    const allEmpty = !this.searchForm.controls['scat_title'].value && !this.searchForm.controls['sparCat'].value;
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.listQualifications();
  }

  onClearSearch(): void {
    this.searchForm.reset({ sparCat: '', scat_title: '' });
    this.listQualifications();
    this.updateFloatingLabels();    
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.isEditMode = false;
    this.editId = null;
    this.qualificationForm.reset({ quli_title: '', pcat: '', status: false });
  }

  onCancelClick(): void {
    this.submitted = false;
    this.isEditMode = false;
    this.editId = null;
    this.addRecdFlg = false;
    this.listRecdFlg = true;
    this.qualificationForm.reset({ quli_title: '', pcat: '', status: false });
    this.updateFloatingLabels();
  }

  onClearClick(): void {
    this.submitted = false;
    this.qualificationForm.reset({ quli_title: '', pcat: '', status: false });
  }

  onSaveNewRecord(): void {
    this.submitted = true;
    if (this.qualificationForm.invalid) {
      this.qualificationForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'qual',
      mode: 'sv',
      InputData: [{
        quli_title: this.qualificationForm.controls['quli_title'].value,
        pcat: this.qualificationForm.controls['pcat'].value,
        status: this.qualificationForm.controls['status'].value ? '1' : '0'
      }]
    };
    this.loadingService.show('Saving...');
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Qualification saved.', 'success');
          this.onCancelClick();
          this.loadParentQualifications();
          this.listQualifications();
        } else {
          this.sweetAlert.showError(res.message || 'Failed to save qualification.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to save qualification. Please try again.');
      }
    });
  }

  onEditClick(item: any): void {
    const payload = {
      event: 'qual',
      mode: 'er',
      InputData: [{
        id: item.id,
        scat_title: this.searchForm.controls['scat_title'].value || '',
        page: this.currentPage.toString(),
        sparCat: this.searchForm.controls['sparCat'].value || ''
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        if (res && res.status === 'success' && res.data) {
          this.isEditMode = true;
          this.editId = res.data.id;
          this.addRecdFlg = true;
          this.listRecdFlg = false;
          this.qualificationForm.patchValue({
            quli_title: res.data.qualifiction || '',
            pcat: res.data.int_qul_par || '',
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
      const aliasInput = document.getElementById('categoryAlias') as HTMLInputElement;
      if (aliasInput) this.checkInput(aliasInput);
    }, 100);
  }

  onUpdateRecord(): void {
    this.submitted = true;
    if (!this.isEditMode || !this.editId) return;
    if (this.qualificationForm.invalid) {
      this.qualificationForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'qual',
      mode: 'up',
      InputData: [{
        id: this.editId,
        quli_title: this.qualificationForm.controls['quli_title'].value,
        pcat: this.qualificationForm.controls['pcat'].value,
        scat_title: this.searchForm.controls['scat_title'].value || '',
        page: this.currentPage.toString(),
        sparCat: this.searchForm.controls['sparCat'].value || '',
        status: this.qualificationForm.controls['status'].value ? '1' : '0'
      }]
    };
    this.loadingService.show('Updating...');
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (res && res.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Qualification updated.', 'success');
          this.isEditMode = false;
          this.editId = null;
          this.addRecdFlg = false;
          this.listRecdFlg = true;
          this.qualificationForm.reset({ quli_title: '', pcat: '', status: false });
          this.listQualifications();
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
      event: 'qual',
      mode: 'cs',
      InputData: [{
        qulId: Array.from(this.selectedItems),
        sparCat: this.searchForm.controls['sparCat'].value || '',
        page: this.currentPage.toString(),
        scat_title: this.searchForm.controls['scat_title'].value || ''
      }]
    };
    this.sweetAlert.confirmStatusChange('Are you sure you want to change the visibility of the selected qualifications?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (res) => {
            if (res.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Visibility updated.', 'success');
              this.selectedItems.clear();
              this.listQualifications();
            } else {
              this.sweetAlert.showError(res.message || 'Failed to update visibility');
            }
          },
          error: () => {
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
      event: 'qual',
      mode: 'dq',
      InputData: [{
        qulId: Array.from(this.selectedItems),
        sparCat: this.searchForm.controls['sparCat'].value || '',
        page: this.currentPage.toString(),
        scat_title: this.searchForm.controls['scat_title'].value || ''
      }]
    };
    this.sweetAlert.confirmDelete('Are you sure you want to delete the selected qualifications?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.post(payload).subscribe({
          next: (res) => {
            if (res.status === 'success') {
              this.sweetAlert.showToast(res.message || 'Qualifications deleted.', 'success');
              this.selectedItems.clear();
              this.listQualifications();
            } else {
              this.sweetAlert.showError(res.message || 'Failed to delete records');
            }
          },
          error: () => {
            this.sweetAlert.showError('Failed to delete qualifications. Please try again.');
          }
        });
      }
    });
  }

  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.qualifications.forEach(item => this.selectedItems.add(item.id)) : this.selectedItems.clear();
  }

  onItemSelect(itemId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.selectedItems.add(itemId) : this.selectedItems.delete(itemId);
  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
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

  public onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.listQualifications();
    }
  }

  public onJumpToPage(page?: number): void {
    const targetPage = page ?? this.jumpToPage;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.onPageChange(targetPage);
    } else {
      this.jumpToPage = this.currentPage;
    }
  }
}
