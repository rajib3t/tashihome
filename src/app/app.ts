import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiAssistantComponent } from './shared/components/ai-assistant/ai-assistant';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AiAssistantComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('tashihomes-app');
}

