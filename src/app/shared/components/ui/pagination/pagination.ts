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
  @Output() pageChange = new EventEmitter<number>();

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
}