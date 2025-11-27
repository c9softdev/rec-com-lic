import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SelectionService {

  private apiUrl = environment.apiUrl;
  private apiKey = '';

  constructor(private http: HttpClient) { }

  uploadFile(formData: FormData) {
    return this.http.post<any>(environment.apiUrl, formData, {
      responseType: 'json' as const,
      observe: 'body'
    });
  }

  generateEmail(prompt: string): Observable<any> {
    const body = {
      inputs: prompt
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(
      '/hf/models/google/flan-t5-small',   // Works only after proxy
      body,
      { headers }
    );
  }

  uploadVisa(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData, {
      responseType: 'json' as const,
      observe: 'body'
    });
  }

  postDownload(payload: any, isDownload: boolean = false) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(
      this.apiUrl,
      payload,
      isDownload
        ? { headers, responseType: 'blob' as 'json' } // 👈 Important: blob type
        : { headers }
    );
  }
} 