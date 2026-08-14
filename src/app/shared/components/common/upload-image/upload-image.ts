import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-image',
  imports: [CommonModule],
  templateUrl: './upload-image.html',
  styleUrl: './upload-image.css',
})
export class UploadImage {
  id = input.required<string>();
  name = input.required<string>();

  preview = input<string>('');

  multiple = input(false);

  accept = input('image/*');

  alt = input('Image Preview');

  buttonText = input('Upload Image');

  emptyText = input('No image selected');

  disabled = input(false);

  valueChange = output<File>();
  valueListChange = output<File[]>();

  previewChange = output<string>();
  previewListChange = output<string[]>();

  apiBaseUrl = 'https://api.example.com';

  resolvedPreview = computed(() => {

    const preview = this.preview();

    if (!preview) return '';

    if (
      preview.startsWith('blob:') ||
      preview.startsWith('data:') ||
      preview.startsWith('http')
    ) {
      return preview;
    }

    return `${this.apiBaseUrl}${preview.startsWith('/') ? preview : '/' + preview}`;

  });

  previewType = computed(() => {

    const url = this.resolvedPreview().toLowerCase();

    if (!url) return 'empty';

    if (
      url.includes('.png') ||
      url.includes('.jpg') ||
      url.includes('.jpeg') ||
      url.includes('.gif') ||
      url.includes('.webp') ||
      url.startsWith('data:image/')
    ) {
      return 'image';
    }

    if (
      url.includes('.mp4') ||
      url.includes('.webm') ||
      url.includes('.ogg') ||
      url.startsWith('data:video/')
    ) {
      return 'video';
    }

    if (
      url.includes('.pdf') ||
      url.startsWith('data:application/pdf')
    ) {
      return 'pdf';
    }

    if (
      url.includes('.doc') ||
      url.includes('.docx')
    ) {
      return 'word';
    }

    if (
      url.includes('.ppt') ||
      url.includes('.pptx')
    ) {
      return 'presentation';
    }

    if (
      url.includes('.xls') ||
      url.includes('.xlsx')
    ) {
      return 'spreadsheet';
    }

    return 'file';

  });

  onFileChange(event: Event) {

    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    const files = Array.from(input.files);

    if (this.multiple()) {
      const readers = files.map((file) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }));

      Promise.all(readers).then((previews) => {
        this.previewListChange.emit(previews);
        this.valueListChange.emit(files);
      });

      input.value = '';
      return;
    }

    const file = files[0];

    const reader = new FileReader();

    reader.onload = () => {

      const base64 = reader.result as string;

      this.previewChange.emit(base64);

      this.valueChange.emit(file);

    };

    reader.readAsDataURL(file);

    input.value = '';

  }
}
