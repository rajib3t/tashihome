import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, of } from 'rxjs';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import { AuthService } from '../auth/auth-service';
import { SettingsService } from '../settings/settings-service';
import {
  AssistantChatData,
  AssistantChatRequest,
  AssistantCheckoutRequest,
  AssistantMessage,
  AssistantStreamEvent,
  ChatMessageItem,
  SuggestionItem,
  SemanticSearchResult,
} from './assistant.model';

const STORAGE_SESSION_KEY = 'tashihome_assistant_session_id';

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

function extractAssistantChatData(res: any): AssistantChatData {
  if (!res) {
    return { reply: '' };
  }

  // Handle various levels of nesting:
  // 1. res.data.data (if ApiService wraps { status: "success", data: { reply: ... } })
  // 2. res.data (if ApiService wraps { reply: ... } directly)
  // 3. res (if raw object)
  let chatData: any = res;

  if (chatData?.data && typeof chatData.data === 'object' && ('reply' in chatData.data || 'search_results' in chatData.data || 'tool_calls' in chatData.data)) {
    chatData = chatData.data;
  } else if (chatData?.data?.data && typeof chatData.data.data === 'object') {
    chatData = chatData.data.data;
  }

  // If search_results is missing or empty, extract from tool_calls.result.properties if present
  if (!chatData.search_results || chatData.search_results.length === 0) {
    if (chatData.tool_calls && Array.isArray(chatData.tool_calls)) {
      const searchCall = chatData.tool_calls.find(
        (tc: any) => tc?.tool === 'search_homestays' || tc?.result?.properties
      );
      if (searchCall?.result?.properties && Array.isArray(searchCall.result.properties)) {
        chatData.search_results = searchCall.result.properties;
      }
    }
  }

  // If availability is missing or empty, extract from tool_calls if present
  if (!chatData.availability && chatData.tool_calls && Array.isArray(chatData.tool_calls)) {
    const availCall = chatData.tool_calls.find(
      (tc: any) =>
        tc?.tool === 'check_availability' ||
        tc?.tool === 'check_homestay_availability' ||
        tc?.tool === 'get_pricing_quote' ||
        tc?.result?.is_available !== undefined ||
        tc?.result?.total_amount !== undefined
    );
    if (availCall?.result && typeof availCall.result === 'object') {
      chatData.availability = availCall.result;
    }
  }

  // If booking is missing or empty, extract from tool_calls if present
  if (!chatData.booking && chatData.tool_calls && Array.isArray(chatData.tool_calls)) {
    const bookingCall = chatData.tool_calls.find(
      (tc: any) =>
        tc?.tool === 'create_booking' ||
        tc?.tool === 'checkout' ||
        tc?.result?.booking_reference
    );
    if (bookingCall?.result && typeof bookingCall.result === 'object') {
      chatData.booking = bookingCall.result;
    }
  }

  // If payment is missing or empty, extract from tool_calls if present
  if (!chatData.payment && chatData.tool_calls && Array.isArray(chatData.tool_calls)) {
    const payCall = chatData.tool_calls.find(
      (tc: any) =>
        tc?.tool === 'initiate_booking_payment' ||
        tc?.tool === 'initiate_payment' ||
        tc?.tool === 'pay_booking' ||
        tc?.result?.payment_gateway ||
        (tc?.result?.booking_reference && tc?.result?.remaining_balance !== undefined)
    );
    if (payCall?.result && typeof payCall.result === 'object') {
      chatData.payment = payCall.result;
    }
  }

  // Normalize pagination if present or extract if missing
  if (chatData.pagination) {
    const p = chatData.pagination;
    const total = Number(p.total ?? (chatData.search_results?.length || 0));
    const perPage = Number(p.per_page || p.limit || 3);
    const currentPage = Number(p.current_page || p.page || 1);
    const lastPage = Number(p.last_page || p.total_pages || Math.max(1, Math.ceil(total / perPage)));
    chatData.pagination = {
      current_page: currentPage,
      per_page: perPage,
      total: total,
      last_page: lastPage,
      has_next: p.has_next !== undefined ? Boolean(p.has_next) : currentPage < lastPage,
      has_prev: p.has_prev !== undefined ? Boolean(p.has_prev) : currentPage > 1,
    };
  } else {
    if (chatData.tool_calls && Array.isArray(chatData.tool_calls)) {
      const searchCall = chatData.tool_calls.find(
        (tc: any) => tc?.tool === 'search_homestays' || tc?.result?.properties
      );
      if (searchCall?.result) {
        const total = Number(searchCall.result.total ?? (chatData.search_results?.length || 0));
        const page = Number(searchCall.result.page || searchCall.result.current_page || 1);
        const perPage = Number(searchCall.result.per_page || searchCall.result.limit || 3);
        const lastPage = Number(searchCall.result.total_pages || searchCall.result.last_page || Math.max(1, Math.ceil(total / perPage)));
        chatData.pagination = {
          current_page: page,
          per_page: perPage,
          total: total,
          last_page: lastPage,
          has_next: page < lastPage,
          has_prev: page > 1,
        };
      }
    }

    if (!chatData.pagination && chatData.search_results && chatData.search_results.length > 0) {
      const total = chatData.search_results.length;
      const perPage = 3;
      const lastPage = Math.max(1, Math.ceil(total / perPage));
      chatData.pagination = {
        current_page: 1,
        per_page: perPage,
        total: total,
        last_page: lastPage,
        has_next: lastPage > 1,
        has_prev: false,
      };
    }
  }

  return chatData as AssistantChatData;
}

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly platformId = inject(PLATFORM_ID);

  public readonly isChatOpen = signal<boolean>(false);
  public readonly isLoading = signal<boolean>(false);
  public readonly sessionId = signal<string>(generateUUID());
  public readonly suggestions = signal<SuggestionItem[]>([]);
  public readonly messages = signal<ChatMessageItem[]>([]);

  constructor() {
    this.initWelcomeMessage();
    this.initSession();
    this.loadSuggestions();
  }

  private initWelcomeMessage(): void {
    const appName = this.settingsService.appName();
    this.messages.set([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: `Hello! 🙏 I am your AI Concierge for **${appName}**.\n\nI can help you discover homestays, check real-time availability, get instant quotes, and complete direct bookings.\n\nHow can I help you today?`,
        timestamp: new Date(),
      },
    ]);
  }

  private initSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        this.sessionId.set(stored);
      } else {
        const newId = generateUUID();
        this.sessionId.set(newId);
        localStorage.setItem(STORAGE_SESSION_KEY, newId);
      }
    } catch {
      // Ignore storage errors
    }
  }

  public toggleChat(): void {
    this.isChatOpen.update((open) => !open);
  }

  public openChat(): void {
    this.isChatOpen.set(true);
  }

  public closeChat(): void {
    this.isChatOpen.set(false);
  }

  public clearChat(): void {
    const newId = generateUUID();
    this.sessionId.set(newId);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, newId);
      } catch {
        // Ignore storage errors
      }
    }

    this.messages.set([
      {
        id: generateUUID(),
        sender: 'assistant',
        text: 'Hello! 🙏 Conversation cleared. How may I assist your homestay search today?',
        timestamp: new Date(),
      },
    ]);
  }

  public loadSuggestions(): void {
    this.apiService
      .get<{ suggestions: SuggestionItem[] }>('/public/assistant/suggestions')
      .pipe(
        catchError(() =>
          of({
            data: {
              suggestions: [
                {
                  title: 'Find Homestays',
                  prompt: 'Show me top rated homestays for 2 guests.',
                  category: 'search',
                },
                {
                  title: 'Scenic Getaways',
                  prompt: 'What are the best homestays with scenic mountain views?',
                  category: 'search',
                },
                {
                  title: 'Heritage Experience',
                  prompt: 'Recommend authentic farm stays and heritage experiences.',
                  category: 'experience',
                },
                {
                  title: 'Check Rates & Dates',
                  prompt: 'Check room availability and prices for this weekend.',
                  category: 'quote',
                },
              ],
            },
            status: 200,
            message: 'Fallback suggestions',
          } as ApiResponse<{ suggestions: SuggestionItem[] }>)
        )
      )
      .subscribe((res) => {
        const raw: any = res?.data;
        const list = raw?.suggestions || raw?.data?.suggestions;
        if (list && Array.isArray(list)) {
          this.suggestions.set(list);
        }
      });
  }

  public async sendMessageStream(
    text: string,
    guestInfo?: { name?: string; email?: string; phone?: string; password?: string }
  ): Promise<void> {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const authUser = this.authService.authUser();
    const guestName = guestInfo?.name || authUser?.full_name;
    const guestEmail = guestInfo?.email || authUser?.email;
    const guestPhone = guestInfo?.phone || (authUser as any)?.phone_number;

    const userMessageId = generateUUID();
    this.messages.update((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: trimmedText,
        timestamp: new Date(),
      },
    ]);

    this.isLoading.set(true);

    const history: AssistantMessage[] = this.messages()
      .filter((m) => m.id !== 'welcome-msg' && m.id !== userMessageId)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    const payload: AssistantChatRequest = {
      message: trimmedText,
      conversation_history: history.slice(-10),
      session_id: this.sessionId(),
      guest_name: guestName || undefined,
      guest_email: guestEmail || undefined,
      guest_phone: guestPhone || undefined,
      guest_password: guestInfo?.password || undefined,
    };

    const assistantMessageId = generateUUID();
    let hasAddedAssistantMessage = false;

    try {
      const url = `${this.apiService.apiBaseUrl}/public/assistant/chat/stream`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // Initialize placeholder assistant message
      this.messages.update((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          sender: 'assistant',
          text: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);
      hasAddedAssistantMessage = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ''; // Keep incomplete trailing chunk

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

          const jsonStr = trimmedLine.replace(/^data:\s*/, '').trim();
          if (!jsonStr || jsonStr === '[DONE]') {
            this.messages.update((prev) =>
              prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg))
            );
            continue;
          }

          try {
            const event: AssistantStreamEvent = JSON.parse(jsonStr);

            if (event.type === 'start' && event.session_id) {
              this.sessionId.set(event.session_id);
            } else if (event.type === 'token' && event.text !== undefined) {
              this.messages.update((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId ? { ...msg, text: msg.text + event.text } : msg
                )
              );
            } else if (event.type === 'metadata') {
              const chatData = extractAssistantChatData({ data: event });
              if (event.session_id) {
                this.sessionId.set(event.session_id);
              }
              this.messages.update((prev) =>
                prev.map((msg) => {
                  if (msg.id === assistantMessageId) {
                    const existingData = msg.data || { reply: msg.text };
                    return {
                      ...msg,
                      data: {
                        ...existingData,
                        ...chatData,
                        reply: msg.text || chatData.reply || '',
                      },
                    };
                  }
                  return msg;
                })
              );
            } else if (event.type === 'done') {
              this.messages.update((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg))
              );
            } else if (event.type === 'error') {
              const errorText = event.message || 'An error occurred while generating the response.';
              this.messages.update((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        text: msg.text ? `${msg.text}\n\n⚠️ ${errorText}` : errorText,
                        isStreaming: false,
                      }
                    : msg
                )
              );
            }
          } catch (e) {
            console.error('Error parsing SSE event:', jsonStr, e);
          }
        }
      }
    } catch (err: any) {
      console.warn('SSE streaming request failed, falling back:', err);
      if (!hasAddedAssistantMessage) {
        this.messages.update((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            sender: 'assistant',
            text: 'I experienced a temporary connection delay. Please try asking again.',
            timestamp: new Date(),
            isStreaming: false,
          },
        ]);
      } else {
        this.messages.update((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  text: msg.text || 'I experienced a temporary connection delay. Please try asking again.',
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      this.isLoading.set(false);
      this.messages.update((prev) =>
        prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg))
      );
    }
  }

  public sendMessage(
    text: string,
    guestInfo?: { name?: string; email?: string; phone?: string; password?: string }
  ): Observable<ApiResponse<AssistantChatData>> {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return of({
        status: 400,
        message: 'Empty message',
        data: { reply: '' },
      } as ApiResponse<AssistantChatData>);
    }

    const authUser = this.authService.authUser();
    const guestName = guestInfo?.name || authUser?.full_name;
    const guestEmail = guestInfo?.email || authUser?.email;
    const guestPhone = guestInfo?.phone || (authUser as any)?.phone_number;

    const userMessageId = generateUUID();
    this.messages.update((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: trimmedText,
        timestamp: new Date(),
      },
    ]);

    this.isLoading.set(true);

    const history: AssistantMessage[] = this.messages()
      .filter((m) => m.id !== 'welcome-msg')
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    const payload: AssistantChatRequest = {
      message: trimmedText,
      conversation_history: history.slice(-10), // Send last 10 messages for context window efficiency
      session_id: this.sessionId(),
      guest_name: guestName || undefined,
      guest_email: guestEmail || undefined,
      guest_phone: guestPhone || undefined,
      guest_password: guestInfo?.password || undefined,
    };

    return this.apiService
      .post<AssistantChatData>('/public/assistant/chat', payload)
      .pipe(
        tap({
          next: (res) => {
            this.isLoading.set(false);
            const chatData = extractAssistantChatData(res);
            
            if (chatData?.session_id) {
              this.sessionId.set(chatData.session_id);
            }

            this.messages.update((prev) => [
              ...prev,
              {
                id: generateUUID(),
                sender: 'assistant',
                text: chatData.reply || 'Here is what I found for you.',
                timestamp: new Date(),
                data: chatData,
              },
            ]);
          },
          error: (err) => {
            this.isLoading.set(false);
            const errorMsg =
              this.apiService.extractApiErrorMessage(err) ||
              'I experienced a temporary connection delay. Please try asking again.';
            this.messages.update((prev) => [
              ...prev,
              {
                id: generateUUID(),
                sender: 'assistant',
                text: errorMsg,
                timestamp: new Date(),
              },
            ]);
          },
        })
      );
  }

  public semanticSearch(
    query: string,
    cityName?: string,
    minPrice?: number,
    maxPrice?: number,
    limit = 8
  ): Observable<ApiResponse<{ query: string; total_matches: number; results: SemanticSearchResult[] }>> {
    return this.apiService.post<{ query: string; total_matches: number; results: SemanticSearchResult[] }>(
      '/public/assistant/semantic-search',
      { query, city_name: cityName, min_price: minPrice, max_price: maxPrice, limit }
    );
  }

  public checkout(
    checkoutData: AssistantCheckoutRequest
  ): Observable<ApiResponse<AssistantChatData>> {
    this.isLoading.set(true);

    return this.apiService
      .post<AssistantChatData>('/public/assistant/checkout', checkoutData)
      .pipe(
        tap({
          next: (res) => {
            this.isLoading.set(false);
            const chatData = extractAssistantChatData(res);

            if (chatData?.session_id) {
              this.sessionId.set(chatData.session_id);
            }

            this.messages.update((prev) => [
              ...prev,
              {
                id: generateUUID(),
                sender: 'assistant',
                text: chatData.reply || 'Your reservation has been processed successfully!',
                timestamp: new Date(),
                data: chatData,
              },
            ]);
          },
          error: (err) => {
            this.isLoading.set(false);
            const errorMsg =
              this.apiService.extractApiErrorMessage(err) ||
              'Unable to complete booking checkout at this time. Please review your details and try again.';
            this.messages.update((prev) => [
              ...prev,
              {
                id: generateUUID(),
                sender: 'assistant',
                text: errorMsg,
                timestamp: new Date(),
              },
            ]);
          },
        })
      );
  }
}
