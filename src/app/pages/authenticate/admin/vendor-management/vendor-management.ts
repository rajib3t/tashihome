import { Component, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
@Component({
  selector: 'app-vendor-management',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    Modal,
  ],
  templateUrl: './vendor-management.html',
  styleUrl: './vendor-management.css',
})
export class VendorManagement {



  // Create  modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  openCreateModal() {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }
}
