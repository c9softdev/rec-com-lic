import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { paginationProperties } from '../../app.config';
import { PaginationComponent } from '../pagination/pagination.component';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { LoadingService } from '../../core/services/loading.service';
import { CommonService } from '../../core/services/common.service';

@Component({
  selector: 'app-city-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './city-management.component.html',
  styleUrls: ['./city-management.component.scss']
})
export class CityManagementComponent implements OnInit {
  readonly Number = Number;

  cities: any[] = [];
  States: any[] = [];
  selectedItems: Set<string> = new Set();
  noDataMessage = '';
  showSearchSection = true;
  currentPage = paginationProperties.currentPage;
  pageSize = paginationProperties.pageSize;
  totalPages = paginationProperties.totalPages;
  jumpToPage = paginationProperties.jumpToPage;
  totalRecords = '0';
  CityForm!: FormGroup;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private sweetAlert: SweetAlertService,
    private loadingService: LoadingService
  ) {
    this.CityForm = this.fb.group({
      cityName: [''],
      stateName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCities();
  }

  loadCities(): void {
    this.loadingService.show('Loading...');
    const payload = {
      event: 'city',
      mode: 'lc',
      InputData: [{
        page: this.currentPage.toString(),
        cityName: this.CityForm.get('cityName')?.value || '',
        stateName: this.CityForm.get('stateName')?.value || ''
      }]
    };

    this.commonService.post(payload).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response?.status === 'success') {
          // Update states list
          if (response.data?.state) {
            this.States = Object.entries(response.data.state).map(([id, name]) => ({
              id,
              name
            }));
          }

          // Update cities list
          this.cities = response.data?.list || [];
          this.totalRecords = response.data?.total_records?.toString() || '0';
          this.totalPages = Math.ceil(Number(this.totalRecords) / 50);
          this.noDataMessage = this.cities.length === 0 ? 'No cities found' : '';
        } else {
          this.noDataMessage = response?.message || 'No data found';
          this.sweetAlert.showToast('No cities found.', 'info');
          this.cities = [];
          // this.States = [];
          this.totalRecords = '0';
          this.totalPages = 0;
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.sweetAlert.showError(error?.message || 'Failed to load data. Please try again.');
        this.cities = [];
        this.States = [];
        this.totalRecords = '0';
        this.totalPages = 0;
        this.noDataMessage = 'Failed to load data';
      }
    });
  }

  // loadData(): void {
  //   const cityName = this.CityForm.get('cityName')?.value || '';
  //   const stateName = this.CityForm.get('stateName')?.value || '';
    
  //   // this.loadingService.show('Loading...');
  //   this.commonService.loadCitiesAndStates(
  //     this.currentPage.toString(),
  //     cityName,
  //     stateName
  //   ).subscribe({
  //     next: (data) => {
  //       console.log('Loaded data:', data);
  //       // this.loadingService.hide();
  //       this.States = data.states;
  //       this.cities = data.cities;
  //       this.totalRecords = String(data.totalRecords);
  //       // Calculate total pages (assuming 50 items per page from the sample response)
  //       this.totalPages = Math.ceil(data.totalRecords / 50);
  //       this.noDataMessage = this.cities.length === 0 ? 'No cities found' : '';
  //     },
  //     error: (error) => {
  //       // this.loadingService.hide();
  //       this.sweetAlert.showError(error?.message || 'Failed to load data. Please try again.');
  //       this.cities = [];
  //       this.States = [];
  //       this.totalRecords = '0';
  //       this.totalPages = 0;
  //       this.noDataMessage = 'Failed to load data';
  //     }
  //   });
  // }

  onSaveCity(): void {
    this.submitted = true;
    if (this.CityForm.invalid) {
      this.CityForm.markAllAsTouched();
      this.sweetAlert.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const payload = {
      event: 'city',
      mode: 'sv',
      InputData: [{
        cityName: this.CityForm.controls['cityName'].value || '',
        stateName: this.CityForm.controls['stateName'].value || ''
      }]
    };
    this.loadingService.show('Saving...');
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        if (response.status === 'success') {
          this.sweetAlert.showToast(response.message || 'City saved successfully.', 'success');
          this.CityForm.controls['cityName'].reset();
          this.loadCities();
        } else {
          this.sweetAlert.showError(response.message || 'Failed to save City.');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to save City. Please try again.');
      }
    });
  }

  onSearch(): void {
    const searchValues = this.CityForm.value;
    const allEmpty = !searchValues.cityName && !searchValues.stateName;
    if (allEmpty) {
      this.sweetAlert.showToast('Please enter/select a search criteria', 'warning');
    }
    this.currentPage = 1;
    this.loadCities();
  }

  onClearSearch(): void {
    this.submitted = false;
    this.CityForm.reset();
    this.currentPage = 1;
    this.loadCities();
  }

  onDeleteClick(): void {
    if (this.selectedItems.size === 0) {
      this.sweetAlert.showToast('Please select at least one item to delete', 'warning');
      return;
    }
    const count = this.selectedItems.size;
    const message = count === 1
      ? 'Are you sure you want to delete this city? This action cannot be undone.'
      : `Are you sure you want to delete ${count} cities? This action cannot be undone.`;
    this.sweetAlert.confirmDelete(message).then((result: any) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }

  private confirmDelete(): void {
    const payload = {
      event: 'city',
      mode: 'dc',
      InputData: [{
        catId: Array.from(this.selectedItems),
        page: this.currentPage.toString(),
        cityName: this.CityForm.controls['cityName'].value || '',
        stateName: this.CityForm.controls['stateName'].value || ''
      }]
    };
    this.loadingService.show('Deleting...');
    this.commonService.post(payload).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        if (response.status === 'success') {
          this.sweetAlert.showToast(response.message || 'Cities deleted successfully.', 'success');
          this.selectedItems.clear();
          this.loadCities();
        } else {
          this.sweetAlert.showError(response.message || 'Failed to delete records');
        }
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to delete cities. Please try again.');
      }
    });
  }

  onSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.cities.forEach(item => this.selectedItems.add(item.id));
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

  checkInput(input: EventTarget | null): void {
    if (!input) return;
    const element = input as HTMLInputElement | HTMLSelectElement;
    if (element.value.length > 0) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
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

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadCities();
    }
  }

  toggleSearchSection(): void {
    this.showSearchSection = !this.showSearchSection;
  }
}
