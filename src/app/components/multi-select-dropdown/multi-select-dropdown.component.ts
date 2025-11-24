import { Component, Input, Output, EventEmitter, OnInit, forwardRef, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface MultiSelectOption {
  id: string;
  name: string;
  group?: string;
}

@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectDropdownComponent),
      multi: true
    }
  ]
})
export class MultiSelectDropdownComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() options: MultiSelectOption[] = [];
  @Input() placeholder: string = '';
  @Input() label: string = '';
  @Input() grouped: boolean = false;
  @Input() maxHeight: string = '300px';
  @Input() alwaysActive: boolean = false;
  @Output() selectionChange = new EventEmitter<string[]>();

  selectedItems: MultiSelectOption[] = [];
  filteredOptions: MultiSelectOption[] = [];
  searchTerm = '';
  showDropdown = false;
  showSelectedDropdown = false;
  uniqueId = 'multi-select-' + Math.random().toString(36).substr(2, 9);

  private onChange: (value: string[]) => void = () => { };
  private onTouched: () => void = () => { };

  ngOnInit(): void {
    this.filteredOptions = this.options;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && changes['options'].currentValue) {
      this.filteredOptions = this.options;
      if (this.selectedItems.length > 0) {
        this.selectedItems = this.selectedItems.filter(item =>
          this.options.some(option => option.id === item.id)
        );
        this.updateValue();
      }
    }
  }

  writeValue(value: string[]): void {
    this.selectedItems = Array.isArray(value)
      ? this.options.filter(option => value.includes(option.id))
      : [];
    this.updateFilteredOptions();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void { }

  onFocus(): void {
    this.showDropdown = true;
    this.onTouched();
    this.updateFilteredOptions();
  }

  onBlur(): void {
    setTimeout(() => {
      if (!this.showSelectedDropdown) {
        this.showDropdown = false;
      }
    }, 300);
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase().trim();
    this.updateFilteredOptions();
  }

  updateFilteredOptions(): void {
    this.filteredOptions = !this.searchTerm
      ? this.options
      : this.options.filter(option =>
        option.name.toLowerCase().includes(this.searchTerm) ||
        (option.group && option.group.toLowerCase().includes(this.searchTerm))
      );
  }

  onDropdownItemClick(option: MultiSelectOption, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    setTimeout(() => this.toggleSelection(option), 10);
  }

  toggleSelection(option: MultiSelectOption): void {
    const index = this.selectedItems.findIndex(item => item.id === option.id);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(option);
    }
    this.updateValue();
  }

  removeItem(index: number): void {
    this.selectedItems.splice(index, 1);
    if (this.selectedItems.length === 0) {
      this.showSelectedDropdown = false;
    }
    this.updateValue();
  }

  isSelected(itemId: string): boolean {
    return this.selectedItems.some(item => item.id === itemId);
  }

  toggleSelectedDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showSelectedDropdown = !this.showSelectedDropdown;
    if (this.showSelectedDropdown) {
      setTimeout(() => {
        window.addEventListener('mousedown', this.closeSelectedDropdown, { once: true });
      });
    }
  }

  closeSelectedDropdown = (event: MouseEvent) => {
    const miniDropdown = document.querySelector('.selected-cities-mini-dropdown');
    if (miniDropdown && !miniDropdown.contains(event.target as Node)) {
      this.showSelectedDropdown = false;
    }
  };

  private updateValue(): void {
    const value = this.selectedItems.map(item => item.id);
    this.onChange(value);
    this.selectionChange.emit(value);
  }

  get groupedOptions(): { groupName: string; options: MultiSelectOption[] }[] {
    if (!this.grouped) return [];
    const grouped = this.filteredOptions.reduce((groups: Record<string, MultiSelectOption[]>, option) => {
      const groupName = option.group || 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(option);
      return groups;
    }, {} as Record<string, MultiSelectOption[]>);
    return Object.entries(grouped).map(([groupName, options]) => ({ groupName, options }));
  }

  get inputDisplayValue(): string {
    if (this.showDropdown) return this.searchTerm;
    if (this.selectedItems.length > 0) {
      return `${this.selectedItems.length} item${this.selectedItems.length > 1 ? 's' : ''} selected`;
    }
    return '';
  }
} 
