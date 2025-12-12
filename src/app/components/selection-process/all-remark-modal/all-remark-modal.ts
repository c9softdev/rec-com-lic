import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../../core/services/common.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { paginationProperties } from '../../../app.config';
import { LoadingService } from '../../../core/services/loading.service';
import { PaginationComponent } from '../../pagination/pagination.component';
import { SelectionProcess } from '../selection-process';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/services/session.service';

declare var bootstrap: any;

@Component({
  selector: 'app-all-remark-modal',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './all-remark-modal.html',
  styleUrls: ['./all-remark-modal.scss']
})
export class AllRemarkModal {
  @ViewChild('allRemarkModal') modal!: ElementRef;

  @Input() jobseekerId: string = '';
  @Input() jobseekerName: string = '';
  @Input() candidateId: string = '';
  @Input() projectId: string = '';
  @Input() userType: string = '';
  @Input() userId: string = '';
  @Input() parentComponent!: SelectionProcess;

  readonly Math = Math;
  readonly Number = Number;
  currentPage: number = paginationProperties.currentPage;
  pageSize: number = paginationProperties.pageSize;
  totalPages: number = paginationProperties.totalPages;
  paginationRange: number[] = paginationProperties.paginationRange;
  jumpToPage: number = paginationProperties.jumpToPage;
  totalRecords: number = 0;
  selectedItems: Set<string> = new Set();

  remarksList: any[] = [];
  isLoading: boolean = false;
  comp_id: any;
  superAdminID: any;

  private modalInstance: any;

  constructor(
    private commonService: CommonService,
    private sweetAlert: SweetAlertService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private sessionService: SessionService
  ) { }

  open() {
    this.modalInstance = new bootstrap.Modal(this.modal.nativeElement, {
      backdrop: 'static',
      keyboard: false
    });
    this.loadRemarks();
    this.modalInstance.show();
  }

  close() {
    this.modalInstance?.hide();
  }

  loadRemarks() {

    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    const session = this.authService.currentUserValue;

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';

    this.loadingService.show('Loading...');
    const payload = {
      event: 'astsk',
      mode: 'vrm',
      InputData: [
        {
          sprojrct: this.projectId,
          candidateId: this.candidateId,
          userId: this.userId,
          userType: this.userType,
          page: this.currentPage.toString(),
          pageSize: this.pageSize.toString()
        }
      ]
    };
    // console.log("PayLoad",payload);
    // return; 
    this.commonService.post(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        // console.log("REsponse",res);
        // return;
        if (res?.status == 'success' && Array.isArray(res?.data?.listArr)) {
          // Use backend-provided page results; modal body scrolls within page
          this.remarksList = res.data.listArr;
          this.selectedItems.clear();
          this.totalRecords = res.data.total_records || res.data.listArr.length;
          this.totalPages = Math.ceil(Number(this.totalRecords) / this.pageSize);
        } else {
          this.remarksList = []; // Clear the list
          this.totalRecords = 0;
          this.totalPages = 0;
          this.sweetAlert.showToast('No remarks found.', 'info');
        }
      },
      error: (err) => {
        this.sweetAlert.showError('Failed to fetch remarks. Please try again.');
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
      this.loadRemarks();
    }
  }

  onItemSelect(itemId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const id = this.getRemarkIdByValue(itemId);
    if (!id) return;
    if (checkbox.checked) this.selectedItems.add(id);
    else this.selectedItems.delete(id);
  }

  onSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.remarksList.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
  }

  onDeleteClick() {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to Remove', 'warning');
      return;
    }
    const count = this.selectedItems.size;
    const message = count === 1
      ? 'Are you sure you want to Remove this Record? This action cannot be undone.'
      : `Are you sure you want to Remove ${count} Record(s)? This action cannot be undone.`;

    const isDeletingAllOnPage = this.selectedItems.size === this.remarksList.length;

    if (isDeletingAllOnPage) {
      // Ask twice when deleting all items on the current page
      this.sweetAlert.confirmDelete(message).then((first: any) => {
        if (first.isConfirmed) {
          this.sweetAlert
            .confirmDelete('This will remove all items on this page. Are you absolutely sure?')
            .then((second: any) => {
              if (second.isConfirmed) {
                this.confirmDelete();
              }
            });
        }
      });
    } else {
      this.sweetAlert.confirmDelete(message).then((result: any) => {
        if (result.isConfirmed) {
          this.confirmDelete();
        }
      });
    }
  }

  private confirmDelete() {

    const sprojrct = this.projectId;
    const idsToDelete = Array.from(this.selectedItems);
    this.loadingService.show('Removing...');

    const payload = {
      event: 'client',
      mode: 'rdel',
      InputData: [
        {
          userId: idsToDelete,
          sprojrct: sprojrct,
          page: this.currentPage
        }
      ]
    };
    // console.log('Payload for deletion:', payload);
    //     return
    this.commonService.post(payload)
      .subscribe({

        next: (response: any) => {
          this.loadingService.hide();

          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message || 'CVs have been Removed now.', 'success');
            this.selectedItems.clear();
            this.loadRemarks();
            this.parentComponent.loadAllDropdownData?.();
            this.parentComponent.loadAllSelectionCV?.();

          } else {
            this.sweetAlert.showError(response.message || 'Failed to Remove records');
          }
        },
        error: () => {
          this.loadingService.hide();
          this.sweetAlert.showError('Failed to Remove Record. Please try again.');
        }
      });
    this.loadingService.show('Removing...');
  }

  isMaximized = false;
  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  // Ensure consistent ID handling between API shapes
  getRemarkId(item: any): string {
    if (!item) return '';
    const raw = item.reid ?? item.id ?? item.recId ?? item.sno ?? '';
    return raw !== undefined && raw !== null ? String(raw) : '';
  }

  private getRemarkIdByValue(val: string | number): string {
    if (val === undefined || val === null) return '';
    return String(val);
  }
}