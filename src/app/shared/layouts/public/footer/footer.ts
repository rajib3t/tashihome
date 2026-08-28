import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../components/common/logo/logo';

@Component({
  selector: 'app-public-footer',
  imports: [
    Logo,
    RouterLink,
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class PublicFooter {}
