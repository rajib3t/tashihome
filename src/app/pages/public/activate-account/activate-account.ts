import { AfterViewInit, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../shared/components/common/logo/logo';

@Component({
  imports: [Logo, RouterLink],
  selector: 'app-activate-account',
  styleUrl: './activate-account.css',
  templateUrl: './activate-account.html',
})
export class ActivateAccount implements AfterViewInit {
  
  public ngAfterViewInit(): void {
    if (typeof document === 'undefined') {
      return;
    }

    setTimeout(() => document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in')), 100);
  }
}
