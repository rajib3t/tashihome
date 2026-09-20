import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  AfterViewInit,
  HostListener,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-sm">
      <div class="relative w-full h-44 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
        <canvas
          #canvas
          class="w-full h-full cursor-crosshair touch-none select-none block"
          (mousedown)="startDrawing($event)"
          (mousemove)="draw($event)"
          (mouseup)="stopDrawing()"
          (mouseleave)="stopDrawing()"
          (touchstart)="startTouch($event)"
          (touchmove)="touchMove($event)"
          (touchend)="stopDrawing()"
          (touchcancel)="stopDrawing()"
        ></canvas>

        @if (!hasStrokes) {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-medium">
            <span>✍️ Sign here with your mouse, finger, or stylus</span>
          </div>
        }
      </div>

      <div class="flex justify-between items-center mt-2.5 text-xs text-slate-500 dark:text-slate-400">
        <span>Draw inside the box. Your signature will be digitally stamped into the agreement.</span>
        <button
          type="button"
          (click)="clear()"
          class="cursor-pointer text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span>Clear Pad</span>
        </button>
      </div>
    </div>
  `,
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() signatureChange = new EventEmitter<string | null>();

  private readonly platformId = inject(PLATFORM_ID);
  private isDrawing = false;
  private ctx!: CanvasRenderingContext2D;
  public hasStrokes = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initCanvas();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId) || !this.canvasRef) return;
    // Keep strokes or re-init
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#0F2937'; // Navy/Pine brand color
  }

  startDrawing(e: MouseEvent): void {
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  draw(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.ctx.stroke();
    this.hasStrokes = true;
    this.emitChange();
  }

  startTouch(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      this.isDrawing = true;
      this.ctx.beginPath();
      this.ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  }

  touchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
    this.hasStrokes = true;
    this.emitChange();
  }

  stopDrawing(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      if (this.hasStrokes) {
        this.emitChange();
      }
    }
  }

  clear(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    this.hasStrokes = false;
    this.signatureChange.emit(null);
  }

  private emitChange(): void {
    if (!this.canvasRef || !this.hasStrokes) {
      this.signatureChange.emit(null);
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    this.signatureChange.emit(dataUrl);
  }
}

