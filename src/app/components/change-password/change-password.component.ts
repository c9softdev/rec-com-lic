import { Component, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SweetAlertService } from '../../core/services/sweet-alert.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnDestroy {
  changePasswordForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  submitted = false;
  private destroy$ = new Subject<void>();
  private alertTimeout: any;
  passwordStrengthIcon = 'fa-circle-info';
  passwordStrengthColor = '#ffc107';
  showPasswordStrengthIcon = false;
  confirmPasswordMatchIcon = '';
  confirmPasswordMatchColor = '#28a745';
  showConfirmPasswordMatchIcon = false;
  showConfirmPasswordMismatchIcon = false;

  @ViewChild('oldPasswordInput') oldPasswordInput?: ElementRef;
  @ViewChild('newPasswordInput') newPasswordInput?: ElementRef;
  @ViewChild('confirmPasswordInput') confirmPasswordInput?: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private sweetAlert: SweetAlertService
  ) {
    this.changePasswordForm = this.formBuilder.group({
      oldPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validator: this.passwordMatchValidator
    });
    this.changePasswordForm.get('newPassword')?.valueChanges.subscribe(value => {
      this.evaluatePasswordStrength(value);
      this.evaluateConfirmPasswordMatch();
    });
    this.changePasswordForm.get('confirmPassword')?.valueChanges.subscribe(() => {
      this.evaluateConfirmPasswordMatch();
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  togglePasswordVisibility(field: 'oldPassword' | 'newPassword' | 'confirmPassword') {
    switch (field) {
      case 'oldPassword':
        this.showOldPassword = !this.showOldPassword;
        break;
      case 'newPassword':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirmPassword':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.loading) return;
    if (this.changePasswordForm.invalid) {
      this.focusFirstInvalidField();
      this.sweetAlert.showToast('Please fill all required fields correctly.', 'warning');
      return;
    }
    this.loading = true;
    const { oldPassword, newPassword } = this.changePasswordForm.value;
    this.authService.changePassword(oldPassword, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.sweetAlert.showToast(response.message || 'Password changed successfully.', 'success');
            this.changePasswordForm.reset();
            this.submitted = false;
          } else {
            this.sweetAlert.showError(response.message || 'Failed to change password.');
          }
          this.loading = false;
        },
        error: (error) => {
          this.sweetAlert.showError(error?.message || 'An unexpected error occurred');
          this.loading = false;
        }
      });
  }

  private focusFirstInvalidField() {
    const controls = this.changePasswordForm.controls;
    if (controls['oldPassword'].invalid && this.oldPasswordInput) {
      this.oldPasswordInput.nativeElement.focus();
    } else if (controls['newPassword'].invalid && this.newPasswordInput) {
      this.newPasswordInput.nativeElement.focus();
    } else if (controls['confirmPassword'].invalid && this.confirmPasswordInput) {
      this.confirmPasswordInput.nativeElement.focus();
    }
  }

  private autoClearAlert(type: 'error' | 'success') {
    clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      if (type === 'error') this.error = '';
      if (type === 'success') this.success = '';
    }, 3000);
  }

  evaluatePasswordStrength(password: string) {
    if (!password || password.length < 6) {
      this.passwordStrengthIcon = 'fa-circle-info';
      this.passwordStrengthColor = '#ffc107';
      this.showPasswordStrengthIcon = true;
    } else {
      this.showPasswordStrengthIcon = false;
    }
  }

  evaluateConfirmPasswordMatch() {
    const newPassword = this.changePasswordForm.get('newPassword')?.value;
    const confirmPassword = this.changePasswordForm.get('confirmPassword')?.value;
    if (confirmPassword && newPassword && confirmPassword === newPassword) {
      this.confirmPasswordMatchIcon = 'fa-circle-check';
      this.confirmPasswordMatchColor = '#28a745';
      this.showConfirmPasswordMatchIcon = true;
      this.showConfirmPasswordMismatchIcon = false;
    } else if (confirmPassword && newPassword && confirmPassword !== newPassword) {
      this.confirmPasswordMatchIcon = 'fa-times-circle';
      this.confirmPasswordMatchColor = '#dc3545';
      this.showConfirmPasswordMatchIcon = false;
      this.showConfirmPasswordMismatchIcon = true;
    } else {
      this.showConfirmPasswordMatchIcon = false;
      this.showConfirmPasswordMismatchIcon = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.alertTimeout);
  }
}