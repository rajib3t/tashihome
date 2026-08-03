import { Component, Input, EventEmitter, Output, signal, inject } from '@angular/core';
import { RequestVendor, User, VendorDetail } from '../../../../../services/user/user.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../ui/modal/modal';

@Component({
  selector: 'app-company-card',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './company-card.html',
  styleUrl: './company-card.css',
})
export class CompanyCard {
  private readonly formBuilder = inject(FormBuilder);

  @Input() user: User | VendorDetail | null = null;
  @Input() editForm: FormGroup | null = null;
  @Input() isUpdating: boolean = false;
  @Input() errorMessage: string | null = null;
  @Input() isSubmitting: boolean = false;

  @Output() save = new EventEmitter<RequestVendor>();

  readonly showEditForm = signal(false);
  readonly companyEditForm = this.formBuilder.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: this.formBuilder.group({
      address_line1: ['', Validators.required],
      address_line2: [''],
      postal_code: ['', Validators.required],
      country: ['', Validators.required],
    }),
  });

  get companyInfo() {
    if (!this.user || !('company' in this.user)) {
      return null;
    }

    return this.user.company ?? null;
  }

  onEdit() {
    const companyValue = this.editForm?.get('company')?.value ?? {
      name: '',
      email: '',
      phone: '',
      address: {
        address_line1: '',
        address_line2: '',
        postal_code: '',
        country: '',
      },
    };

    this.companyEditForm.patchValue(companyValue);
    this.showEditForm.set(true);
  }

  onClose() {
    this.companyEditForm.reset();
    this.showEditForm.set(false);
  }

  isInvalid(path: string): boolean {
    const control = this.companyEditForm?.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(path: string): string {
    const control = this.companyEditForm?.get(path);
    if (!control || !control.errors) return '';

    const labelMap: Record<string, string> = {
      name: 'Company name',
      email: 'Company email',
      phone: 'Company phone',
      'address.address_line1': 'Address line 1',
      'address.postal_code': 'Postal code',
      'address.country': 'Country',
    };

    const fieldName = labelMap[path] ?? path;

    if (control.errors['required']) return `${fieldName} is required.`;
    if (control.errors['email']) return 'Enter a valid email address.';
    return `${fieldName} is invalid.`;
  }

  onSave() {
    if (this.companyEditForm.invalid) {
      this.companyEditForm.markAllAsTouched();
      return;
    }

    const baseValue = this.editForm?.getRawValue() ?? {};
    const payload: RequestVendor = {
      full_name: baseValue.full_name ?? '',
      email: baseValue.email ?? '',
      phone: baseValue.phone ?? '',
      company: {
        name: this.companyEditForm.get('name')?.value ?? '',
        email: this.companyEditForm.get('email')?.value ?? '',
        phone: this.companyEditForm.get('phone')?.value ?? '',
        address: {
          address_line1: this.companyEditForm.get('address.address_line1')?.value ?? '',
          address_line2: this.companyEditForm.get('address.address_line2')?.value ?? '',
          postal_code: this.companyEditForm.get('address.postal_code')?.value ?? '',
          country: this.companyEditForm.get('address.country')?.value ?? '',
        },
      },
    };

    this.save.emit(payload);
    this.showEditForm.set(false);
  }
}
