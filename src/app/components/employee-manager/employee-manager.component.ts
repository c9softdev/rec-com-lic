// 1. Imports
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { userType } from '../../app.config';
import { map } from 'rxjs/operators';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { paginationProperties } from '../../app.config';
import { CommonService } from '../../core/services/common.service';
import { AuthService } from '../../core/services/auth.service';
import { LicenseStateService } from '../../core/services/license-state.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { environment } from '../../../environments/environment';
import { GlobalSettingsService, GlobalSettings } from '../../core/services/global-settings.service';

// 2. Utility Functions
function hasSubmenuArr2(obj: any): obj is { submenuArr2: any[] } {
  return obj && Array.isArray(obj.submenuArr2);
}

@Component({
  selector: 'app-employee-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './employee-manager.component.html',
  styleUrls: ['./employee-manager.component.scss']
})
export class EmployeeManagerComponent implements OnInit {
  // 3. Public Properties
  readonly Math = Math;
  readonly Number = Number;

  // Toggle for search section
  showSearchSection = true;

  // Pagination properties
  currentPage = paginationProperties.currentPage;
  pageSize = paginationProperties.pageSize;
  totalPages = paginationProperties.totalPages;
  paginationRange: number[] = paginationProperties.paginationRange;
  jumpToPage = paginationProperties.jumpToPage;
  totalRecords = paginationProperties.totalRecords;

  searchForm: FormGroup;
  userTypes = userType;
  employees: any[] = [];
  selectedItems: Set<string> = new Set();
  addRecdFlg = false;
  listRecdFlg = true;
  isEditMode = false;
  submitted = false;
  employeeForm: FormGroup;
  accessOptionsList = ['Print Resume', 'Edit Record', 'View Resume', 'Archival File', 'Delete Record'];
  selectedMenuKeys: Set<string> = new Set();
  menuList: any[] = [];
  emailCheckMessage = '';
  usernameCheckMessage = '';
  currentEditEmployeeId = '';
  showPassword = false;
  showPasswordInTable: { [key: string]: boolean } = {};
  noDataMessage = '';

  userId: any;
  userType: any;
  emailId: any;
  editresumechk: any;
  viewresumechk: any;
  deleteOption: any;
  comp_id: any;
  superAdminID: any;
  globalSettings: any;
  employee_cnt: any;
  jobseeker_cnt: any;

