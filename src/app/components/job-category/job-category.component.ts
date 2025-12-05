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
  selector: 'app-job-category',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './job-category.component.html',
  styleUrls: ['./job-category.component.scss']
})
export class JobCategoryComponent implements OnInit {
  readonly Math = Math;
  readonly Number = Number;

  addRecdFlg: boolean = false;
  listRecdFlg: boolean = true;
  jobCategories: any[] = [];
  totalRecords: string = '0';
  showSearchSection: boolean = true;
  currentPage: number = paginationProperties.currentPage;
  pageSize: number = paginationProperties.pageSize;
  totalPages: number = paginationProperties.totalPages;
  paginationRange: number[] = paginationProperties.paginationRange;
  jumpToPage: number = paginationProperties.jumpToPage;
  parentCategories: any[] = [];
  subCategories: any[] = [];
  noDataMessage: string = '';
  jobCategoryForm!: FormGroup;
  searchForm!: FormGroup;
  selectedItems: Set<string> = new Set();
  isEditMode: boolean = false;
  editId: string | null = null;
  submitted: boolean = false;

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
    this.jobCategoryForm = this.fb.group({
      categoryTitle: ['', Validators.required],
      categoryAlias: ['', Validators.required],
      selectedParentCategory: ['', Validators.required],
      selectedParentSubCategory: [''],
      categoryDescription: [''],
      publish: [false]
    });
    this.searchForm = this.fb.group({
      parentCategorySearch: [''],
      subCategorySearch: [''],
      categoryTitleSearch: [''],
      sortSearch: ['']
    });
  }

  ngOnInit(): void {
    // const session = this.authService.currentUserValue;
    // const sess = this.sessionService.getSession();
    // console.log('Session:', sess);

    // this.comp_id = session?.comp_id || '';
    this.superAdminID = environment.superAdminID;
    const sess = this.sessionService.getSession();
    this.comp_id = sess?.comp_id || '';

    this.loadParentCategories();
    this.loadJobCategories();
  }

  loadJobCategories(): void {

    const session = this.authService.currentUserValue;
    
    // console.log('Session data-1:', sess);

    this.userId = session?.userId || '0';
    this.userType = session?.empType || '0';
    this.emailId = session?.emailId || '';
    this.editresumechk = session?.editresumechk || '';
    this.deleteOption = session?.deleteOption || '';


    this.loadingService.show('Loading...');
    const payload = {
      event: 'jcat',
      mode: 'lc',
      InputData: [
        {
          scat_title: this.searchForm.controls['categoryTitleSearch'].value || '',
          page: this.currentPage.toString(),
          sparCat: this.searchForm.controls['parentCategorySearch'].value || '',
          ssubCat: this.searchForm.controls['subCategorySearch'].value || '',
          orderOn: 'var_title',
          orderBy: ''
        }
      ]
    };
    this.commonService.post(payload).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response?.data?.list) {
          this.jobCategories = response.data.list;
          this.totalRecords = response.data.total_records?.toString() || '0';
          this.totalPages = Math.ceil(Number(this.totalRecords) / this.pageSize);
          this.noDataMessage = '';
        } else {
          this.noDataMessage = response?.message || 'No data found.';
          this.sweetAlert.showToast('No job categories found.', 'info');
          this.jobCategories = [];
          this.totalRecords = '0';
          this.totalPages = 0;
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to load job categories. Please try again.');
        this.jobCategories = [];
        this.totalRecords = '0';
        this.totalPages = 0;
      }
    });
  }

  // loadParentCategories(): void {
  //   const payload = {
  //     event: 'jcat',
  //     mode: 'pcat',
  //     InputData: [
  //       { catId: '' }
  //     ]
  //   };
  //   this.commonService.post(payload).subscribe({
  //     next: (response) => {
  //       if (response && response.status === 'success' && response.data) {
  //         this.parentCategories = Object.entries(response.data).map(([catId, catName]) => ({
  //           catId: catId,
  //           catName: catName
  //         }));
  //       } else {
  //         this.sweetAlert.showError(response.message || 'Failed to fetch parent categories.');
  //       }
  //     },
  //     error: () => {
  //       this.sweetAlert.showError('Failed to fetch parent categories. Please try again.');
  //     }
  //   });
  // }

  // onParentCategoryChange(event: Event): void {
  //   const selectElm = event.target as HTMLSelectElement;
  //   const selectedCatId = selectElm.value;
  //   const isSearchDropdown = (selectElm.id === 'parentCategorySearch');
  //   if (isSearchDropdown) {
  //     this.searchForm.controls['parentCategorySearch'].setValue(selectedCatId);
  //     this.searchForm.controls['subCategorySearch'].setValue('');
  //   } else {
  //     this.jobCategoryForm.controls['selectedParentCategory'].setValue(selectedCatId);
  //     this.jobCategoryForm.controls['selectedParentSubCategory'].setValue('');
  //   }
  //   this.subCategories = [];
  //   if (selectedCatId) {
  //     const payload = {
  //       event: 'jcat',
  //       mode: 'subc',
  //       InputData: [
  //         { catId: selectedCatId }
  //       ]
  //     };
  //     this.commonService.post(payload).subscribe({
  //       next: (response) => {
  //         if (response && response.status === 'success' && response.data) {
  //           this.subCategories = Object.entries(response.data).map(([subCatId, subCatName]) => ({ subCatId, subCatName }));
  //         } else {
  //           this.sweetAlert.showError((response?.message) || 'Failed to fetch sub categories.');
  //         }
  //       },
  //       error: () => {
  //         this.sweetAlert.showError('Failed to fetch sub categories. Please try again.');
  //       }
  //     });
  //   }
  // }
  loadParentCategories(): void {
    this.commonService.loadParentCategories().subscribe({
      next: (response) => {
        if (response && response.status === 'success' && response.data) {
          this.parentCategories = Object.entries(response.data).map(([catId, catName]) => ({
            catId: catId,
            catName: catName
          }));
        } else {
          this.sweetAlert.showError(response.message || 'Failed to fetch parent categories.');
        }
      },
      error: () => {
        this.sweetAlert.showError('Failed to fetch parent categories. Please try again.');
      }
    });
  }


  onParentCategoryChange(event: Event): void {
    const selectElm = event.target as HTMLSelectElement;
    const selectedCatId = selectElm.value;
    const isSearchDropdown = (selectElm.id === 'parentCategorySearch');
    if (isSearchDropdown) {
      this.searchForm.controls['parentCategorySearch'].setValue(selectedCatId);
      this.searchForm.controls['subCategorySearch'].setValue('');
    } else {
      this.jobCategoryForm.controls['selectedParentCategory'].setValue(selectedCatId);
      this.jobCategoryForm.controls['selectedParentSubCategory'].setValue('');
    }
    this.subCategories = [];
    if (selectedCatId) {
      this.commonService.loadSubCategories(selectedCatId).subscribe({
        next: (response) => {
          if (response && response.status === 'success' && response.data) {
            this.subCategories = Object.entries(response.data).map(([subCatId, subCatName]) => ({ subCatId, subCatName }));
          } else {
            this.sweetAlert.showError((response?.message) || 'Failed to fetch sub categories.');
          }
        },
        error: () => {
          this.sweetAlert.showError('Failed to fetch sub categories. Please try again.');
        }
      });
    }
  }

  onShowAddForm(): void {
    this.listRecdFlg = false;
    this.addRecdFlg = true;
    this.clearForm();
    this.updateFloatingLabels();
  }

  CreatAlias(event: Event) {
    const input = event.target as HTMLInputElement;
    const txtValue = input?.value || '';
    var txtlowercase = txtValue.toLowerCase();
    var txtlowercase2 = txtlowercase.replace(/[&\/\\#,+()$~%.''`'"'""*?<>{}]/g, '');
    var txtlowercase3 = txtlowercase2.replace(/([\x00-\x7F]|[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3})|./g, "$1")
    var alias = txtlowercase3.replace(/\s+/g, '-');
    if (alias.trim() != '') {
      this.jobCategoryForm.controls['categoryAlias'].setValue(alias);
      setTimeout(() => {
        const aliasInput = document.getElementById('categoryAlias') as HTMLInputElement;
        if (aliasInput) this.checkInput(aliasInput);
      }, 0);
    }
    this.checkInput(input);
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

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.checkInput(select);
    this.onParentCategoryChange(event);
  }

  onSaveNewRecord(): void {
    this.submitted = true;
    if (this.jobCategoryForm.invalid) {
      this.jobCategoryForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'jcat',
      mode: 'sc',
      InputData: [{
        cat_title: this.jobCategoryForm.controls['categoryTitle'].value,
        pcat: this.jobCategoryForm.controls['selectedParentCategory'].value,
        spcat: this.jobCategoryForm.controls['selectedParentSubCategory'].value,
        cat_sdesc: this.jobCategoryForm.controls['categoryDescription'].value,
        cat_desc: '',
        publish: this.jobCategoryForm.controls['publish'].value ? '1' : '0',
        aliasVal: this.jobCategoryForm.controls['categoryAlias'].value
      }]
    };
    this.loadingService.show('Saving...');
    this.commonService.post(payload)
      .subscribe({
        next: (response: any) => {
          this.loadingService.hide();
          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message || 'Job category saved.', 'success');
            this.onCancelClick();
            this.loadJobCategories();
          } else {
            this.sweetAlert.showError(response.message || 'Failed to save job category.');
          }
        },
        error: () => {
          this.loadingService.hide();
          this.sweetAlert.showError('Failed to save job category. Please try again.');
        }
      });
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

  clearForm(): void {
    this.jobCategoryForm.reset({
      categoryTitle: '',
      categoryAlias: '',
      selectedParentCategory: '',
      selectedParentSubCategory: '',
      categoryDescription: '',
      publish: false
    });
    this.subCategories = [];
    this.updateFloatingLabels();
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
      this.loadJobCategories();
    }
  }

  onItemSelect(itemId: string, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
  }

  onSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.jobCategories.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
  }

  onDeleteClick() {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to delete', 'warning');
      return;
    }
    const count = this.selectedItems.size;
    const message = count === 1
      ? 'Are you sure you want to delete this category? This action cannot be undone.'
      : `Are you sure you want to delete ${count} categories? This action cannot be undone.`;
    this.sweetAlert.confirmDelete(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }

  private confirmDelete() {
    const idsToDelete = Array.from(this.selectedItems);
    const payload = {
      event: 'jcat',
      mode: 'dc',
      InputData: [
        {
          catId: idsToDelete,
          page: this.currentPage.toString(),
          scat_title: this.searchForm.controls['categoryTitleSearch'].value || '',
          sparCat: this.searchForm.controls['parentCategorySearch'].value || '',
          ssubCat: this.searchForm.controls['subCategorySearch'].value || ''
        }
      ]
    };
    this.commonService.post(payload)
      .subscribe({
        next: (response: any) => {
          this.loadingService.hide();
          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message || 'Job categories deleted.', 'success');
            this.selectedItems.clear();
            this.loadJobCategories();
          } else {
            this.sweetAlert.showError(response.message || 'Failed to delete records');
          }
        },
        error: () => {
          this.loadingService.hide();
          this.sweetAlert.showError('Failed to delete job categories. Please try again.');
        }
      });
    this.loadingService.show('Deleting...');
  }

  onSearch(): void {
    const searchValues = this.searchForm.value;
    const allEmpty = !searchValues.categoryTitleSearch && !searchValues.parentCategorySearch && !searchValues.subCategorySearch;
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.loadJobCategories();
    this.updateFloatingLabels();
  }

  onClearSearch(): void {
    this.searchForm.reset({
      parentCategorySearch: '',
      subCategorySearch: '',
      categoryTitleSearch: '',
      sortSearch: ''
    });
    this.subCategories = [];
    setTimeout(() => {
      const searchInputs = document.querySelectorAll('#parentCategorySearch, #subCategorySearch, #categoryTitleSearch');
      searchInputs.forEach((input: Element) => {
        input.classList.remove('active');
      });
    }, 0);
    this.updateFloatingLabels();

    this.loadJobCategories();
  }

  onEditClick(item: any): void {
    const payload = {
      event: 'jcat',
      mode: 'ec',
      InputData: [
        {
          id: item.id,
          page: this.currentPage.toString(),
          sparCat: this.searchForm.controls['parentCategorySearch'].value,
          ssubCat: this.searchForm.controls['subCategorySearch'].value,
          scat_title: this.searchForm.controls['categoryTitleSearch'].value,
          orderOn: 'publish'
        }
      ]
    };
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        if (response && response.status === 'success' && response.data) {
          this.isEditMode = true;
          this.editId = response.data.id;
          this.addRecdFlg = true;
          this.listRecdFlg = false;
          this.jobCategoryForm.patchValue({
            categoryTitle: response.data.var_title || '',
            categoryAlias: response.data.var_alias || '',
            selectedParentCategory: response.data.int_cat_par || '',
            selectedParentSubCategory: response.data.int_cat_sub_par || '',
            categoryDescription: response.data.var_sdesc || '',
            publish: response.data.chr_status === '1'
          });
          if (response.data.int_cat_par) {
            const subPayload = {
              event: 'jcat',
              mode: 'subc',
              InputData: [
                { catId: response.data.int_cat_par }
              ]
            };
            this.commonService.post(subPayload).subscribe({
              next: (subRes) => {
                if (subRes && subRes.status === 'success' && subRes.data) {
                  this.subCategories = Object.entries(subRes.data).map(([subCatId, subCatName]) => ({ subCatId, subCatName }));
                  setTimeout(() => this.updateFloatingLabels(), 0);
                }
              }
            });
          }
          this.updateFloatingLabels();
        } else {
          this.sweetAlert.showError(response?.message || 'Failed to fetch record for editing.');
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
    if (this.jobCategoryForm.invalid) {
      this.jobCategoryForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'jcat',
      mode: 'up',
      InputData: [{
        id: this.editId,
        cat_title: this.jobCategoryForm.controls['categoryTitle'].value,
        pcat: this.jobCategoryForm.controls['selectedParentCategory'].value,
        spcat: this.jobCategoryForm.controls['selectedParentSubCategory'].value,
        cat_sdesc: this.jobCategoryForm.controls['categoryDescription'].value,
        cat_desc: '',
        publish: this.jobCategoryForm.controls['publish'].value ? '1' : '0',
        aliasVal: this.jobCategoryForm.controls['categoryAlias'].value,
        page: this.currentPage.toString(),
        scat_title: this.searchForm.controls['categoryTitleSearch'].value,
        orderOn: 'publish',
        sparCat: this.searchForm.controls['parentCategorySearch'].value,
        ssubCat: this.searchForm.controls['subCategorySearch'].value
      }]
    };
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        if (response && response.status === 'success') {
          this.sweetAlert.showToast(response.message || 'Job category updated.', 'success');
          this.isEditMode = false;
          this.editId = null;
          this.addRecdFlg = false;
          this.listRecdFlg = true;
          this.jobCategoryForm.reset();
          this.loadJobCategories();
        } else {
          this.sweetAlert.showError(response?.message || 'Failed to update record.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to update record. Please try again.');
      }
    });

    // show loading while updating
    this.loadingService.show('Updating...');
  }

  // Change Visibility Modal properties
  onChangeVisibilityClick() {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to change visibility', 'warning');
      return;
    }
    const count = this.selectedItems.size;
    const message = count === 1
      ? 'Are you sure you want to change the visibility of this category?'
      : `Are you sure you want to change the visibility of ${count} categories?`;
    this.sweetAlert.confirmStatusChange(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmChangeVisibility();
      }
    });
  }

  private confirmChangeVisibility() {
    const idsToChange = Array.from(this.selectedItems);

    // Create payload according to the specified format
    const payload = {
      event: 'jcat',
      mode: 'cs',
      InputData: [
        {
          catId: idsToChange,
          page: this.currentPage.toString(),
          scat_title: this.searchForm.get('categoryTitleSearch')?.value || '',
          orderOn: 'publish',
          sparCat: this.searchForm.get('parentCategorySearch')?.value || '',
          ssubCat: this.searchForm.value.subCategorySearch || ''
        }
      ]
    };

    this.commonService.post(payload)
      .subscribe({
        next: (response: any) => {
          this.loadingService.hide();
          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message || 'Visibility updated.', 'success');
            this.selectedItems.clear();
            this.loadJobCategories(
            );
          } else {
            this.sweetAlert.showError(response.message || 'Failed to update visibility');
          }
        },
        error: (error) => {
          this.loadingService.hide();
          this.sweetAlert.showError('Failed to change visibility of job categories. Please try again.');
        }
      });
    this.loadingService.show('Updating...');
  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }
}