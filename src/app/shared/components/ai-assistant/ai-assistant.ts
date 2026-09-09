import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AssistantService } from '../../../services/assistant/assistant-service';
import {
  HomestayCardData,
  AvailabilityQuoteData,
  BookingConfirmationData,
  SuggestionItem,
  PropertyRoomTypeOption,
  PropertyRoomTypePriceTier,
  PaymentGatewayInfo,
} from '../../../services/assistant/assistant.model';
import { getRoomNightlyRate } from '../../../utils/pricing.utils';
import { AuthService } from '../../../services/auth/auth-service';
import { UserService } from '../../../services/user/user-service';
import { BookingService } from '../../../services/booking/booking-service';
import { RazorpayService } from '../../../services/booking/razorpay-service';
import { SettingsService } from '../../../services/settings/settings-service';
import { AppDatePipe, AppDateTimePipe } from '../../../pipes/app-date-pipe/app-date-pipe';
import { environment } from '../../../../environments/environment';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayDate(): string {
  return formatDateYYYYMMDD(new Date());
}

function getDefaultCheckInDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateYYYYMMDD(d);
}

function getDefaultCheckOutDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  return formatDateYYYYMMDD(d);
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AppDatePipe, AppDateTimePipe],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css',
})
export class AiAssistantComponent implements AfterViewChecked {
  public readonly assistantService = inject(AssistantService);
  public readonly authService = inject(AuthService);
  public readonly userService = inject(UserService);
  public readonly bookingService = inject(BookingService);
  public readonly razorpayService = inject(RazorpayService);
  public readonly settingsService = inject(SettingsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') private chatInput?: ElementRef<HTMLInputElement>;

  public userInput = signal<string>('');
  public copiedRef = signal<string | null>(null);

  // Feature toggle state
  public readonly isChatboxEnabled = (environment as any).enableChatbox !== false;

  // Payment execution state
  public readonly isPaymentDisabled = !!environment.disablePayment;
  public isPaying = signal<string | null>(null);
  public paymentSuccessRef = signal<string | null>(null);
  public paymentError = signal<string | null>(null);

  // Settings-driven properties
  public readonly appName = computed(() => this.settingsService.appName());
  public readonly assistantSubtitle = computed(() => {
    const s = this.settingsService.settingsData();
    return s['assistant_subtitle'] || s['app_tagline'] || `${this.appName()} Homestay Guide & Booking`;
  });
  public readonly defaultCurrency = computed(() => this.settingsService.defaultCurrency());
  public readonly currencySymbol = computed(() => this.settingsService.currencySymbol());
  public readonly dateFormat = computed(() => this.settingsService.dateFormat());

  // Availability Date & Guest Modal State
  public isAvailabilityModalOpen = signal<boolean>(false);
  public selectedHomestayForCheck = signal<{
    name: string;
    slug: string;
    cover_image?: string | null;
    base_price?: number;
    currency?: string;
    max_guests?: number;
    bedrooms?: number;
  } | null>(null);

  public readonly today = getTodayDate();
  public checkInDate = signal<string>(getDefaultCheckInDate());
  public checkOutDate = signal<string>(getDefaultCheckOutDate());
  public guestCount = signal<number>(2);
  public roomCount = signal<number>(1);
  public modalMaxGuests = signal<number>(10);
  public modalMaxRooms = signal<number>(5);

  // Pre-checkout Authentication & Verification Modal State
  public showAuthModal = signal<boolean>(false);
  public authTab = signal<'login' | 'register'>('login');
  public pendingCheckoutQuote = signal<AvailabilityQuoteData | null>(null);
  public selectedRoomTypeId = signal<string | null>(null);

  // Login form state
  public loginEmail = signal<string>('');
  public loginPassword = signal<string>('');
  public loginError = signal<string>('');
  public isLoginSubmitting = signal<boolean>(false);

  // Register with verification form state
  public regFullName = signal<string>('');
  public regEmail = signal<string>('');
  public regPhone = signal<string>('');
  public regPassword = signal<string>('');
  public regError = signal<string>('');
  public regSuccess = signal<string>('');
  public isRegSubmitting = signal<boolean>(false);

  public currentUser = computed(() => this.authService.authUser());
  public messages = computed(() => this.assistantService.messages());
  public isLoading = computed(() => this.assistantService.isLoading());
  public isCurrentlyStreaming = computed(() => this.assistantService.messages().some((m) => m.isStreaming));
  public suggestions = computed(() => this.assistantService.suggestions());
  public isOpen = computed(() => this.assistantService.isChatOpen());

  private shouldScrollToBottom = false;

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom || this.isCurrentlyStreaming()) {
      this.scrollToBottom();
      if (!this.isCurrentlyStreaming()) {
        this.shouldScrollToBottom = false;
      }
    }
  }

  public toggleChat(): void {
    this.assistantService.toggleChat();
    if (this.assistantService.isChatOpen()) {
      this.shouldScrollToBottom = true;
      setTimeout(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.chatInput?.nativeElement.focus();
        }
      }, 150);
    }
  }

  public closeChat(): void {
    this.assistantService.closeChat();
  }

  public clearChat(): void {
    this.assistantService.clearChat();
    this.shouldScrollToBottom = true;
  }

  public sendMessage(): void {
    const text = this.userInput().trim();
    if (!text || this.isLoading()) return;

    this.userInput.set('');
    this.shouldScrollToBottom = true;

    this.assistantService.sendMessageStream(text).finally(() => {
      this.shouldScrollToBottom = true;
    });
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  public useSuggestion(prompt: string): void {
    const lower = prompt.toLowerCase();

    // If user clicked a suggestion to check availability or different dates, open date collector!
    if (lower.includes('check other dates') || lower.includes('different dates') || lower.includes('change dates')) {
      const latestWithQuote = [...this.messages()].reverse().find(m => m.data?.availability);
      if (latestWithQuote?.data?.availability) {
        this.openAvailabilityModalFromQuote(latestWithQuote.data.availability);
        return;
      }
    }

    const checkMatch = prompt.match(/check\s+(?:availability|rates|dates)\s+for\s+(.+)/i);
    if (checkMatch && checkMatch[1]) {
      const targetName = checkMatch[1].trim().toLowerCase();
      let foundStay: HomestayCardData | undefined;
      for (const m of this.messages()) {
        if (m.data?.search_results) {
          foundStay = m.data.search_results.find(
            s => s.name.toLowerCase().includes(targetName) || targetName.includes(s.name.toLowerCase()) || targetName.includes(s.slug.toLowerCase())
          );
          if (foundStay) break;
        }
      }
      if (foundStay) {
        this.openAvailabilityModal(foundStay);
        return;
      }
    }

    this.userInput.set(prompt);
    this.sendMessage();
  }

  // --- Availability Dialog Handlers ---
  public openAvailabilityModal(homestay: HomestayCardData): void {
    const maxG = homestay.max_guests && homestay.max_guests > 0 ? homestay.max_guests : 10;
    const maxR = homestay.bedrooms && homestay.bedrooms > 0 ? homestay.bedrooms : 5;
    this.modalMaxGuests.set(maxG);
    this.modalMaxRooms.set(maxR);

    this.selectedHomestayForCheck.set({
      name: homestay.name,
      slug: homestay.slug,
      cover_image: homestay.cover_image,
      base_price: homestay.base_price,
      currency: homestay.currency,
      max_guests: maxG,
      bedrooms: maxR,
    });

    if (this.guestCount() > maxG) {
      this.guestCount.set(maxG);
    }
    if (this.roomCount() > maxR) {
      this.roomCount.set(maxR);
    }
    this.isAvailabilityModalOpen.set(true);
  }

  public openAvailabilityModalFromQuote(quote: AvailabilityQuoteData): void {
    let maxG = 10;
    let maxR = quote.available_units || 5;
    if (quote.room_types && quote.room_types.length > 0) {
      const capacities = quote.room_types.map((r) => r.capacity || 0).filter((c) => c > 0);
      if (capacities.length > 0) {
        maxG = Math.max(...capacities);
      }
      const units = quote.room_types.map((r) => r.total_units || 0).filter((u) => u > 0);
      if (units.length > 0) {
        maxR = Math.max(...units);
      }
    }

    this.modalMaxGuests.set(Math.max(1, maxG));
    this.modalMaxRooms.set(Math.max(1, maxR));

    this.selectedHomestayForCheck.set({
      name: quote.property_name,
      slug: quote.property_slug || quote.property_name,
      base_price: quote.price_per_night,
      currency: quote.currency,
      max_guests: maxG,
    });

    if (quote.check_in_date) {
      this.checkInDate.set(quote.check_in_date);
    }
    if (quote.check_out_date) {
      this.checkOutDate.set(quote.check_out_date);
    }
    if (quote.num_guests) {
      this.guestCount.set(Math.min(quote.num_guests, maxG));
    }
    if (quote.requested_rooms) {
      this.roomCount.set(Math.min(quote.requested_rooms, maxR));
    }
    this.isAvailabilityModalOpen.set(true);
  }

  public closeAvailabilityModal(): void {
    this.isAvailabilityModalOpen.set(false);
  }

  public incrementGuestCount(): void {
    if (this.guestCount() < this.modalMaxGuests()) {
      this.guestCount.update((c) => c + 1);
    }
  }

  public decrementGuestCount(): void {
    if (this.guestCount() > 1) {
      this.guestCount.update((c) => c - 1);
    }
  }

  public incrementRoomCount(): void {
    if (this.roomCount() < this.modalMaxRooms()) {
      this.roomCount.update((r) => r + 1);
    }
  }

  public decrementRoomCount(): void {
    if (this.roomCount() > 1) {
      this.roomCount.update((r) => r - 1);
    }
  }

  public onCheckInChange(newInDate: string): void {
    this.checkInDate.set(newInDate);
    if (this.checkOutDate() <= newInDate) {
      const nextDay = new Date(newInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      this.checkOutDate.set(formatDateYYYYMMDD(nextDay));
    }
  }

  public confirmAvailabilityCheck(): void {
    const stay = this.selectedHomestayForCheck();
    if (!stay) return;

    const inDate = this.settingsService.formatDate(this.checkInDate());
    const outDate = this.settingsService.formatDate(this.checkOutDate());
    const guests = Math.min(this.guestCount(), this.modalMaxGuests());
    const rooms = Math.min(this.roomCount(), this.modalMaxRooms());

    const prompt = `Check availability and price quote for "${stay.name}" (${stay.slug}) from ${inDate} to ${outDate} for ${guests} guest${guests > 1 ? 's' : ''}${rooms > 1 ? ' (' + rooms + ' rooms)' : ''}.`;

    this.isAvailabilityModalOpen.set(false);
    this.userInput.set(prompt);
    this.sendMessage();
  }

  // --- Occupancy Tier & Pricing Helpers ---
  public getEffectiveTierRate(tier: PropertyRoomTypePriceTier): number {
    if (!tier) return 0;
    const standard = Number(tier.price_per_night) || 0;
    const sale = Number(tier.sale_per_night) || 0;
    return sale > 0 && (standard === 0 || sale < standard) ? sale : standard;
  }

  public getAppliedOccupancy(quote: AvailabilityQuoteData, room?: PropertyRoomTypeOption): number | undefined {
    if (quote.applied_tier?.occupancy) {
      return quote.applied_tier.occupancy;
    }
    const safeGuests = Math.max(1, Math.floor(quote.num_guests || this.guestCount() || 1));
    if (room?.pricing_tiers && room.pricing_tiers.length > 0) {
      const res = getRoomNightlyRate(room as any, safeGuests);
      return res.appliedOccupancy;
    }
    return safeGuests;
  }

  public selectOccupancyTierQuote(
    quote: AvailabilityQuoteData,
    room: PropertyRoomTypeOption,
    occupancy: number
  ): void {
    const maxCapacity = room?.capacity && room.capacity > 0 ? room.capacity : occupancy;
    const safeOccupancy = Math.min(occupancy, maxCapacity);
    this.guestCount.set(safeOccupancy);
    const roomName = room?.name || quote.selected_room_type || '';
    const roomPart = roomName ? ` for room type "${roomName}"` : '';
    const formattedCheckIn = this.settingsService.formatDate(quote.check_in_date);
    const formattedCheckOut = this.settingsService.formatDate(quote.check_out_date);
    const prompt = `Check availability and price quote for "${quote.property_name}" (${quote.property_slug || ''})${roomPart} from ${formattedCheckIn} to ${formattedCheckOut} for ${safeOccupancy} guest${safeOccupancy > 1 ? 's' : ''}.`;
    this.userInput.set(prompt);
    this.sendMessage();
  }

  // --- Room Type Switch Handler ---
  public switchRoomTypeQuote(quote: AvailabilityQuoteData, room: PropertyRoomTypeOption): void {
    let guests = quote.num_guests || this.guestCount() || 1;
    if (room.capacity && room.capacity > 0 && guests > room.capacity) {
      guests = room.capacity;
      this.guestCount.set(guests);
    }
    const formattedCheckIn = this.settingsService.formatDate(quote.check_in_date);
    const formattedCheckOut = this.settingsService.formatDate(quote.check_out_date);
    const prompt = `Check availability and pricing quote for "${quote.property_name}" (${quote.property_slug || ''}) for room type "${room.name}" from ${formattedCheckIn} to ${formattedCheckOut} for ${guests} guest${guests > 1 ? 's' : ''}.`;
    this.userInput.set(prompt);
    this.sendMessage();
  }

  // --- Search Results Pagination State & Helpers ---
  public searchResultPages = signal<Record<string, number>>({});
  public readonly searchPageSize = 3;

  public getMsgSearchPage(msg: any): number {
    const msgId = typeof msg === 'string' ? msg : msg?.id;
    if (this.searchResultPages()[msgId]) {
      return this.searchResultPages()[msgId];
    }
    const currentMsg = typeof msg === 'object' ? msg : this.messages().find((m) => m.id === msgId);
    if (currentMsg?.data?.pagination?.current_page) {
      return currentMsg.data.pagination.current_page;
    }
    return 1;
  }

  public setMsgSearchPage(msg: any, page: number): void {
    const msgId = typeof msg === 'string' ? msg : msg?.id;
    const currentMsg = typeof msg === 'object' ? msg : this.messages().find((m) => m.id === msgId);
    const totalPages = this.getMsgTotalSearchPages(currentMsg);
    const targetPage = Math.max(1, Math.min(page, totalPages));
    const currentPage = this.getMsgSearchPage(currentMsg);

    if (targetPage === currentPage && this.searchResultPages()[msgId] === targetPage) {
      return;
    }

    const all = currentMsg?.data?.search_results || [];
    const perPage = currentMsg?.data?.pagination?.per_page || this.searchPageSize;

    // If client has all items in memory (> perPage), switch page locally
    if (all.length > perPage) {
      this.searchResultPages.update((prev) => ({
        ...prev,
        [msgId]: targetPage,
      }));
      return;
    }

    // Otherwise, request the specific page from the AI Assistant
    if (this.isLoading()) return;

    this.searchResultPages.update((prev) => ({
      ...prev,
      [msgId]: targetPage,
    }));

    const searchCall = currentMsg?.data?.tool_calls?.find(
      (tc: any) => tc?.tool === 'search_homestays' || tc?.result?.properties
    );
    const searchArgs = searchCall?.arguments;
    let prompt = `Show page ${targetPage} of the homestay search results`;
    if (searchArgs?.query) {
      prompt = `Show page ${targetPage} of homestays in ${searchArgs.query}`;
      if (searchArgs.check_in_date && searchArgs.check_out_date) {
        prompt += ` from ${searchArgs.check_in_date} to ${searchArgs.check_out_date}`;
      }
      if (searchArgs.guests) {
        prompt += ` for ${searchArgs.guests} guests`;
      }
    }

    this.userInput.set(prompt);
    this.sendMessage();
  }

  public getMsgTotalSearchPages(msg: any): number {
    if (msg?.data?.pagination?.last_page && msg.data.pagination.last_page > 0) {
      return msg.data.pagination.last_page;
    }
    const total = msg?.data?.pagination?.total || msg?.data?.search_results?.length || 0;
    const perPage = msg?.data?.pagination?.per_page || this.searchPageSize;
    return Math.max(1, Math.ceil(total / perPage));
  }

  public getPaginatedSearchResults(msg: any): HomestayCardData[] {
    const all = msg?.data?.search_results || [];
    if (all.length === 0) return [];
    const perPage = msg?.data?.pagination?.per_page || this.searchPageSize;
    if (all.length > perPage) {
      const page = this.getMsgSearchPage(msg);
      const start = (page - 1) * perPage;
      const slice = all.slice(start, start + perPage);
      return slice.length > 0 ? slice : all.slice(0, perPage);
    }
    return all;
  }

  public getMsgPageNumbers(msg: any): number[] {
    const totalPages = this.getMsgTotalSearchPages(msg);
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // --- Pre-Checkout Authentication & Verification Flow ---
  public initiateBookingFromQuote(quote: AvailabilityQuoteData): void {
    if (this.isPaymentDisabled || !quote || quote.is_available === false) {
      return;
    }
    this.pendingCheckoutQuote.set(quote);
    const user = this.currentUser();
    if (user) {
      this.executeBooking(quote);
    } else {
      this.loginError.set('');
      this.regError.set('');
      this.regSuccess.set('');
      this.showAuthModal.set(true);
    }
  }

  public closeAuthModal(): void {
    this.showAuthModal.set(false);
    this.loginError.set('');
    this.regError.set('');
    this.regSuccess.set('');
  }

  public switchAuthTab(tab: 'login' | 'register'): void {
    this.authTab.set(tab);
    this.loginError.set('');
    this.regError.set('');
    this.regSuccess.set('');
  }

  public onLoginSubmit(): void {
    const email = this.loginEmail().trim();
    const password = this.loginPassword();

    if (!email || !password) {
      this.loginError.set('Please provide both email and password.');
      return;
    }

    this.isLoginSubmitting.set(true);
    this.loginError.set('');

    this.authService
      .login({ email, password, rememberMe: true })
      .subscribe({
        next: () => {
          this.isLoginSubmitting.set(false);
          this.showAuthModal.set(false);
          const quote = this.pendingCheckoutQuote();
          if (quote) {
            this.executeBooking(quote);
          }
        },
        error: (err) => {
          this.isLoginSubmitting.set(false);
          const msg =
            this.authService.apiService.extractApiErrorMessage(err) ||
            'Invalid credentials or unverified account. Please try again.';
          this.loginError.set(msg);
        },
      });
  }

  public onRegisterSubmit(): void {
    const fullName = this.regFullName().trim();
    const email = this.regEmail().trim();
    const phone = this.regPhone().trim();
    const password = this.regPassword();

    if (!fullName || !email || !phone || !password) {
      this.regError.set('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      this.regError.set('Password must be at least 8 characters.');
      return;
    }

    this.isRegSubmitting.set(true);
    this.regError.set('');
    this.regSuccess.set('');

    this.userService
      .registerUser({
        full_name: fullName,
        email,
        phone,
        password,
        is_subscriber: true,
        is_terms_accept: true,
      })
      .subscribe({
        next: (res) => {
          this.isRegSubmitting.set(false);
          this.regSuccess.set(
            res.message ||
              `Registration successful! A verification link has been sent to ${email}. Please verify your email to activate your account and complete booking.`
          );
        },
        error: (err) => {
          this.isRegSubmitting.set(false);
          const msg =
            this.userService.apiService.extractApiErrorMessage(err) ||
            'Registration failed. Please check your information and try again.';
          this.regError.set(msg);
        },
      });
  }

  public getQuoteNights(quote: AvailabilityQuoteData | undefined | null): number {
    if (!quote) return 1;
    if (quote.num_nights && quote.num_nights > 0) return quote.num_nights;
    if (quote.nights && quote.nights > 0) return quote.nights;
    if (quote.check_in_date && quote.check_out_date) {
      try {
        const checkIn = new Date(quote.check_in_date).getTime();
        const checkOut = new Date(quote.check_out_date).getTime();
        const diff = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
      } catch {
        return 1;
      }
    }
    return 1;
  }

  private executeBooking(quote: AvailabilityQuoteData): void {
    const roomType = quote.selected_room_type ? ` (${quote.selected_room_type})` : '';
    const formattedCheckIn = this.settingsService.formatDate(quote.check_in_date);
    const formattedCheckOut = this.settingsService.formatDate(quote.check_out_date);
    const prompt = `Proceed to book "${quote.property_name}"${roomType} from ${formattedCheckIn} to ${formattedCheckOut} for ${this.guestCount()} guests.`;
    this.userInput.set(prompt);
    this.sendMessage();
  }

  public payForBooking(bookingOrPayment: any): void {
    if (this.isPaymentDisabled || !bookingOrPayment) return;
    const ref = bookingOrPayment.booking_reference || bookingOrPayment.id || '';
    const bookingId = bookingOrPayment.id || bookingOrPayment.booking_id || bookingOrPayment.public_id || ref;

    this.isPaying.set(ref);
    this.paymentError.set(null);

    const gateway = bookingOrPayment.payment_gateway;

    // If Razorpay gateway parameters are already provided directly
    if (gateway?.order_id && (gateway?.key_id || gateway?.key)) {
      this.openRazorpay(bookingId, bookingOrPayment, gateway);
      return;
    }

    // Otherwise, generate Razorpay order via backend
    this.razorpayService.load().then((loaded) => {
      if (!loaded) {
        this.isPaying.set(null);
        if (gateway?.payment_url) {
          this.openPaymentLink(gateway.payment_url);
        } else {
          this.router.navigate(['/user/bookings']);
        }
        return;
      }

      this.bookingService.createRazorpayOrder(bookingId).subscribe({
        next: (res) => {
          const order = res.data;
          if (order && (order.order_id || (order as any).id)) {
            this.openRazorpay(bookingId, bookingOrPayment, order);
          } else if (gateway?.payment_url) {
            this.isPaying.set(null);
            this.openPaymentLink(gateway.payment_url);
          } else {
            this.isPaying.set(null);
            this.router.navigate(['/user/bookings']);
          }
        },
        error: (err) => {
          this.isPaying.set(null);
          if (gateway?.payment_url) {
            this.openPaymentLink(gateway.payment_url);
          } else {
            const msg =
              this.bookingService.extractApiErrorMessage(err) ||
              'Unable to initiate online payment session. Please try again from My Bookings.';
            this.paymentError.set(msg);
          }
        },
      });
    });
  }

  private openRazorpay(bookingId: string, bookingOrPayment: any, orderData: any): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      this.isPaying.set(null);
      return;
    }

    this.razorpayService.load().then((loaded) => {
      if (!loaded || !(window as any).Razorpay) {
        this.isPaying.set(null);
        if (bookingOrPayment.payment_gateway?.payment_url) {
          this.openPaymentLink(bookingOrPayment.payment_gateway.payment_url);
        }
        return;
      }

      const authUser = this.authService.authUser();
      const key = orderData?.key_id || orderData?.key || orderData?.razorpay_key || 'rzp_test_key';
      const amount = orderData?.amount ?? ((bookingOrPayment.total_amount || 0) * 100);
      const ref = bookingOrPayment.booking_reference || bookingId;

      const options = {
        key: key,
        amount: amount,
        currency: orderData?.currency || bookingOrPayment.currency || 'BTN',
        name: this.appName(),
        description: `Payment for booking ${ref}`,
        order_id: orderData?.order_id || orderData?.id,
        handler: (response: any) => {
          this.verifyPayment(bookingId, ref, response);
        },
        prefill: {
          name: bookingOrPayment.guest?.full_name || authUser?.full_name || '',
          email: bookingOrPayment.guest?.email || authUser?.email || '',
          contact: (authUser as any)?.phone || '',
        },
        theme: { color: '#126A7A' },
        modal: {
          ondismiss: () => {
            this.isPaying.set(null);
          },
        },
      };

      try {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (errRes: any) => {
          this.isPaying.set(null);
          this.paymentError.set(errRes?.error?.description || 'Payment failed or was cancelled.');
        });
        rzp.open();
      } catch (e) {
        console.error('Failed to open Razorpay modal:', e);
        this.isPaying.set(null);
        if (bookingOrPayment.payment_gateway?.payment_url) {
          this.openPaymentLink(bookingOrPayment.payment_gateway.payment_url);
        }
      }
    });
  }

  private verifyPayment(bookingId: string, bookingRef: string, response: any): void {
    const verifyPayload = {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    };

    this.bookingService.verifyRazorpayPayment(bookingId, verifyPayload).subscribe({
      next: () => {
        this.isPaying.set(null);
        this.paymentSuccessRef.set(bookingRef);

        // Append confirmation message in chat
        this.assistantService.messages.update((prev) => [
          ...prev,
          {
            id: generateUUID(),
            sender: 'assistant',
            text: `🎉 **Payment Verified Successfully!**\n\nYour payment for booking reference **${bookingRef}** has been confirmed. You can view full details under **My Bookings**.`,
            timestamp: new Date(),
          },
        ]);
      },
      error: (err) => {
        this.isPaying.set(null);
        const msg =
          this.bookingService.extractApiErrorMessage(err) ||
          'Payment received, verification in progress. Please check My Bookings.';
        this.paymentError.set(msg);
      },
    });
  }

  public openPaymentLink(paymentUrl?: string): void {
    if (!paymentUrl || !isPlatformBrowser(this.platformId)) return;
    try {
      if (paymentUrl.startsWith('/') || paymentUrl.includes(window.location.host)) {
        const path = paymentUrl.startsWith('/') ? paymentUrl : new URL(paymentUrl).pathname;
        this.closeChat();
        this.router.navigateByUrl(path);
      } else {
        window.open(paymentUrl, '_blank');
      }
    } catch {
      window.open(paymentUrl, '_blank');
    }
  }

  public copyBookingReference(ref: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(ref).then(() => {
      this.copiedRef.set(ref);
      setTimeout(() => this.copiedRef.set(null), 2500);
    });
  }

  public formatMarkdown(text: string): string {
    if (!text) return '';

    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-zinc-100">$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/^\s*[\*\-•]\s+(.*)$/gm, '<li class="ml-3 list-disc text-xs text-zinc-700 dark:text-zinc-300 leading-normal">$1</li>');
    escaped = escaped.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li class="ml-3 list-decimal text-xs text-zinc-700 dark:text-zinc-300 leading-normal" value="$1">$2</li>');
    escaped = escaped.replace(/\n/g, '<br/>');

    return escaped;
  }

  private scrollToBottom(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {
      // Ignore scroll errors
    }
  }
}
