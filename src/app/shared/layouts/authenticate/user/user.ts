import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderPublic } from '../../public/header/header';
import { PublicFooter } from '../../public/footer/footer';

@Component({
  selector: 'app-user',
  imports: [RouterOutlet, HeaderPublic, PublicFooter],
  styleUrl: './user.css',
  templateUrl: './user.html',
})
export class User {}
