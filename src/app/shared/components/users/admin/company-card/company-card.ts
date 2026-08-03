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
}
