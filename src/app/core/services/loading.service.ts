import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _loading$ = new BehaviorSubject<boolean>(false);
  private _message$ = new BehaviorSubject<string | null>(null);

  readonly loading$ = this._loading$.asObservable();
  readonly message$ = this._message$.asObservable();

  show(message?: string | null): void {
    if (message) this._message$.next(message);
    this._loading$.next(true);
  }

  hide(): void {
    this._loading$.next(false);
    this._message$.next(null);
  }

  toggle(value?: boolean, message?: string | null): void {
    if (typeof value === 'boolean') this._loading$.next(value);
    else this._loading$.next(!this._loading$.value);
    if (message) this._message$.next(message);
  }
}
