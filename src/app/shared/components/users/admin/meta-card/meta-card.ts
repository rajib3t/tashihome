import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { User, VendorDetail } from '../../../../../services/user/user.model';
import { Avatar } from '../../avatar/avatar';
import { UserService } from '../../../../../services/user/user-service';
import { Modal } from '../../../ui/modal/modal';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-meta-card',
  imports: [
    Avatar,
    Modal,
    ReactiveFormsModule
  ],
  templateUrl: './meta-card.html',
  styleUrl: './meta-card.css',
})
export class MetaCard {
  public readonly userService = inject(UserService);

  @Input() user: User | VendorDetail | null = null;
  @Input() editForm: FormGroup | null = null;
  @Input() isSubmitting: boolean = false;

  @Output() avatarUpload = new EventEmitter<File>();
  @Output() save = new EventEmitter<void>();

  showModal = signal(false);
  errorMessage = signal<string | null>(null);

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
    this.save.emit();
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