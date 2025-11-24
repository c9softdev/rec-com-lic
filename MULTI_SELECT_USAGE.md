# Multi-Select Dropdown Component Usage Guide

## Overview
The `MultiSelectDropdownComponent` is a reusable, searchable multi-select dropdown that can be used across the application.

## Features
- ✅ Searchable dropdown with real-time filtering
- ✅ Multi-select functionality
- ✅ Grouped options support
- ✅ Badge display for selected items
- ✅ Mini-dropdown for managing selections
- ✅ Form integration (ControlValueAccessor)
- ✅ Customizable styling

## Basic Usage

### 1. Import the Component
```typescript
import { MultiSelectDropdownComponent, MultiSelectOption } from '../multi-select-dropdown/multi-select-dropdown.component';

@Component({
  imports: [MultiSelectDropdownComponent],
  // ...
})
```

### 2. Define Options
```typescript
cityOptions: MultiSelectOption[] = [
  { id: '1', name: 'Mumbai', group: 'Maharashtra' },
  { id: '2', name: 'Delhi', group: 'Delhi' },
  { id: '3', name: 'Bangalore', group: 'Karnataka' }
];
```

### 3. Use in Template
```html
<!-- Simple Usage -->
<app-multi-select-dropdown
  [options]="cityOptions"
  placeholder="Search cities..."
  label="City/State"
  formControlName="cities">
</app-multi-select-dropdown>

<!-- Grouped Options -->
<app-multi-select-dropdown
  [options]="cityOptions"
  [grouped]="true"
  placeholder="Search cities..."
  label="City/State"
  (selectionChange)="onCitySelectionChange($event)">
</app-multi-select-dropdown>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `options` | `MultiSelectOption[]` | `[]` | Array of options to display |
| `placeholder` | `string` | `'Search...'` | Placeholder text for input |
| `label` | `string` | `''` | Label for the dropdown |
| `grouped` | `boolean` | `false` | Whether to group options by group property |
| `maxHeight` | `string` | `'300px'` | Maximum height of dropdown |

## Output Events

| Event | Type | Description |
|-------|------|-------------|
| `selectionChange` | `string[]` | Emitted when selection changes (array of IDs) |

## Interface

```typescript
interface MultiSelectOption {
  id: string;        // Unique identifier
  name: string;      // Display name
  group?: string;    // Optional group for grouping
}
```

## Form Integration

The component implements `ControlValueAccessor`, so it works seamlessly with Angular Reactive Forms:

```typescript
// In component
this.form = this.fb.group({
  cities: [[]]  // Array of city IDs
});

// In template
<app-multi-select-dropdown
  [options]="cityOptions"
  formControlName="cities">
</app-multi-select-dropdown>
```

## Styling

The component uses the global CSS classes from `commonstyles.css`. You can customize the appearance by overriding these classes:

- `.searchable-dropdown` - Main container
- `.dropdown-results` - Dropdown results container
- `.selected-cities-badge` - Badge for selected items
- `.selected-cities-mini-dropdown` - Mini dropdown for selected items

## Example Implementation

### Component
```typescript
export class MyComponent {
  cityOptions: MultiSelectOption[] = [];
  
  ngOnInit() {
    // Load cities from API
    this.loadCities();
  }
  
  loadCities() {
    this.cityService.getCities().subscribe(cities => {
      this.cityOptions = cities.map(city => ({
        id: city.id,
        name: city.name,
        group: city.state
      }));
    });
  }
  
  onCitySelectionChange(selectedIds: string[]) {
    console.log('Selected cities:', selectedIds);
  }
}
```

### Template
```html
<div class="form-group">
  <app-multi-select-dropdown
    [options]="cityOptions"
    [grouped]="true"
    placeholder="Search cities..."
    label="Select Cities"
    formControlName="selectedCities"
    (selectionChange)="onCitySelectionChange($event)">
  </app-multi-select-dropdown>
</div>
```

## Migration from Custom Implementation

To migrate from the custom implementation in jobseeker-manager:

1. **Replace the custom HTML** with the reusable component
2. **Convert data format** to `MultiSelectOption[]`
3. **Update form binding** to use the new component
4. **Remove custom methods** that are now handled by the component

The reusable component provides the same functionality with better maintainability and consistency across the application. 