import { Component, Input, EventEmitter, Output } from '@angular/core';
import { RequestVendor, User, VendorDetail } from '../../../../../services/user/user.model';
import { FormGroup } from '@angular/forms';


@Component({
  selector: 'app-company-card',
  imports: [],
  templateUrl: './company-card.html',
  styleUrl: './company-card.css',
})
export class CompanyCard {
  @Input() user: User | VendorDetail | null = null;
  @Input() editForm: FormGroup | null = null;
  @Input() isUpdating: boolean = false;
  @Input() errorMessage: string | null = null;
  @Input() isSubmitting: boolean = false;

  @Output() save = new EventEmitter<RequestVendor>();

  get companyInfo() {
    if (!this.user || !('company' in this.user)) {
      return null;
    }

    return this.user.company ?? null;
  }


  onEdit() {
    // Logic to handle edit action
  }

  onSave() {
    if (this.editForm?.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const companyGroup = this.editForm?.get('company') as FormGroup | null;
    const addressGroup = companyGroup?.get('address') as FormGroup | null;

    const payload: RequestVendor = {
      full_name: this.editForm?.get('full_name')?.value,
      email: this.editForm?.get('email')?.value,
      phone: this.editForm?.get('phone')?.value,
      company: {
        name: companyGroup?.get('name')?.value,
        email: companyGroup?.get('email')?.value,
        phone: companyGroup?.get('phone')?.value,
        address: {
          address_line1: addressGroup?.get('address_line1')?.value,
          address_line2: addressGroup?.get('address_line2')?.value,
          postal_code: addressGroup?.get('postal_code')?.value,
          country: addressGroup?.get('country')?.value,
        },
      },
    };

    this.save.emit(payload);
  }
}
