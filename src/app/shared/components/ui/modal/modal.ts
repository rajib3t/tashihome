import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
@Component({
  selector: 'app-modal',
  imports: [
    CommonModule
  ],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
   @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() className = '';
  @Input() showCloseButton = true;
  @Input() isFullscreen = false;

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  private setBodyOverflow(value: 'hidden' | 'unset') {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.body.style.overflow = value;
  }

  ngOnInit() {
    if (this.isOpen) {
      this.setBodyOverflow('hidden');
    }
  }

  ngOnDestroy() {
    this.setBodyOverflow('unset');
  }

  ngOnChanges() {
    this.setBodyOverflow(this.isOpen ? 'hidden' : 'unset');
  }

  onBackdropClick(event: MouseEvent) {
    if (!this.isFullscreen) {
      this.close.emit();
    }
  }

  onContentClick(event: MouseEvent) {
    event.stopPropagation();
  }

 @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}