  licenseData: any;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private sweetAlert: SweetAlertService,
    private commonService: CommonService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private licenseState: LicenseStateService,
    private sessionService: SessionService,
    private globalSettingsService: GlobalSettingsService
  ) {
    this.searchForm = this.fb.group({
      name: [''],
      email: [''],
      userType: ['']
    });
    this.employeeForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required], [this.emailExistsValidator()]],
      userType: ['', [Validators.required]],
      userName: ['', [Validators.required], [this.usernameExistsValidator()]],
      password: ['', [Validators.required, Validators.minLength(6), this.noWhitespaceValidator]],
      login_IP: [''],
      login_IP2: [''],
      accessOptions: [[]],
      publish: [false],
      mail: [false]
    });
  }

  // 4. Lifecycle Hooks
  ngOnInit(): void {

    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    this.globalSettingsService.getSettings$().subscribe(settings => {
      if (settings) {
        this.globalSettings = settings;
        this.employee_cnt = Number(this.globalSettings.int_employee_cnt) || 0;
        // this.jobseeker_cnt = Number(this.globalSettings.int_jobseeker_cnt) || 0;
        console.log("Countter:", this.employee_cnt);

        // 🔥 Now safe to load employees or apply settings
        // this.loadEmployees();
      }
    });

    this.fetchEmployees();
    const menuPayload = { event: 'user', mode: 'lmenu', InputData: [{}] };

    this.commonService.post(menuPayload).subscribe(res => {
      if (res && res.data && Array.isArray(res.data.assignMenuArr)) {
        this.menuList = res.data.assignMenuArr;
      }
    });

    this.licenseState.licenseData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.licenseData = data;
        console.log('License Data in Employee Manager:', this.licenseData);
      });

  }


  fetchEmployees(): void {
    const session = this.authService.currentUserValue;
    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';

    const name = this.searchForm.controls['name'].value || '';
    const email = this.searchForm.controls['email'].value || '';
    const userType = this.searchForm.controls['userType'].value || '';

    this.loadingService.show('Loading...');
    this.commonService.loadEmployees({
      name,
      email,
      userType,
      page: this.currentPage.toString()
    }).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response?.data?.list) {
          this.employees = response.data.list;
          this.totalRecords = response.data.total_records || this.employees.length;
          this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
          this.updatePaginationRange();
          this.noDataMessage = '';
        } else {
          this.noDataMessage = response?.message || 'No data found.';
          this.employees = [];
          this.totalRecords = 0;
          this.totalPages = 0;
          this.paginationRange = [];
        }
        this.loadingService.hide();
      },
      error: (error) => {
        this.sweetAlert.showError('Failed to load employees. Please try again.');
        this.employees = [];
        this.noDataMessage = 'Error loading data.';
        this.loadingService.hide();
      }
    });
  }

  // 7. Table & Pagination Actions
  onSearch(): void {
    const searchValues = this.searchForm.value;
    const allEmpty = !searchValues.name && !searchValues.email && !searchValues.userType;
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.fetchEmployees();
  }
  onClearSearch(): void {
    this.searchForm.reset();
    this.fetchEmployees();
    this.updateFloatingLabels();
  }
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchEmployees();
    }
  }
  onJumpToPage(page?: number): void {
    this.onPageChange(page ?? this.jumpToPage);
  }
  updatePaginationRange(): void {
    this.paginationRange = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // 8. Selection Actions
  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedItems = new Set(this.employees.filter(emp => emp.usrType != '1' && emp.chrType != 'Admin').map(emp => emp.id));
    } else {
      this.selectedItems.clear();
    }
  }
  onItemSelect(itemId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked ? this.selectedItems.add(itemId) : this.selectedItems.delete(itemId);
  }

  // 9. CRUD Actions
  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.isEditMode = false;
    this.currentEditEmployeeId = '';
    this.showPassword = true;
    this.clearForm();
    this.updateFloatingLabels();
  }

  onEditClick(employee: any): void {
    this.isEditMode = true;
    this.currentEditEmployeeId = employee.id;
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.submitted = false;
    this.showPassword = false;
    const payload = {
      event: 'user',
      mode: 'er',
      InputData: [{
        id: employee.id,
        semail: this.searchForm.controls['email'].value || '',
        sempname: this.searchForm.controls['name'].value || '',
        smember_type: this.searchForm.controls['userType'].value || '',
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        if (res?.data) {
          const employeeData = res.data;
          this.employeeForm.patchValue({
            fullName: employeeData.varFullName || '',
            email: employeeData.var_emaiId || '',
            userType: employeeData.chrType || '',
            userName: employeeData.var_userName || '',
            password: employeeData.var_password || '',
            login_IP: employeeData.login_IP || '',
            login_IP2: employeeData.login_IP2 || '',
            accessOptions: this.getAccessOptionsFromData(employeeData),
            publish: employeeData.chr_status === '1',
            mail: employeeData.chr_mail === '1'
          });
          this.selectedMenuKeys.clear();
          if (employeeData.menu && Array.isArray(employeeData.menu)) {
            employeeData.menu.forEach((menuId: string) => {
              if (menuId.trim()) {
                this.selectedMenuKeys.add(menuId.trim());
              }
            });
          }
          this.updateFloatingLabels();
        } else {
          this.sweetAlert.showError('Failed to load employee data.');
          this.onCancelClick();
        }
      },
      error: (err) => {
        this.sweetAlert.showError(err?.error?.message || 'Failed to load employee data.');
        this.onCancelClick();
      }
    });
  }
  onCancelClick(): void {
    this.submitted = false;
    this.isEditMode = false;
    this.currentEditEmployeeId = '';
    this.showPassword = false;
    this.showPasswordInTable = {};
    this.addRecdFlg = false;
    this.listRecdFlg = true;
    this.clearForm();
  }
  onClearClick(): void {
    this.submitted = false;
    this.clearForm();
  }
  clearForm(): void {
    this.employeeForm.reset({
      fullName: '',
      email: '',
      userType: '',
      userName: '',
      password: '',
      login_IP: '',
      login_IP2: '',
      accessOptions: [],
      publish: false,
      mail: false
    });
    this.showPassword = false;
    this.showPasswordInTable = {};
    this.updateFloatingLabels();
  }
  onSaveNewRecord(): void {
    this.submitted = true;
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill all required fields.', 'warning');
      return;
    }

    if (this.isEditMode) {
      this.updateEmployee();
    } else {
      this.saveEmployee();
    }
  }

  saveEmployee(): void {
    this.submitted = true;
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill all required fields.', 'warning');
      return;
    }

    const formValue = this.employeeForm.value;
    let accessOptions = [...formValue.accessOptions];
    const selectedMenuIds = Array.from(this.selectedMenuKeys).join(',');
    const access = (opt: string) => accessOptions.includes(opt) ? '1' : '';

    const data = {
      username: this.employeeForm.controls['userName'].value,
      first_name: this.employeeForm.controls['fullName'].value,
      password: this.employeeForm.controls['password'].value,
      member_type: this.employeeForm.controls['userType'].value,
      publish: this.employeeForm.controls['publish'].value ? '1' : '0',
      mailcheck: this.employeeForm.controls['mail'].value ? '1' : '',
      smscheck: '',
      emplcheck: '1',
      loginId: this.employeeForm.controls['login_IP'].value,
      loginId2: this.employeeForm.controls['login_IP2'].value,
      menu: selectedMenuIds,
      printresumechk: access('Print Resume'),
      editresumechk: access('Edit Record'),
      viewresumechk: access('View Resume'),
      archivalchk: access('Archival File'),
      deleteOption: access('Delete Record'),
      email: this.employeeForm.controls['email'].value
    };

    const payload = {
      event: 'user',
      mode: 'sv',
      InputData: [{ ...data }]
    };

    this.loadingService.show('Saving...');
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        console.log('Save Employee Response:', res);
        this.sweetAlert.showToast(res?.message || 'Employee saved.', 'success');
        this.onCancelClick();
        this.fetchEmployees();
      },
      error: (err) => {
        this.loadingService.hide();
        this.sweetAlert.showError(err?.error?.message || 'Failed to save employee.');
      }
    });
  }

  updateEmployee(): void {
    this.submitted = true;
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill all required fields.', 'warning');
      return;
    }

    const formValue = this.employeeForm.value;
    let accessOptions = [...formValue.accessOptions];
    const selectedMenuIds = Array.from(this.selectedMenuKeys).join(',');
    const access = (opt: string) => accessOptions.includes(opt) ? '1' : '';

    const updateData = {
      id: this.currentEditEmployeeId,
      username: this.employeeForm.controls['userName'].value,
      first_name: this.employeeForm.controls['fullName'].value,
      password: this.employeeForm.controls['password'].value,
      member_type: this.employeeForm.controls['userType'].value,
      publish: this.employeeForm.controls['publish'].value ? '1' : '0',
      mailcheck: this.employeeForm.controls['mail'].value ? '1' : '',
      smscheck: '',
      emplcheck: '1',
      loginId: this.employeeForm.controls['login_IP'].value,
      loginId2: this.employeeForm.controls['login_IP2'].value,
      menu: selectedMenuIds,
      printresumechk: access('Print Resume'),
      editresumechk: access('Edit Record'),
      viewresumechk: access('View Resume'),
      archivalchk: access('Archival File'),
      deleteOption: access('Delete Record'),
      email: this.employeeForm.controls['email'].value,
      semail: this.searchForm.controls['email'].value || '',
      sempname: this.searchForm.controls['name'].value || '',
      smember_type: this.searchForm.controls['userType'].value || '',
      page: this.currentPage.toString()
    };

    const payload = {
      event: 'user',
      mode: 'up',
      InputData: [{ ...updateData }]
    };

    this.loadingService.show('Updating...');
    this.commonService.post(payload).subscribe({
      next: (res) => {
        this.loadingService.hide();
        this.sweetAlert.showToast(res?.message || 'Employee updated successfully.', 'success');
        this.onCancelClick();
        this.fetchEmployees();
      },
      error: (err) => {
        this.loadingService.hide();
        this.sweetAlert.showError(err?.error?.message || 'Failed to update employee.');
      }
    });
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one employee to delete.', 'warning');
      return;
    }
    const message = `Are you sure you want to delete ${this.selectedItems.size} selected employee(s)? This action cannot be undone.`;
    this.sweetAlert.confirmDelete(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }
  confirmDelete(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one employee to delete.', 'warning');
      return;
    }
    const selectedUserIds = Array.from(this.selectedItems).map(id => parseInt(id));
    const payload = {
      event: 'user',
      mode: 'dr',
      InputData: [{
        userId: selectedUserIds,
        semail: this.searchForm.controls['email'].value || '',
        sempname: this.searchForm.controls['name'].value || '',
        smember_type: this.searchForm.controls['userType'].value || '',
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        const count = selectedUserIds.length;
        this.sweetAlert.showToast(
          res?.message || `${count} employee${count > 1 ? 's' : ''} deleted successfully.`,
          'success'
        );
        this.selectedItems.clear();
        this.fetchEmployees();
      },
      error: (err) => {
        this.sweetAlert.showError(err?.error?.message || 'Failed to delete employee(s).');
      }
    });

    // show global loading while deleting
    this.loadingService.show('Deleting...');
  }
  onChangeStatusClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one employee to change status.', 'warning');
      return;
    }
    const message = `Are you sure you want to change the status of ${this.selectedItems.size} selected employee(s)?`;
    this.sweetAlert.confirmStatusChange(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmChangeStatus();
      }
    });
  }
  confirmChangeStatus(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one employee to change status.', 'warning');
      return;
    }
    const selectedUserIds = Array.from(this.selectedItems).map(id => parseInt(id));
    const payload = {
      event: 'user',
      mode: 'cs',
      InputData: [{
        userId: selectedUserIds,
        sname: this.searchForm.controls['name'].value || '',
        semail: this.searchForm.controls['email'].value || '',
        smember_type: this.searchForm.controls['userType'].value || '',
        page: this.currentPage.toString()
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (res) => {
        const count = selectedUserIds.length;
        this.sweetAlert.showToast(
          res?.message || `Status updated for ${count} employee${count > 1 ? 's' : ''}.`,
          'success'
        );
        this.selectedItems.clear();
        this.fetchEmployees();
      },
      error: (err) => {
        this.sweetAlert.showError(err?.error?.message || 'Failed to update status.');
      }
    });

    this.loadingService.show('Updating...');
  }

  // 10. UI/UX Helpers
  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }
  checkInput(input: EventTarget | null): void {
    if (!input) return;
    const el = input as HTMLInputElement | HTMLSelectElement;
    if (el.value && el.value.trim() !== '') {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
  updateFloatingLabels(): void {
    setTimeout(() => {
      const inputs = document.querySelectorAll('.input-group input, .input-group select');
      inputs.forEach((el: any) => {
        if (el.value && el.value.trim() !== '') {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
    }, 0);
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  togglePasswordVisibilityInTable(employeeId: string): void {
    this.showPasswordInTable[employeeId] = !this.showPasswordInTable[employeeId];
  }

  // 11. Menu & Access Option Helpers
  onAccessOptionChange(option: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.employeeForm.get('accessOptions')?.value || [];
    if (checked) {
      this.employeeForm.get('accessOptions')?.setValue([...current, option]);
    } else {
      this.employeeForm.get('accessOptions')?.setValue(current.filter((o: string) => o !== option));
    }
    this.employeeForm.get('accessOptions')?.updateValueAndValidity();
  }
  getAllDescendantKeys(item: any): string[] {
    let keys: string[] = [];
    if (item.submenuArr && item.submenuArr.length) {
      for (const sub of item.submenuArr) {
        keys.push(sub.id);
        for (const sub2 of this.getSubmenuArr2(sub)) {
          keys.push(sub2.id);
        }
      }
    }
    for (const sub2 of this.getSubmenuArr2(item)) {
      keys.push(sub2.id);
    }
    return keys;
  }
  getAllAncestorKeys(id: string, menuList = this.menuList): string[] {
    let ancestors: string[] = [];
    const self = this;
    function find(item: any, parentKeys: string[]): boolean {
      if (item.id === id) {
        ancestors = parentKeys;
        return true;
      }
      if (item.submenuArr && item.submenuArr.length) {
        for (const sub of item.submenuArr) {
          if (find(sub, [...parentKeys, item.id])) return true;
          for (const sub2 of self.getSubmenuArr2(sub)) {
            if (find(sub2, [...parentKeys, item.id, sub.id])) return true;
          }
        }
      }
      for (const sub2 of self.getSubmenuArr2(item)) {
        if (find(sub2, [...parentKeys, item.id])) return true;
      }
      return false;
    }
    for (const item of menuList) {
      if (find(item, [])) break;
    }
    return ancestors;
  }
  onMenuCheckboxChange(item: any, checked: boolean): void {
    if (checked) {
      this.selectedMenuKeys.add(item.id);
      for (const descId of this.getAllDescendantKeys(item)) {
        this.selectedMenuKeys.add(descId);
      }
      for (const ancId of this.getAllAncestorKeys(item.id)) {
        this.selectedMenuKeys.add(ancId);
      }
    } else {
      this.selectedMenuKeys.delete(item.id);
      for (const descId of this.getAllDescendantKeys(item)) {
        this.selectedMenuKeys.delete(descId);
      }
      for (const ancId of this.getAllAncestorKeys(item.id)) {
        let stillSelected = false;
        const ancestor = this.findMenuItemById(ancId);
        if (ancestor) {
          for (const descId of this.getAllDescendantKeys(ancestor)) {
            if (this.selectedMenuKeys.has(descId)) {
              stillSelected = true;
              break;
            }
          }
        }
        if (!stillSelected) this.selectedMenuKeys.delete(ancId);
      }
    }
  }
  findMenuItemById(id: string, menuList = this.menuList): any {
    for (const item of menuList) {
      if (item.id === id) return item;
      if (item.submenuArr && item.submenuArr.length) {
        for (const sub of item.submenuArr) {
          if (sub.id === id) return sub;
          for (const sub2 of this.getSubmenuArr2(sub)) {
            if (sub2.id === id) return sub2;
          }
        }
      }
      for (const sub2 of this.getSubmenuArr2(item)) {
        if (sub2.id === id) return sub2;
      }
    }
    return null;
  }
  isMenuChecked(id: string): boolean {
    return this.selectedMenuKeys.has(id);
  }
  getSubmenuArr2(item: any): any[] {
    return item && Array.isArray(item['submenuArr2']) ? item['submenuArr2'] : [];
  }

  // 12. Async Validators
  emailExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const email = control.value;
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        this.emailCheckMessage = '';
        return Promise.resolve(null);
      }
      if (this.isEditMode && this.currentEditEmployeeId) {
        const payload = {
          event: 'user',
          mode: 'emlchkedit',
          InputData: [{ email, id: this.currentEditEmployeeId }]
        };
        return this.commonService.post(payload).pipe(
          map((res: any) => {
            if (res && res.data && res.data.exists) {
              this.emailCheckMessage = res.message || 'Email Id Already Exists.';
              return { emailExists: true };
            }
            this.emailCheckMessage = '';
            return null;
          })
        );
      }
      const payload = {
        event: 'user',
        mode: 'emlchk',
        InputData: [{ email }]
      };
      return this.commonService.post(payload).pipe(
        map((res: any) => {
          if (res && res.data && res.data.exists) {
            this.emailCheckMessage = res.message || 'Email Id Already Exists.';
            return { emailExists: true };
          }
          this.emailCheckMessage = '';
          return null;
        })
      );
    };
  }
  usernameExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const user = control.value;
      if (!user || !/^[a-zA-Z0-9_\-\.]+$/.test(user)) {
        this.usernameCheckMessage = '';
        return Promise.resolve(null);
      }
      if (this.isEditMode && this.currentEditEmployeeId) {
        const payload = {
          event: 'user',
          mode: 'usrchkedit',
          InputData: [{ user, id: this.currentEditEmployeeId }]
        };
        return this.commonService.post(payload).pipe(
          map((res: any) => {
            if (res && res.data && res.data.exists) {
              this.usernameCheckMessage = res.message || 'User Id Already Exists.';
              return { usernameExists: true };
            }
            this.usernameCheckMessage = '';
            return null;
          })
        );
      }
      const payload = {
        event: 'user',
        mode: 'usrchk',
        InputData: [{ user }]
      };
      return this.commonService.post(payload).pipe(
        map((res: any) => {
          if (res && res.data && res.data.exists) {
            this.usernameCheckMessage = res.message || 'User Id Already Exists.';
            return { usernameExists: true };
          }
          this.usernameCheckMessage = '';
          return null;
        })
      );
    };
  }
  getAccessOptionsFromData(employeeData: any): string[] {
    const accessOptions: string[] = [];
    if (employeeData.chr_mail === '1') accessOptions.push('Mail');
    if (employeeData.printresumechk === '1') accessOptions.push('Print Resume');
    if (employeeData.editresumechk === '1') accessOptions.push('Edit Record');
    if (employeeData.viewresumechk === '1') accessOptions.push('View Resume');
    if (employeeData.archivalchk === '1') accessOptions.push('Archival File');
    if (employeeData.deleteOption === '1') accessOptions.push('Delete Record');
    // if (employeeData.optionN1 === '1') accessOptions.push('Option 1');
    // if (employeeData.optionN1 === '1') accessOptions.push('Option 2');
    return accessOptions;
  }
  get selectableEmployeeCount(): number {
    return this.employees.filter(emp => emp.usrType != '1' && emp.chrType != 'Admin').length;
  }

  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return !isWhitespace ? null : { whitespace: true };
  }
}
