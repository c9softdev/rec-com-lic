import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommonService } from './common.service';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient, private commonService: CommonService) {}

  getMenu(userId: string, userType: string): Observable<any> {
    const body = {
      event: 'msp',
      mode: 'getMenu',
      InputData: [{ userId, userType }]
    };
    // console.log('Fetching menu with body:', body);
    return this.commonService.post(body);
  }
} 