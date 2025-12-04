import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private sessionService: SessionService) {}

  getConfig(): Observable<any> {
    // Get global config without security key
    // This is used on login page before user authentication
    const sess = this.sessionService.getSession();
    const compId = sess?.comp_id || environment.comp_id;
    const body = {
      event: 'msp',
      mode: 'gloConfig',
      InputData: [
        { comp_id: compId }
      ]
    };
    return this.http.post(this.apiUrl, body);
  }
}
