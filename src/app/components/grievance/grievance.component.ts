import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-grievance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PaginationComponent],
  templateUrl: './grievance.component.html',
  styleUrl: './grievance.component.scss'
})
export class GrievanceComponent {
  readonly Math = Math;
  readonly Number = Number;

  showSearchSection: boolean = true;
  searchForm!: FormGroup;

  currentPage: number = paginationProperties.currentPage;
  pageSize: number = paginationProperties.pageSize;
  totalPages: number = paginationProperties.totalPages;
  paginationRange: number[] = paginationProperties.paginationRange;
  jumpToPage: number = paginationProperties.jumpToPage;
  totalRecords: number = paginationProperties.totalRecords;

  selectedItems: Set<string> = new Set();
  grievances: any[] = [];
  noDataMessage: string = '';

  // Modal state for view
  viewModalOpen: boolean = false;
  viewGrievance: any = null;
  isMaximized: boolean = false;

  // Modal state for reply
  replyModalOpen: boolean = false;
  replyForm!: FormGroup;
  replySubmitted: boolean = false;

  addRecdFlg: boolean = false;
  listRecdFlg: boolean = true;
  isEditMode: boolean = false;
  submitted: boolean = false;
  replyId: string = '';

  userId: any;
  userType: any;
  emailId: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;

  @ViewChild('viewModal') viewModalRef!: ElementRef<HTMLDivElement>;

  constructor(
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.initSearchForm();
    this.initReplyForm();
    this.loadGrievances();
  }

  private initSearchForm(): void {
    this.searchForm = new FormGroup({
      stitle: new FormControl(''),
      semail: new FormControl(''),
      spassport: new FormControl('')
    });
  }

  private initReplyForm(): void {
    this.replyForm = new FormGroup({
      emailTo: new FormControl('', [Validators.required, Validators.email]),
      emailcc: new FormControl(''),
      emaildesc: new FormControl('', Validators.required)
    });
  }

  onSearch(): void {
    const searchValues = this.searchForm.value;
    const allEmpty = !searchValues.stitle && !searchValues.semail && !searchValues.spassport;
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.loadGrievances();
  }

  onClearSearch(): void {
    this.searchForm.reset({ stitle: '', semail: '', spassport: '' });
    this.loadGrievances();
    this.updateFloatingLabels();
  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }

  onSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.grievances.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
  }

  onItemSelect(itemId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
  }

  toggleMaximize(): void {
    this.isMaximized = !this.isMaximized;
  }

  onViewClick(item: any): void {
    const payload = {
      event: 'grav',
      mode: 'vr',
      InputData: [{ id: item.id }]
    };
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        if (response?.status === 'success' && response.data) {
          const data = response.data.list;
          this.viewGrievance = {
            name: data.first_name || '',
            passportNo: data.var_passport || '',
            contactNo: data.var_contact_no || '',
            employerName: data.employername || '',
            gender: data.gender || '',
            position: data.position || '',
            eqamaNo: data.var_eqama_no || '',
            countryOfDeployment: data.country_of_deployment || '',
            complaint: data.complaint || '',
            photo: data.photo || ''
          };
          this.viewModalOpen = true;
          this.isMaximized = false;
          setTimeout(() => {
            if (this.viewModalRef) {
              this.viewModalRef.nativeElement.focus();
            }
          });
        } else {
          this.sweetAlert.showError(response?.message || 'Failed to retrieve grievance data.');
        }
      },
      error: (error: any) => {
        this.sweetAlert.showError('Error retrieving grievance data.');
      }
    });
  }

  closeViewModal(): void {
    this.viewModalOpen = false;
    this.viewGrievance = null;
  }

  onReplyClick(item: any): void {
    this.replyForm.reset({ emailTo: item.email, emailcc: '', emaildesc: '' });
    this.addRecdFlg = true;
    this.listRecdFlg = false;
    this.isEditMode = false;
    this.submitted = false;
    this.replyId = item.id;
    this.updateFloatingLabels();
  }

  closeReplyModal(): void {
    this.replyModalOpen = false;
  }

  onSendReply(): void {
    this.submitted = true;
    if (this.replyForm.invalid) {
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const { emailTo, emailcc, emaildesc } = this.replyForm.value;
    const payload = {
      event: 'grav',
      mode: 'replS',
      InputData: [
        {
          id: this.replyId || '',
          emailTo,
          emaildesc,
          emailcc
        }
      ]
    };
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        if (response?.status === 'success') {
          this.sweetAlert.showToast(response.message, 'success');
          this.onCancelClick();
        } else {
          this.sweetAlert.showError(response?.message || 'Failed to send reply.');
        }
      },
      error: (error: any) => {
        this.sweetAlert.showError('Error sending reply.');
      }
    });
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one record to delete.', 'warning');
      return;
    }
    const selectedIds = Array.from(this.selectedItems);
    const payload = {
      event: 'grav',
      mode: 'dr',
      InputData: [
        {
          catId: selectedIds.map(id => Number(id)),
          stitle: this.searchForm.get('stitle')?.value || '',
          semail: this.searchForm.get('semail')?.value || '',
          spassport: this.searchForm.get('spassport')?.value || '',
          page: this.currentPage.toString()
        }
      ]
    };
    this.sweetAlert.confirmStatusChange('Are you sure you want to delete the selected records?').then((result: any) => {
      if (result.isConfirmed) {
        this.loadingService.show('Deleting...');
        this.commonService.post(payload).subscribe({
          next: (response: any) => {
            this.loadingService.hide();
            if (response.status === 'success') {
              this.sweetAlert.showToast(response.message, 'success');
              this.selectedItems.clear();
              this.loadGrievances();
            } else {
              this.sweetAlert.showError(response.message);
            }
          },
          error: (error: any) => {
            this.loadingService.hide();
            this.sweetAlert.showError('Failed to delete records. Please try again.');
          }
        });
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadGrievances();
  }

  onJumpToPage(page?: number): void {
    if (page) this.currentPage = page;
    this.loadGrievances();
  }

  private loadGrievances(): void {

    const session = this.authService.currentUserValue;
    // console.log('Session data-1:', session);

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    // this.loadingService.show('Loading jobseekers...');
    const { stitle, semail, spassport } = this.searchForm.value;
    this.loadingService.show('Loading...');
    const payload =
     {
      event: 'grav',
      mode: 'lr',
      InputData: [
        {
          stitle: stitle || '',
          semail: semail || '',
          spassport: spassport || '',
          page: this.currentPage.toString()
        }
      ]
    };
    this.commonService.post(payload).subscribe({
      // this.loadingService.hide(); 
      next: (response: any) => {
        this.loadingService.hide(); 
        if (response?.status === 'success' && response.data) {
          this.grievances = response.data.list || [];
          this.totalRecords = Number(response.data.total_records) || 0;
          this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = response?.message || 'No data found.';
          this.grievances = [];
          this.totalRecords = 0;
        }
      },
      error: (error: any) => {
        this.noDataMessage = 'Error loading data.';
        this.grievances = [];
        this.totalRecords = 0;
      }
    });
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.isEditMode = false;
    this.clearReplyForm();
    this.updateFloatingLabels();
  }

  onCancelClick(): void {
    this.addRecdFlg = false;
    this.listRecdFlg = true;
    this.isEditMode = false;
    this.submitted = false;
    this.clearReplyForm();
  }

  clearReplyForm(): void {
    this.replyForm.reset({ emailTo: '', emailcc: '', emaildesc: '' });
    this.updateFloatingLabels();
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
}
