import { Component, Input, Output, signal, EventEmitter, computed } from '@angular/core';

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  // Core
  #name = signal<string>('');
  @Input()
  get name(): string { return this.#name(); }
  set name(val: string) { this.#name.set(val); }

  #src = signal<string | undefined>(undefined);
  @Input()
  get src(): string | undefined { return this.#src(); }
  set src(val: string | undefined) { this.#src.set(val); }

  @Input() size = 40;
  @Input() rounded = true;
  @Input() online = false;

  @Input() uploadable = false;

  @Output() imageUpload = new EventEmitter<File>();

 
  // Text/value mode (e.g. "75%", "3+")
  #value = signal<string | undefined>(undefined);
  @Input()
  get value(): string | undefined { return this.#value(); }
  set value(val: string | undefined) { this.#value.set(val); }
 
  // Social media sources (checked in this priority order, after `src`)
  #facebookId = signal<string | undefined>(undefined);
  @Input() get facebookId() { return this.#facebookId(); }
  set facebookId(val: string | undefined) { this.#facebookId.set(val); }

  #googleId = signal<string | undefined>(undefined);
  @Input() get googleId() { return this.#googleId(); }
  set googleId(val: string | undefined) { this.#googleId.set(val); }

  #twitterId = signal<string | undefined>(undefined);
  @Input() get twitterId() { return this.#twitterId(); }
  set twitterId(val: string | undefined) { this.#twitterId.set(val); }

  #instagramId = signal<string | undefined>(undefined);
  @Input() get instagramId() { return this.#instagramId(); }
  set instagramId(val: string | undefined) { this.#instagramId.set(val); }

  #skypeId = signal<string | undefined>(undefined);
  @Input() get skypeId() { return this.#skypeId(); }
  set skypeId(val: string | undefined) { this.#skypeId.set(val); }

  #gravatarId = signal<string | undefined>(undefined);
  @Input() get gravatarId() { return this.#gravatarId(); }
  set gravatarId(val: string | undefined) { this.#gravatarId.set(val); }
 
  readonly colors = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#FFC107',
    '#FF9800',
    '#795548',
    '#607D8B',
  ];
 
  // Tracks whether the currently-resolved image URL failed to load
  imageError = signal(false);
 
  initials = computed(() => this.getInitials(this.name));
 
  backgroundColor = computed(() => {
    const name = this.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.colors[Math.abs(hash) % this.colors.length];
  });
 
  /**
   * Resolves the avatar image URL from the first available source, in priority order:
   * explicit src > facebook > google > twitter > instagram > skype > gravatar.
   *
   * Note: Google, Twitter/X, and Instagram no longer offer public unauthenticated
   * avatar endpoints. Those branches are kept for API-shape compatibility but will
   * typically 404/fail, at which point onImageError() falls back to initials/value.
   */
  imageSrc = computed<string | null>(() => {
    if (this.src) return this.src;
 
    if (this.facebookId) {
      return `https://graph.facebook.com/${encodeURIComponent(this.facebookId)}/picture?width=${this.size}&height=${this.size}`;
    }
    if (this.googleId) {
      // Deprecated: Google's public profile photo API (Picasa/Google+) was shut down.
      // Left here only so the input is accepted without breaking existing templates.
      return null;
    }
    if (this.twitterId) {
      // Deprecated: X (formerly Twitter) removed the public /profile_image endpoint.
      return null;
    }
    if (this.instagramId) {
      // Instagram requires an authenticated Graph API call; no public endpoint exists.
      return null;
    }
    if (this.skypeId) {
      return `https://api.skype.com/users/${encodeURIComponent(this.skypeId)}/profile/avatar`;
    }
    if (this.gravatarId) {
      const hash = this.isMd5Hash(this.gravatarId)
        ? this.gravatarId.toLowerCase()
        : this.md5(this.gravatarId.trim().toLowerCase());
      return `https://www.gravatar.com/avatar/${hash}?s=${this.size}&d=404`;
    }
 
    return null;
  });
 
  displayText = computed(() => this.value ?? this.initials());
 
  onImageError() {
    this.imageError.set(true);
  }
 
  private getInitials(name: string): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0].toUpperCase())
      .join('');
  }
 
  private isMd5Hash(value: string): boolean {
    return /^[a-f0-9]{32}$/i.test(value.trim());
  }
 
  // --- Minimal MD5 implementation (needed for Gravatar email hashing) ---
  private md5(input: string): string {
    function rotl(n: number, c: number) {
      return (n << c) | (n >>> (32 - c));
    }
    function toHex(num: number) {
      let s = '';
      for (let i = 0; i < 4; i++) {
        s += ((num >> (i * 8)) & 0xff).toString(16).padStart(2, '0');
      }
      return s;
    }
 
    const K = new Array(64);
    for (let i = 0; i < 64; i++) {
      K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
    }
    const S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
      14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
      21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];
 
    const utf8 = unescape(encodeURIComponent(input));
    const bytes: number[] = [];
    for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
 
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push((bitLen / 2 ** (8 * i)) & 0xff);
 
    let a0 = 0x67452301,
      b0 = 0xefcdab89,
      c0 = 0x98badcfe,
      d0 = 0x10325476;
 
    for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
      const M = new Array(16);
      for (let i = 0; i < 16; i++) {
        M[i] =
          bytes[chunkStart + i * 4] |
          (bytes[chunkStart + i * 4 + 1] << 8) |
          (bytes[chunkStart + i * 4 + 2] << 16) |
          (bytes[chunkStart + i * 4 + 3] << 24);
      }
 
      let A = a0,
        B = b0,
        C = c0,
        D = d0;
 
      for (let i = 0; i < 64; i++) {
        let F: number, g: number;
        if (i < 16) {
          F = (B & C) | (~B & D);
          g = i;
        } else if (i < 32) {
          F = (D & B) | (~D & C);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          F = B ^ C ^ D;
          g = (3 * i + 5) % 16;
        } else {
          F = C ^ (B | ~D);
          g = (7 * i) % 16;
        }
        F = (F + A + K[i] + M[g]) | 0;
        A = D;
        D = C;
        C = B;
        B = (B + rotl(F, S[i])) | 0;
      }
 
      a0 = (a0 + A) | 0;
      b0 = (b0 + B) | 0;
      c0 = (c0 + C) | 0;
      d0 = (d0 + D) | 0;
    }
 
    return [a0, b0, c0, d0].map(toHex).join('');
  }

   onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    const file = input.files[0];
    this.imageUpload.emit(file);

    // Optional preview immediately
    this.src = URL.createObjectURL(file);
    this.imageError.set(false);

    input.value = '';
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }
}
