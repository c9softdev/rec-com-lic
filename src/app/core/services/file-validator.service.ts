import { Injectable } from '@angular/core';

export interface FileValidationOptions {
  allowedTypes?: string[]; // MIME types
  maxSize?: number; // bytes
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  title?: string;
  details?: string;
}

@Injectable({ providedIn: 'root' })
export class FileValidatorService {
  // sensible defaults
  // Extended list of common image MIME types
  private defaultImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/heif',
    'image/heic'
  ];
  private defaultMaxSize = 500 * 1024; // 500 KB

  validate(file: File | null | undefined, options?: FileValidationOptions): FileValidationResult {
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    const allowed = options?.allowedTypes ?? this.defaultImageTypes;
    const maxSize = options?.maxSize ?? this.defaultMaxSize;

    const fileType = (file.type || '').toLowerCase();
  if (!allowed.includes(fileType)) {
      // Map MIME types to friendly extension labels for error messages
      const mimeToExt: { [mime: string]: string[] } = {
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/jpg': ['.jpg', '.jpeg'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
        'image/bmp': ['.bmp'],
        'image/tiff': ['.tif', '.tiff'],
        'image/svg+xml': ['.svg'],
        'image/x-icon': ['.ico'],
        'image/vnd.microsoft.icon': ['.ico'],
        'image/heif': ['.heif'],
        'image/heic': ['.heic']
      };

      const extSet = new Set<string>();
      allowed.forEach(m => {
        const exts = mimeToExt[m];
        if (exts && exts.length) exts.forEach(e => extSet.add(e));
        else {
          // Fallback: if unknown mime, show mime subtype as extension
          const parts = m.split('/');
          if (parts.length === 2) extSet.add(`.${parts[1]}`);
        }
      });

      const friendly = Array.from(extSet).join(', ');
      return {
        valid: false,
        error: `Invalid file type. Allowed file extensions: ${friendly}`,
        title: 'Invalid file type.',
        details: `Allowed file extensions: ${friendly}`
      };
    }

    if (file.size > maxSize) {
      const sizeMsg = `File size exceeds ${Math.round(maxSize / 1024)} KB.`;
      return { valid: false, error: `${sizeMsg} Please choose a smaller file.`, title: sizeMsg, details: 'Please choose a smaller file.' };
    }

    return { valid: true };
  }
}
