import { Component } from '@angular/core';
import { RouterOutlet } from "@angular/router";
import { HeaderPublic } from '../../public/header/header';
import { CommonModule } from '@angular/common';
import { PublicFooter } from '../../public/footer/footer';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    HeaderPublic,
    RouterOutlet,
    CommonModule,
    PublicFooter,
  ],
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class User {
   menuItems: { label: string; route: string }[] = [
    { label: 'Home', route: '/' },
    { label: 'Login', route: '/login' },
  ];
}
