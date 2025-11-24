import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './global-spinner.component.html',
  styleUrls: ['./global-spinner.component.scss']
})
export class GlobalSpinnerComponent {
  loading$: any;
  message$: any;

  constructor(private loadingService: LoadingService) {
    this.loading$ = this.loadingService.loading$;
    this.message$ = this.loadingService.message$;
  }
}
