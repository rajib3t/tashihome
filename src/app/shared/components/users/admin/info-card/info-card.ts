import { Component, inject, Input, EventEmitter, Output, signal } from '@angular/core';
import { UserService } from '../../../../../services/user/user-service';
import { RequestVendor, User, VendorDetail } from '../../../../../services/user/user.model';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Modal } from '../../../ui/modal/modal';


@Component({
  selector: 'app-info-card',
  imports: [
    ReactiveFormsModule,
    Modal,
  ],
  templateUrl: './info-card.html',
  styleUrl: './info-card.css',
})
export class InfoCard {
   public readonly userService = inject(UserService);

  @Input() user: User | VendorDetail | null = null;
  @Input() editForm: FormGroup | null = null;
  @Input() isUpdating: boolean = false;
  @Input() errorMessage: string | null = null;
  @Input() uploadErrorMessage: string | null = null;
  @Input() isSubmitting: boolean = false;

  
  @Output() avatarUpload = new EventEmitter<File>();
  @Output() save = new EventEmitter<RequestVendor>();

  showModal = signal(false);
 

  onEdit() {
    this.showModal.set(true);
  }

  onClose() {
    this.showModal.set(false);
  }

  uploadAvatar(file: File) {
    this.avatarUpload.emit(file);
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
        name: companyGroup?.get('name')?.value ?? '',
        email: companyGroup?.get('email')?.value ?? '',
        phone: companyGroup?.get('phone')?.value ?? '',
        address: {
          address_line1: addressGroup?.get('address_line1')?.value ?? '',
          address_line2: addressGroup?.get('address_line2')?.value ?? '',
          postal_code: addressGroup?.get('postal_code')?.value ?? '',
          country: addressGroup?.get('country')?.value ?? '',
        },
      },
    };

    this.save.emit(payload);
  }

  isInvalid(controlName: string): boolean {
    const control = this.editForm?.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(controlName: string): string {
    const control = this.editForm?.get(controlName);
    if (!control || !control.errors) return '';

    const label: Record<string, string> = {
      full_name: 'Full name',
      email: 'Email',
      phone: 'Phone number',
    };
    const name = label[controlName] ?? controlName;

    if (control.errors['required']) return `${name} is required.`;
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['pattern']) return `Enter a valid ${name.toLowerCase()}.`;
    return `${name} is invalid.`;
  }
}
