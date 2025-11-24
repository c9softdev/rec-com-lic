# Global Settings Service Usage

## Overview

The Global Settings Service has been updated to work with your API structure at `https://c9soft.com/api/rec/portal/`. It automatically loads theme colors and other global settings from the API and applies them throughout the application.

## API Structure

### Request Format
```json
{
  "event": "msp",
  "mode": "gloConfig",
  "InputData": [
    {
      "sec_key": "Bw5EDNlJgDEH0wRBiNguSis3aGlOb29BeVFMSmYrcU5kR01jdGc9PQ=="
    }
  ]
}
```

### Response Format
```json
{
  "status": "success",
  "message": "Record(s) Listed Successfully.",
  "data": {
    "setting_id": "1",
    "display_errors": "1",
    "app_root_path": "NA",
    "app_root_url": "",
    "site_name": "C9 Softwares and Solutions",
    "site_com": "",
    "img_size": "1572864",
    "user_paging": "12",
    "email_to": "admin@c9soft.com",
    "admin_paging": "50",
    "email_from": "admin@c9soft.com",
    "email_bcc": "",
    "google_analytics": "",
    "footer_txt": "C9 Soft is New Delhi based Company.",
    "var_footercprgt": "C9 Softwares & Solutions",
    "var_logo_url": "",
    "var_logo_client": "",
    "var_version": "Version 1.0.1",
    "var_foot_email": "admin@c9soft.com",
    "var_primary_cc": "#5C0632",
    "var_secondary_cc": "#1572E8"
  }
}
```

## Theme Colors in Your API

The API should include these theme color fields in the `data` object:

- `var_primary_cc`: Primary theme color (hex format, e.g., "#5C0632")
- `var_secondary_cc`: Secondary color for UI elements (hex format, e.g., "#1572E8")

## Usage in Components

### 1. Import the Service
```typescript
import { GlobalSettingsService, GlobalSettings } from '../../core/services/global-settings.service';
```

### 2. Inject in Constructor
```typescript
constructor(
  private globalSettingsService: GlobalSettingsService
) {}
```

### 3. Load Settings
```typescript
ngOnInit(): void {
  this.globalSettingsService.loadGlobalSettings().subscribe({
    next: (settings) => {
      this.globalSettings = settings;
      console.log('Settings loaded:', settings);
    },
    error: (error) => {
      console.error('Failed to load settings:', error);
      // Use default settings
      this.globalSettings = this.globalSettingsService.getSettings();
    }
  });
}
```

### 4. Use in Template
```html
<!-- Site name -->
<h1>{{globalSettings?.site_name || 'Default Title'}}</h1>

<!-- Footer text -->
<p>{{globalSettings?.footer_txt}}</p>

<!-- Logo URL -->
<img *ngIf="globalSettings?.var_logo_url" [src]="globalSettings.var_logo_url" alt="Logo">

<!-- Theme-aware styling -->
<div class="card" [style.border-color]="globalSettings?.var_primary_cc">
  <!-- Content -->
</div>
```

## Automatic Theme Application

The service automatically:

1. **Loads settings** when the app starts (in `app.component.ts`)
2. **Applies theme colors** to CSS custom properties
3. **Updates document title** with the site name
4. **Calculates color variants** (darker/lighter versions)
5. **Provides fallback values** if API fails

## CSS Custom Properties

The service automatically sets these CSS custom properties:

```css
:root {
  --primary-color: #5C0632;
  --primary-color-rgb: 92, 6, 50;
  --primary-color-dark: #4a0528;
  --primary-color-light: #7c084a;
  --secondary-color: #1572E8;
}
```

## Available Settings Properties

| Property | Type | Description |
|----------|------|-------------|
| `site_name` | string | Application/site name |
| `footer_txt` | string | Footer text |
| `var_footercprgt` | string | Copyright text |
| `var_logo_url` | string | Logo URL |
| `var_logo_client` | string | Client logo URL |
| `app_root_url` | string | Application root URL |
| `email_to` | string | Admin email |
| `email_from` | string | From email |
| `user_paging` | string | User pagination limit |
| `admin_paging` | string | Admin pagination limit |
| `var_primary_cc` | string | Primary theme color |
| `var_secondary_cc` | string | Secondary color |

## Error Handling

The service includes robust error handling:

- **API failures**: Falls back to default settings
- **Network issues**: Uses cached/default values
- **Invalid responses**: Logs errors and uses defaults
- **Missing properties**: Uses fallback values

## Example Implementation

See `layout.component.ts` for a complete example of how to use the global settings service in a component. 