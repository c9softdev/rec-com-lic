import { Directive, ElementRef, AfterViewInit, Input } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]'
})
export class AutoFocusDirective implements AfterViewInit {
  @Input('appAutoFocus') enabled = true;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (!this.enabled) return;
    // allow Angular to finish rendering and avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      try {
        const native = this.el.nativeElement as HTMLElement & { focus?: () => void };
        native.focus && native.focus();
      } catch (e) {
        // swallow errors; focusing is best-effort
      }
    }, 0);
  }
}
