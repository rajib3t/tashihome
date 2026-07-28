import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationMeta {
  total: number;
  page: number;
  size: number;
}

@Component({
  selector: 'app-pagination',
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  @Input() meta!: PaginationMeta;
  @Input() pageSizeOptions: number[] = [10, 20, 30];
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  getTotalPages(): number {
    if (!this.meta || !this.meta.total || !this.meta.size) return 1;
    return Math.ceil(this.meta.total / this.meta.size);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getShowingTo(): number {
    if (!this.meta) return 0;
    return Math.min(this.meta.page * this.meta.size, this.meta.total);
  }

  changePage(page: number) {
    if (page < 1 || page > this.getTotalPages()) return;
    this.pageChange.emit(page);
  }

  changePageSize(value: string | number) {
    const pageSize = Number(value);
    if (!pageSize || pageSize === this.meta?.size) return;
    this.pageSizeChange.emit(pageSize);
  }
}
