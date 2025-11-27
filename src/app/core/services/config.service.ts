import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommonService } from './common.service';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private commonService: CommonService) {}

  getConfig(): Observable<any> {
    // Get global config without security key
    // This is used on login page before user authentication
    const body = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [
        { comp_id: environment.comp_id }  // Use default comp_id from environment
      ]
    };
    return this.commonService.post(body);
  }
}