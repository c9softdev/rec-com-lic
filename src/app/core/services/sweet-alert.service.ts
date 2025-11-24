import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class SweetAlertService {
  confirmDelete(message: string = 'Are you sure you want to delete this item?') {
    return Swal.fire({
      title: 'Confirm Delete',
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'swal2-custom-gap',
        confirmButton: 'btn btn-outline-danger',
        cancelButton: 'btn btn-outline-primary',
      },
      buttonsStyling: false,
      allowOutsideClick: false,
      didOpen: () => {
        const cancelBtn = document.querySelector('.swal2-cancel') as HTMLElement;
        if (cancelBtn) {
          cancelBtn.focus();
        }
      },
    });
  }

  confirmStatusChange(message: string = 'Are you sure you want to change the status?') {
    return Swal.fire({
      title: 'Confirm Status Change',
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      reverseButtons: true,
      customClass: {
        popup: 'swal2-custom-gap',
        confirmButton: 'btn btn-outline-danger',
        cancelButton: 'btn btn-primary-theme',
      },
      buttonsStyling: false,
      allowOutsideClick: false,
      didOpen: () => {
        const cancelBtn = document.querySelector('.swal2-cancel') as HTMLElement;
        if (cancelBtn) {
          cancelBtn.focus();
        }
      },
    });
  }

  confirmAssignment(message: string = 'Are you sure you want to proceed with this assignment?') {
    return Swal.fire({
      title: 'Confirm Assignment',
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, assign it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'swal2-custom-gap',
        confirmButton: 'btn btn-outline-success',
        cancelButton: 'btn btn-outline-primary',
      },
      buttonsStyling: false,
      allowOutsideClick: false,
      didOpen: () => {
        const cancelBtn = document.querySelector('.swal2-cancel') as HTMLElement;
        if (cancelBtn) {
          cancelBtn.focus();
        }
      },
    });
  }

  showToast(message: string, icon: SweetAlertIcon = 'success') {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      width: '600px',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      icon,
      title: message,
    });
  }

  showError(message: string) {
    return Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      allowOutsideClick: false,
    });
  }

  // Show a validation error with styled HTML: title (red) on its own line and details in primary color
  showValidationError(titleText: string, detailsText?: string) {
    const htmlParts = [] as string[];
    if (titleText) {
      htmlParts.push(`<div style="color:#d9534f;font-weight:600;margin-bottom:6px">${titleText}</div>`);
    }
    if (detailsText) {
      // use CSS variable for primary color if present, fallback to blue
      htmlParts.push(`<div style="color:var(--primary-color, #0d6efd)">${detailsText}</div>`);
    }
    return Swal.fire({
      icon: 'error',
      title: '',
      html: htmlParts.join(''),
      imageUrl: new URL('assets/img/license-warning.svg', document.baseURI).toString(),
      imageWidth: 120,
      imageHeight: 120,
      background: 'rgba(255,255,255,0.95)',
      backdrop: true,
      customClass: { popup: 'swal2-custom-gap license-error-popup', container: 'swal2-login-bg' },
      buttonsStyling: false,
      confirmButtonText: 'OK',
      didOpen: () => {
        const btn = document.querySelector('.swal2-confirm') as HTMLElement;
        if (btn) btn.focus();
      }
    });
  }

  showLoadingToast(message: string) {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      title: message,
      showConfirmButton: false,
      timer: undefined as unknown as number,
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      width: '420px'
    });
  }

  /**
   * Shows an alert modal centered on the page (not toast). Returns the Swal promise.
   * Example: this.sweetAlert.showAlertCenter('Title', 'Message', 'warning')
   */
  showAlertCenter(title: string, text?: string, icon: SweetAlertIcon = 'info', confirmButtonText = 'OK') {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText,
      allowOutsideClick: false,
      customClass: {
        popup: 'swal2-border-radius'
      }
    });
  }

  /**
   * Shows a reusable confirmation dialog with count or dynamic html/text. Returns the Swal promise.
   * Example: this.sweetAlert.confirmAction('Are you sure?', '<b>some HTML</b>', 'Send', 'Cancel', 'question')
   */
  confirmAction(title: string, html?: string, confirmButton = 'Yes', cancelButton = 'Cancel', icon: SweetAlertIcon = 'question') {
    return Swal.fire({
      title,
      html,
      icon,
      showCancelButton: true,
      focusCancel: true,
      confirmButtonText: confirmButton,
      cancelButtonText: cancelButton,
      customClass: { popup: 'swal2-border-radius' },
      allowOutsideClick: false
    });
  }

  close() {
    Swal.close();
  }
}