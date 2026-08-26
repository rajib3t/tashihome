import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderPublic } from '../../public/header/header';
import { Logo } from '../../../components/common/logo/logo';

@Component({
  selector: 'app-user',
  imports: [RouterOutlet, HeaderPublic, Logo],
  styleUrl: './user.css',
  templateUrl: './user.html',
})
export class User {}
