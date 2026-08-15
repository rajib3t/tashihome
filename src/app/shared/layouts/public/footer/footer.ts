import { Component } from '@angular/core';
import { Logo } from '../../../components/common/logo/logo';

@Component({
  selector: 'app-public-footer',
  imports: [
    Logo,
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class PublicFooter {}
