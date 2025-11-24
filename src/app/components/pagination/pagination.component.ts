import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 50;
  @Input() totalRecords: number = 0;
  @Input() totalPages: number = 0;
  @Input() jumpToPage: number = 1;

  @Output() pageChange = new EventEmitter<number>();
  @Output() jumpToPageChange = new EventEmitter<number>();

  paginationRange: number[] = [];
  readonly Math = Math;

  ngOnChanges(changes: SimpleChanges): void {
    this.updatePaginationRange();
  }

  updatePaginationRange(): void {
    const range: number[] = [];
    const maxVisiblePages = 5;
    if (this.totalPages <= 1) {
      this.paginationRange = [];
      return;
    }
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        range.push(i);
      }
    } else {
      range.push(1);
      let start = Math.max(2, this.currentPage - Math.floor(maxVisiblePages / 2) + 1);
      let end = Math.min(this.totalPages - 1, this.currentPage + Math.floor(maxVisiblePages / 2) - 1);
      if (this.currentPage <= Math.ceil(maxVisiblePages / 2)) {
        end = Math.min(this.totalPages - 1, maxVisiblePages - 1);
      } else if (this.currentPage + Math.floor(maxVisiblePages / 2) >= this.totalPages) {
        start = Math.max(2, this.totalPages - maxVisiblePages + 2);
      }
      if (start > 2) {
        range.push(-1);
      }
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      if (end < this.totalPages - 1) {
        range.push(-1);
      }
      if (this.totalPages > 1 && !range.includes(this.totalPages)) {
        range.push(this.totalPages);
      }
    }
    this.paginationRange = range;
  }

  onJumpToPage(): void {
    if (this.jumpToPage >= 1 && this.jumpToPage <= this.totalPages) {
      this.jumpToPageChange.emit(this.jumpToPage);
    } else {
      this.jumpToPage = this.currentPage;
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}
