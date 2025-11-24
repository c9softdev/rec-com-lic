import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<any> {
    const body = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [
        { sec_key: environment.sec_key }
      ]
    };
    return this.http.post<any>(this.apiUrl, body);
  }
} 