import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LicenseStateService {
  private licenseDataSubject = new BehaviorSubject<any>(null);
  public licenseData$ = this.licenseDataSubject.asObservable();

  setLicenseData(data: any): void {
    this.licenseDataSubject.next(data);
  }

  getLicenseData(): any {
    return this.licenseDataSubject.value;
  }

  clearLicenseData(): void {
    this.licenseDataSubject.next(null);
  }
}