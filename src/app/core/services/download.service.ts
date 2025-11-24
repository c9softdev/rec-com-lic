import { Injectable } from '@angular/core';
import { SweetAlertService } from './sweet-alert.service';
import { LoadingService } from './loading.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  constructor(
    private loadingService: LoadingService,
    private sweetAlert: SweetAlertService
  ) {}

  /**
   * Download a file from an API call that returns a Blob. Handles server-side JSON error objects.
   * Example: downloadFileFromApi(this.commonService.postBlob(payload), 'filename.pdf')
   */
  downloadFileFromApi(apiCall: Observable<Blob>, filename = 'Document_download') {
    this.loadingService.show('Downloading...');
    apiCall.subscribe({
      next: (res: Blob) => {
        this.loadingService.hide();
        // Try to read as JSON to check for server error
        const tryReader = new FileReader();
        tryReader.onload = () => {
          try {
            const text = tryReader.result as string;
            const json = JSON.parse(text);
            if (json?.status === 'failed') {
              this.sweetAlert.showError(json.message || 'File does not exist!');
              return;
            }
            this.triggerDownload(res, filename);
          } catch {
            this.triggerDownload(res, filename);
          }
        };
        tryReader.onerror = () => this.triggerDownload(res, filename);
        tryReader.readAsText(res);
      },
      error: (error: any) => {
        this.loadingService.hide();
        this.sweetAlert.showError('Something went wrong while downloading.');
        console.error('Download error:', error);
      }
    });
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    this.sweetAlert.showToast('File downloaded successfully', 'success');
  }

  /**
   * Download emigration document using prjId and id (not a direct URL).
   * Calls selectionService.postDownload with the correct payload and handles blob response.
   */
  downloadEmigrationDocument(selectionService: any, candidateId: string, projectId: string, filename?: string) {
    if (!candidateId || !projectId) {
      this.sweetAlert.showError('Missing required information.');
      return;
    }
    const payload = {
      event: 'astsk',
      mode: 'dvisadoc',
      InputData: [
        { id: candidateId, prjId: projectId }
      ]
    };
    this.loadingService.show('Downloading...');
    selectionService.postDownload(payload, true).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        const contentType = (res && res.type) || 'application/octet-stream';
        const blob = new Blob([res], { type: contentType });
        this.triggerDownload(blob, filename || `Emigration_${projectId}_${candidateId}`);
      },
      error: () => {
        this.loadingService.hide();
        this.sweetAlert.showError('Failed to download emigration document.');
      }
    });
  }
}