import { Component, OnDestroy, OnInit, NgZone, CUSTOM_ELEMENTS_SCHEMA, inject, ChangeDetectorRef, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { AutoFocusDirective } from '../../shared/directives/auto-focus.directive';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RecaptchaModule } from 'ng-recaptcha-2';
import { Subject, takeUntil, catchError, first, timeout, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfigService } from '../../core/services/config.service';
import { SweetAlertService } from '../../core/services/sweet-alert.service';
import { ThemeService, ThemeColors } from '../../core/services/theme.service';
import { CommonService } from '../../core/services/common.service';
import { GlobalSettingsService } from '../../core/services/global-settings.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AutoFocusDirective, RecaptchaModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  // Form configurations
  // readonly USERNAME_MIN_LENGTH = 3;
  // readonly USERNAME_MAX_LENGTH = 30;
  // readonly PASSWORD_MIN_LENGTH = 6;
  // readonly PASSWORD_MAX_LENGTH = 32;
  readonly recaptchaSiteKey = environment.recaptchaSiteKey;

  // Forms
  loginForm!: FormGroup;
  forgotForm!: FormGroup;
  otpForm!: FormGroup;
  
  get otpControls() {
    const fa = this.otpForm.get('otpDigits') as any;
    return fa && fa.controls ? fa.controls : [];
  }

  @ViewChildren('otpDigit') otpDigitEls!: QueryList<ElementRef<HTMLInputElement>>;

  // UI state
  loading = false;
  error = '';
  successMessage = '';
  step = 1; // 1: username, 2: password
  forgotMode = false;
  recaptchaVerified = false;
  usernameSubmitted = false;
  passwordSubmitted = false;
  
  // Configuration & Theme
  config: any = null;
  configLoading = true;
  theme: ThemeColors | null = null;

  // Session data
  private tempUsername = '';
  private tempUserId = '';
  private tempCompanyId = ''; // Add company ID storage
  private destroy$ = new Subject<void>();

  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private route: ActivatedRoute,
    private sweetAlert: SweetAlertService,
    private ngZone: NgZone,
    private themeService: ThemeService,
    private commonService: CommonService,
    private globalSettings: GlobalSettingsService,
  ) {
    this.initializeForms();
  }

  private initializeForms(): void {
    this.loginForm = this.formBuilder.group({
      companyId: ['', [
        Validators.required,
        Validators.pattern(/^\d+$/)
      ]],
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(32)
      ]]
    });
    
    this.forgotForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.formBuilder.group({
      comp_id: ['', [Validators.required]],
      otp_val: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      otpDigits: this.formBuilder.array([
        this.formBuilder.control('', [Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.pattern(/^\d$/)])
      ])
    });
    (this as any).otpBoxes = ['', '', '', '', '', ''];
  }

  private setupRecaptchaCallbacks(): void {}

  ngOnInit(): void {
    this.checkRouteParameters();
    this.loadConfiguration();
    this.subscribeToTheme();
    this.globalSettings.resetToDefaults();

    if (this.forgotMode) {
      // reCAPTCHA component renders automatically
    }

    this.loginForm.get('companyId')?.valueChanges.subscribe((val) => {
      this.otpForm.patchValue({ comp_id: val || '' });
    });
    const initialCompId = this.loginForm.get('companyId')?.value;
    this.otpForm.patchValue({ comp_id: initialCompId || '' });
  }

  private checkRouteParameters(): void {
    const unauth = this.route.snapshot.queryParamMap.get('unauth');
    const forgot = this.route.snapshot.queryParamMap.get('forgot');

    if (unauth === '1') {
      this.error = 'Unauthorized Access! Please login first';
      this.step = 1;
    }

    if (forgot === '1') {
      this.forgotMode = true;
    }
  }

  private loadConfiguration(): void {
    // DISABLED: Config API is no longer called on project load
    // It will be called after successful login with the correct company ID
    // For now, just mark config loading as complete
    this.configLoading = false;
    this.cdr.detectChanges();
    
    // ===== COMMENTED OUT CONFIG API CALL =====
    // this.configService.getConfig()
    //   .pipe(timeout(10000))
    //   .subscribe({
    //     next: (res) => {
    //       this.ngZone.run(() => {
    //         if (res.status === 'success') {
    //           this.config = res.data;
    //           this.saveConfigToLocalStorage(res.data);
    //         }
    //         this.configLoading = false;
    //         this.cdr.detectChanges();
    //       });
    //     },
    //     error: () => {
    //       this.ngZone.run(() => {
    //         this.configLoading = false;
    //         this.cdr.detectChanges();
    //       });
    //       this.sweetAlert.showError('Failed to load configuration');
    //     }
    //   });
    // ===== END COMMENTED OUT CONFIG API CALL =====
  }

  private saveConfigToLocalStorage(data: any): void {
    const configItems = {
      'site_name': data.site_name || '',
      'var_foot_email': data.var_foot_email || '',
      'footer_txt': data.footer_txt || '',
      'var_version': data.var_version || '',
      'var_logo_url': data.var_logo_url || '',
      'var_logo_client': data.var_logo_client || ''
    };

    Object.entries(configItems).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  private subscribeToTheme(): void {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.theme = theme;
      });
  }

  private loadRecaptcha(): void {}

  onSubmit(): void {
    if (this.loading) return;
    
    this.error = '';
    
    if (this.step === 1) {
      this.handleUsernameStep();
    } else {
      this.handlePasswordStep();
    }
  }

  private handleUsernameStep(): void {
    this.usernameSubmitted = true;
    
    const companyIdCtrl = this.loginForm.get('companyId');
    const usernameCtrl = this.loginForm.get('username');
    
    if (companyIdCtrl?.invalid || usernameCtrl?.invalid) {
      companyIdCtrl?.markAsTouched();
      usernameCtrl?.markAsTouched();
      return;
    }

    this.loading = true;
    const username = usernameCtrl?.value;
    const companyId = companyIdCtrl?.value;
    
    this.authService.verifyUsername(username, companyId)
      .pipe(
        first(),
        takeUntil(this.destroy$),
        catchError(err => {
          const msg = err?.message || 'Failed to verify username. Please try again.';
          this.error = msg;
          this.loading = false;
          throw err;
        })
      )
      .subscribe({
        next: (response) => {
          if (response.status === 'success' && response.data?.length) {
            this.tempUsername = username;
            this.tempUserId = response.data[0].userId;
            this.tempCompanyId = companyId;
            Promise.resolve().then(() => {
              this.step = 2;
              this.loginForm.get('password')?.reset();
              this.cdr.detectChanges();
            });
          } else {
            this.error = response.message || 'Invalid username';
          }
          this.loading = false;
        },
        error: (error) => {
          const msg = error?.message || 'An unexpected error occurred';
          console.error('Login error:', error);
          this.error = msg;
          this.loading = false;
        }
      });
  }

  private handlePasswordStep(): void {
    this.passwordSubmitted = true;
    if (this.loginForm.get('password')?.invalid) {
      this.loginForm.get('password')?.markAsTouched();
      return;
    }

    this.loading = true;
    const password = this.loginForm.get('password')?.value;
    const companyId = String(this.loginForm.get('companyId')?.value || '');
    
    this.authService.verifyPassword(password, companyId)
      .pipe(
        first(),
        takeUntil(this.destroy$),
        catchError(err => {
          const msg = err?.message || 'Failed to verify password. Please try again.';
          this.error = msg;
          this.loading = false;
          throw err;
        })
      )
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            const cid = companyId || this.tempCompanyId || this.loginForm.get('companyId')?.value;
            const isSuperAdmin = String(cid || '') === String(environment.superAdminID || '');
            if (isSuperAdmin) {
              this.step = 3;
              this.otpForm.patchValue({ comp_id: cid || '' });
              this.loading = false;
              this.cdr.detectChanges();
              return;
            }
            this.applySettingsAndNavigate(cid);
          } else {
            this.error = response.message || 'Invalid password';
            this.loading = false;
          }
        },
        error: (error) => {
          const msg = error?.message || 'An unexpected error occurred';
          console.error('Login error:', error);
          this.error = msg;
          this.loading = false;
        }
      });
  }

  toggleForgotMode(): void {
    this.forgotMode = !this.forgotMode;
    this.clearMessages();
    
    if (!this.forgotMode) {
      this.step = 1;
    }
  }

  private clearMessages(): void {
    this.error = '';
    this.successMessage = '';
  }

  onRecaptchaResolved(token: string | null): void {
    this.ngZone.run(() => {
      this.recaptchaVerified = !!token;
    });
  }

  onRecaptchaExpired(): void {
    this.ngZone.run(() => {
      this.recaptchaVerified = false;
    });
  }

  onRecaptchaError(): void {
    this.ngZone.run(() => {
      this.recaptchaVerified = false;
      this.error = 'reCAPTCHA verification failed. Please try again.';
    });
  }

  onForgotSubmit(): void {
    if (this.loading || !this.validateForgotSubmit()) return;
    
    this.loading = true;
    const email = this.forgotForm.get('email')?.value;
    
    this.processForgotPassword(email);
  }

  private validateForgotSubmit(): boolean {
    this.clearMessages();
    
    if (this.forgotForm.invalid) {
      this.forgotForm.get('email')?.markAsTouched();
      return false;
    }
    
    if (!this.recaptchaVerified) {
      this.error = 'Please complete the reCAPTCHA verification.';
      return false;
    }
    
    return true;
  }

  private processForgotPassword(email: string): void {
    const payload = {
      event: "forgetpassword",
      mode: "fpsend",
      InputData: [{
        Femail: email,
        scode: "123456" // This would typically be generated server-side
      }]
    };
    
    // this.http.post(`${environment.apiUrl}/auth/forgot-password`, payload)
    this.commonService.post(payload)
      .pipe(
        first(),
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to process forgot password request:', err);
          this.error = 'Failed to process request. Please try again.';
          this.loading = false;
          this.resetRecaptcha();
          throw err;
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response.status === 'success') {
            this.successMessage = response.message || 'Your Password has been sent to your email address! Please login.';
            this.sweetAlert.showToast(this.successMessage, 'success');
          } else {
            this.error = response.message || 'Failed to process request. Please try again.';
          }
          
          this.loading = false;
          this.resetRecaptcha();
        },
        error: () => {
          this.loading = false;
          this.resetRecaptcha();
        }
      });
  }
  
  private resetRecaptcha(): void {
    this.recaptchaVerified = false;
  }

  backToUsername(): void {
    this.step = 1;
    this.loginForm.get('password')?.reset();
    this.error = '';
    // Keep company ID and username, reset form fields
    const companyId = this.loginForm.get('companyId')?.value;
    const username = this.loginForm.get('username')?.value;
    this.loginForm.patchValue({
      companyId: companyId,
      username: username,
      password: ''
    });
  }

  get isSuperAdmin(): boolean {
    const cid = this.loginForm.get('companyId')?.value;
    return String(cid || '') === String(environment.superAdminID || '');
  }

  onValidateOtp(): void {
    const fa = this.otpForm.get('otpDigits') as any;
    const otp = Array.isArray(fa?.controls) ? fa.controls.map((c: any) => String(c.value || '')).join('') : (this.otpForm.get('otp_val')?.value || '');
    this.otpForm.patchValue({ otp_val: otp });
    if (this.otpForm.invalid) {
      this.sweetAlert.showToast('Enter a valid 6-digit OTP.', 'warning');
      return;
    }
    const compId = this.otpForm.get('comp_id')?.value;
    const otpVal = this.otpForm.get('otp_val')?.value;
    const payload = {
      event: 'msp',
      mode: 'upOTP',
      InputData: [{ comp_id: String(compId || ''), otp_val: String(otpVal || '') }]
    };
    this.loading = true;
    this.commonService.post(payload)
      .pipe(first(), takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status === 'success') {
            this.sweetAlert.showToast(res?.message || 'OTP validated.', 'success');
            this.applySettingsAndNavigate(String(compId || ''));
          } else {
            this.sweetAlert.showError(res?.message || 'Invalid OTP.');
          }
        },
        error: () => {
          this.loading = false;
          this.sweetAlert.showError('Failed to validate OTP.');
        }
      });
  }

  private applySettingsAndNavigate(companyId: string): void {
    const cid = String(companyId || this.tempCompanyId || this.loginForm.get('companyId')?.value || '');
    this.globalSettings.loadGlobalSettings(cid).pipe(first()).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  backToPasswordStep(): void {
    this.step = 2;
    const fa = this.otpForm.get('otpDigits') as any;
    if (fa && fa.controls) fa.controls.forEach((c: any) => c.setValue(''));
    this.otpForm.patchValue({ otp_val: '' });
  }

  onOtpDigitInput(e: Event, index: number): void {
    const input = e.target as HTMLInputElement;
    let val = (input.value || '').replace(/\D/g, '');
    if (val.length > 1) val = val.slice(-1);
    const fa = this.otpForm.get('otpDigits') as any;
    if (fa && fa.controls && fa.controls[index]) fa.controls[index].setValue(val);
    if (val) {
      const next = this.otpDigitEls.get(index + 1);
      if (next) next.nativeElement.focus();
    }
  }

  onOtpKeyDown(e: KeyboardEvent, index: number): void {
    const fa = this.otpForm.get('otpDigits') as any;
    const key = e.key;
    if (key === 'Backspace') {
      const currentVal = fa?.controls?.[index]?.value || '';
      if (!currentVal && index > 0) {
        const prev = this.otpDigitEls.get(index - 1);
        if (prev) prev.nativeElement.focus();
      }
      return;
    }
    if (key === 'ArrowLeft' && index > 0) {
      const prev = this.otpDigitEls.get(index - 1);
      if (prev) prev.nativeElement.focus();
    } else if (key === 'ArrowRight' && index < 5) {
      const next = this.otpDigitEls.get(index + 1);
      if (next) next.nativeElement.focus();
    }
  }

  onOtpPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') || '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    const fa = this.otpForm.get('otpDigits') as any;
    digits.forEach((d, i) => {
      if (fa?.controls?.[i]) fa.controls[i].setValue(d);
    });
    const lastIndex = digits.length - 1;
    if (lastIndex >= 0) {
      const el = this.otpDigitEls.get(lastIndex);
      if (el) el.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
