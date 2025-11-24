import { Component, ElementRef, Input, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SelectionService } from '../selection-process.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { PaginationComponent } from '../../pagination/pagination.component';
import { paginationProperties } from '../../../app.config';

declare var bootstrap: any;

@Component({
  selector: 'app-departure-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './departure-details-modal.html',
  styleUrls: ['./departure-details-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartureDetailsModal {
  @ViewChild('departureDetailsModal') modal!: ElementRef;

  @Input() jobseekerId: string = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId: string = '';
  @Input() projectId: string = '';

  form!: FormGroup;
  submitted = false;
  private modalInstance: any;
  loading: boolean = false;
  userId = '';
  userType = '';
  editMode: boolean = false;
  currentEditId: string = '';
  flightList: any[] = [];
  private allFlightList: any[] = [];
  totalRecords: number = 0;
  selectedIds: Set<string> = new Set();
  listLoading: boolean = false;
  isMaximized: boolean = false;

  // Pagination state
  currentPage: number = paginationProperties.currentPage;
  pageSize: number = paginationProperties.pageSize;
  totalPages: number = paginationProperties.totalPages;
  jumpToPage: number = paginationProperties.jumpToPage;
  private serverPaging: boolean = false;

  constructor(
    private fb: FormBuilder,
    private selectionService: SelectionService,
    private sweetAlert: SweetAlertService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      positionNo: [''],
      flightNo: [''],
      ticketNo: [''],
      depcity: ['', Validators.required],
      depdate: ['', Validators.required],
      depatime: ['', Validators.required],
      arricity: ['', Validators.required],
      arridate: [''],
      arrivaltime: [''],
      region: [''],
      conflightNo: [''],
    });
  }

  open() {
    this.modalInstance = new bootstrap.Modal(this.modal.nativeElement);
    this.modalInstance.show();
    this.loadFlightList();
  }

  close() {
    this.modalInstance?.hide();
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
    this.cdr.markForCheck();
  }

  // Removed legacy saveDepartureDetails method in favor of onSubmit()

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Build a specific list of missing required fields
      const labels: Record<string, string> = {
        depcity: 'Departure City',
        arricity: 'Destination City',
        depdate: 'Departure Date',
        depatime: 'Departure Time'
      };
      const requiredFields = Object.keys(labels);
      const missing = requiredFields.filter(c => this.form.get(c)?.hasError('required'))
        .map(c => labels[c]);
      const msg = missing.length
        ? `Please fill required fields: ${missing.join(', ')}.`
        : 'Please fill all required fields.';
      this.sweetAlert.showToast(msg, 'warning');
      this.cdr.markForCheck();
      return;
    }

    if (!this.projectId || !this.candidateId) {
      this.sweetAlert.showError('Missing required IDs');
      return;
    }

    const session = this.authService.currentUserValue;
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '1';

    const f = this.form.value;
    const baseInput: any = {
      prjId: this.projectId,
      candidateId: this.candidateId,
      id: this.editMode ? this.currentEditId : this.candidateId,
      chrType: this.userType,
      positionNo: f.positionNo || '',
      region: f.region || '',
      ticketNo: f.ticketNo || '',
      flightNo: f.flightNo || '',
      depcity: f.depcity || '',
      depdate: f.depdate || '',
      depatime: f.depatime || '',
      conflightNo: f.conflightNo || '',
      arricity: f.arricity || '',
      arridate: f.arridate || '',
      arrivaltime: f.arrivaltime || '',
      senttocand: f.senttocand || '',
      senttoclient: f.senttoclient || ''
    };

    const payload = this.editMode
      ? { event: 'astsk', mode: 'updFlight', InputData: [ baseInput ] }
      : { event: 'astsk', mode: 'flghshedule', InputData: [ baseInput ] };

    this.loading = true;
    this.loadingService.show(this.editMode ? 'Updating flight details...' : 'Saving flight details...');
    this.selectionService.post(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || (this.editMode ? 'Record(s) updated successfully.' : 'Information saved successfully.'), 'success');
          this.form.reset();
          this.editMode = false;
          this.currentEditId = '';
          this.loadFlightList();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to save flight details.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong while saving flight details.');
        this.cdr.markForCheck();
      }
    });
  }

  // Helpers for field-level validation UI
  isFieldInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  getValidationMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    return 'Invalid value';
  }

  loadFlightList() {
    if (!this.candidateId || !this.projectId) return;
    this.listLoading = true;
    const payload = {
      event: 'astsk',
      mode: 'flschdList',
      InputData: [ {
        id: this.candidateId,
        prjId: this.projectId,
        page: String(this.currentPage),
        pageSize: String(this.pageSize)
      } ]
    };
    this.selectionService.post(payload).subscribe({
      next: (res: any) => {
        this.listLoading = false;
        if (res?.status === 'success') {
          const serverList = res?.data?.flightList || [];
          const serverTotal = Number(res?.data?.total_records || 0);

          // Detect server-side paging support
          if (serverTotal > serverList.length && this.pageSize > 0) {
            this.serverPaging = true;
            this.flightList = serverList;
            this.totalRecords = serverTotal;
          } else {
            this.serverPaging = false;
            this.allFlightList = serverList;
            this.totalRecords = this.allFlightList.length;
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            this.flightList = this.allFlightList.slice(start, end);
          }
          this.totalPages = Math.max(1, Math.ceil(Number(this.totalRecords) / this.pageSize));
        } else {
          this.flightList = [];
          this.totalRecords = 0;
          this.totalPages = 1;
          this.serverPaging = false;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.listLoading = false;
        this.flightList = [];
        this.totalRecords = 0;
        this.totalPages = 1;
        this.serverPaging = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleSelect(reid: string, checked: boolean) {
    if (!reid) return;
    if (checked) this.selectedIds.add(reid); else this.selectedIds.delete(reid);
  }

  deleteSelected() {
    if (this.selectedIds.size === 0) {
      this.sweetAlert.showToast('Select records to delete.', 'info');
      return;
    }
    const payload = { event: 'astsk', mode: 'delFlight', InputData: [ { infoId: Array.from(this.selectedIds) } ] };
    this.loadingService.show('Deleting selected records...');
    this.selectionService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success') {
          this.sweetAlert.showToast(res.message || 'Record(s) deleted successfully.', 'success');
          this.selectedIds.clear();
          this.loadFlightList();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to delete records.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong while deleting records.');
        this.cdr.markForCheck();
      }
    });
  }

  onEditClick(reid: string) {
    if (!reid) return;
    const payload = { event: 'astsk', mode: 'edFlight', InputData: [ { id: reid } ] };
    this.loadingService.show('Fetching record...');
    this.selectionService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        if (res?.status === 'success' && res?.data?.editRec) {
          const e = res.data.editRec;
          this.editMode = true;
          this.currentEditId = String(e.recId || reid);
          this.form.patchValue({
            positionNo: e.positionNo || '',
            flightNo: e.filght_no || '',
            ticketNo: e.ticketNo || '',
            depcity: e.depart_city || '',
            depdate: this.toInputDate(e.depart_date) || '',
            depatime: e.depart_time || '',
            arricity: e.arrival_city || '',
            arridate: this.toInputDate(e.arrival_date) || '',
            arrivaltime: e.arrival_time || '',
            region: e.region || '',
            conflightNo: e.conflightNo || ''
          });
          this.cdr.markForCheck();
        } else {
          this.sweetAlert.showError(res?.message || 'Failed to fetch record.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong while fetching record.');
        this.cdr.markForCheck();
      }
    });
  }

  toInputDate(d: string | null): string {
    if (!d) return '';
    const dashMatch = /^([0-3]?\d)-([0-1]?\d)-(\d{4})$/.exec(d);
    if (dashMatch) {
      const [_, dd, mm, yyyy] = dashMatch;
      const pad = (n: string) => n.length === 1 ? '0' + n : n;
      return `${yyyy}-${pad(mm)}-${pad(dd)}`;
    }
    const date = new Date(d as string);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }

  trackByFlight(index: number, item: any) {
    return item?.reid || index;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      if (this.serverPaging) {
        this.loadFlightList();
      } else {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.flightList = this.allFlightList.slice(start, end);
        this.cdr.markForCheck();
      }
    }
  }

  onJumpToPage(page?: number): void {
    const targetPage = page ?? this.jumpToPage;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.onPageChange(targetPage);
    } else {
      this.jumpToPage = this.currentPage;
    }
  }

}
