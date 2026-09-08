# Frontend Integration Guide: AI Assistant, Vector Engine & Model Context Protocol (MCP)

This document provides complete instructions, endpoint specifications, vector search APIs, S3 vector storage integration, TypeScript models, security details, and Angular component implementations for integrating the **AI Concierge, Vector Engine & MCP API** into the frontend application.

---

## 1. API Endpoints Overview

All assistant, vector engine, and MCP endpoints are served under `/api/v1/public/assistant` and `/api/v1/public/mcp`:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/public/assistant/chat` | Main conversational assistant endpoint with multi-tool calling | Optional (Guest or Logged In) |
| `POST` | `/api/v1/public/assistant/search` | Direct homestay search via assistant engine | No |
| `POST` | `/api/v1/public/assistant/semantic-search` | Natural language / vibe-based vector semantic search | No |
| `POST` | `/api/v1/public/assistant/sync-embeddings` | Index/sync homestay embeddings into vector search engine | Admin / Internal |
| `POST` | `/api/v1/public/assistant/vector-save-s3` | Persist in-memory vector index to S3/MinIO bucket | Admin / Internal |
| `POST` | `/api/v1/public/assistant/vector-load-s3` | Load vector embeddings from S3/MinIO bucket into memory | Admin / Internal |
| `GET` | `/api/v1/public/assistant/vector-status` | Inspect vector engine status, memory index & document count | No |
| `POST` | `/api/v1/public/assistant/checkout` | Direct AI checkout with auto-registration for unregistered guests | Optional (Auto-registers if guest) |
| `GET` | `/api/v1/public/assistant/suggestions` | Fetch dynamic suggested inquiry prompts & action chips | No |
| `POST` | `/api/v1/public/mcp/rpc` | Direct JSON-RPC 2.0 endpoint for MCP client integrations | Optional |
| `GET` | `/api/v1/public/mcp/sse` | Server-Sent Events stream for persistent MCP connections | Optional |
| `GET` | `/api/v1/public/mcp/tools` | List all supported MCP tool schemas | No |

---

## 2. Security & Feature Flags

> [!IMPORTANT]
> **Zero Database Integer ID Exposure**: All entity identifiers exposed by the AI Concierge, Vector Search, and MCP tools are secure **UUID strings** (`public_id`) named simply `"id"`. The frontend should treat all entity IDs (`homestay id`, `booking id`, `guest id`, `room type id`) as opaque UUID strings.

### Environment & Feature Flags (`.env` & `environment.ts`)
| Flag | Default | Description |
| :--- | :--- | :--- |
| `ENABLE_CHATBOX` (`environment.enableChatbox`) | `true` | When set to `false`, completely unmounts and hides the floating AI assistant chatbox launcher. |
| `DISABLE_PAYMENT` (`environment.disablePayment`) | `false` | When set to `true`, disables online booking/payment gateway execution and renders informational notes. |

---

## 3. Request & Response Specifications

### A. Conversational Chat (`POST /api/v1/public/assistant/chat`)

Processes conversational inquiries, detects intent, and executes relevant MCP tools (e.g. searching stays, checking real-time availability, booking, retrieving policies).

#### Request Body
```json
{
  "message": "Find homestays in City Name for 2 guests from 2026-10-10 to 2026-10-15",
  "session_id": "c62b5d4a-39b1-4f93-b6d8-11f26792348a",
  "conversation_history": [
    {
      "role": "user",
      "content": "Hi, I am planning a vacation."
    },
    {
      "role": "assistant",
      "content": "Hello! I would love to help you find comfortable homestays."
    }
  ],
  "guest_name": "Jane Smith",
  "guest_email": "jane.smith@example.com",
  "guest_phone": "+1234567890"
}
```

#### Response Body
```json
{
  "status": "success",
  "message": "Assistant response generated successfully.",
  "data": {
    "reply": "Hello! I found 2 wonderful homestays for your dates:\n\n1. **Sample Mountain Homestay** (City Name) - ₹3,500/night ⭐ 4.9 (12 reviews)\n2. **Valley Retreat** (City Name) - ₹2,800/night ⭐ 4.7 (8 reviews)\n\nWould you like me to check live availability or proceed with a reservation?",
    "session_id": "c62b5d4a-39b1-4f93-b6d8-11f26792348a",
    "intent": "search_homestays",
    "action_taken": "Executed search_homestays",
    "tool_calls": [
      {
        "tool": "search_homestays",
        "arguments": {
          "query": "City Name",
          "check_in_date": "2026-10-10",
          "check_out_date": "2026-10-15",
          "guests": 2
        },
        "result": {
          "total": 2,
          "properties": []
        },
        "is_error": false
      }
    ],
    "search_results": [
      {
        "id": "f5a892b1-6b43-4f24-9b22-4a00bc714f3b",
        "name": "Sample Mountain Homestay",
        "slug": "sample-mountain-homestay",
        "city": "City Name",
        "location": "Hilltop",
        "base_price": 3500.0,
        "currency": "INR",
        "currency_symbol": "₹",
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 1,
        "rating": 4.9,
        "review_count": 12,
        "cover_image": "https://example.com/properties/cover1.webp",
        "property_type": "HOME_STAY"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 3,
      "total": 6,
      "last_page": 2,
      "has_next": true,
      "has_prev": false
    },
    "suggested_actions": [
      "Check availability for Sample Mountain Homestay",
      "Filter by price under ₹3000",
      "Explore homestays in scenic locations"
    ]
  }
}
```

---

### B. Vector Semantic Search (`POST /api/v1/public/assistant/semantic-search`)

Enables natural language, atmosphere, and vibe-based search queries (e.g. *"peaceful wooden cottage with fireplace and scenic mountain view"*).

#### Request Body
```json
{
  "query": "cozy wooden cottage with fireplace and mountain view",
  "city_name": "Mountain Valley",
  "min_price": 2000,
  "max_price": 6000,
  "limit": 6
}
```

#### Response Body
```json
{
  "status": "success",
  "message": "Found 2 matching homestay(s).",
  "data": {
    "query": "cozy wooden cottage with fireplace and mountain view",
    "total_matches": 2,
    "results": [
      {
        "id": "345714b6-b877-49df-8832-03755ad485ce",
        "name": "Pine Wood Sanctuary",
        "slug": "pine-wood-sanctuary",
        "city_name": "Mountain Valley",
        "price_per_night": 3500.0,
        "currency": "INR",
        "currency_symbol": "₹",
        "type": "cottage",
        "similarity_score": 0.892,
        "match_percentage": 94.6,
        "description": "A traditional wooden cottage in the valley with heated fireplace and majestic mountain views.",
        "amenities": ["Fireplace", "Mountain View", "Wooden Bath"]
      }
    ]
  }
}
```

---

### C. Vector Embeddings Engine & S3 Storage APIs

The Vector Search Engine uses embedded vector representations for homestays, persistent storage in S3/MinIO (`VECTOR_S3_BUCKET=tashihome-vector` by default), and in-memory indexing for sub-millisecond similarity lookups.

#### 1. Sync & Re-index Embeddings (`POST /api/v1/public/assistant/sync-embeddings`)
Generates vector embeddings for all active database properties and persists the vector index to S3/MinIO.

**Response:**
```json
{
  "status": "success",
  "message": "Successfully indexed 12 active homestay(s) into vector search engine.",
  "data": {
    "indexed_count": 12,
    "total_indexed": 12,
    "last_synced_at": "2026-09-09T02:18:00.000000",
    "s3_persisted": true,
    "s3_bucket": "tashihome-vector",
    "s3_key": "vectors/homestays_vector_index.json"
  }
}
```

#### 2. Save Vectors to S3 (`POST /api/v1/public/assistant/vector-save-s3`)
Explicitly flushes the current in-memory vector index to persistent S3 / MinIO storage.

**Response:**
```json
{
  "status": "success",
  "message": "Vector embeddings saved to S3 bucket 'tashihome-vector'.",
  "data": {
    "success": true,
    "persisted": true,
    "bucket": "tashihome-vector",
    "key": "vectors/homestays_vector_index.json",
    "total_saved": 12,
    "last_synced_at": "2026-09-09T02:18:00.000000"
  }
}
```

#### 3. Load Vectors from S3 (`POST /api/v1/public/assistant/vector-load-s3`)
Restores vector embeddings from S3 / MinIO into the active in-memory search index.

**Response:**
```json
{
  "status": "success",
  "message": "Loaded 12 vector embedding(s) from S3 bucket 'tashihome-vector'.",
  "data": {
    "success": true,
    "loaded_count": 12,
    "total_indexed": 12,
    "bucket": "tashihome-vector",
    "key": "vectors/homestays_vector_index.json",
    "last_synced_at": "2026-09-09T02:18:00.000000"
  }
}
```

#### 4. Vector Engine Status (`GET /api/v1/public/assistant/vector-status`)
Inspects vector engine health, document count, model dimensionality, and S3 persistence status.

**Response:**
```json
{
  "status": "success",
  "message": "Vector search engine is active.",
  "data": {
    "is_initialized": true,
    "total_documents": 12,
    "embedding_dimension": 384,
    "s3_bucket": "tashihome-vector",
    "s3_key": "vectors/homestays_vector_index.json",
    "s3_connected": true,
    "last_synced_at": "2026-09-09T02:18:00.000000"
  }
}
```

---

### D. Live Availability & Pricing Quote (Room Type Wise & Occupancy Tier Pricing)

When a user asks for availability or pricing for a stay, the assistant dynamically computes pricing using the **Room Type & Guest-Wise Tier Pricing Engine**:

#### Pricing Architecture & Hierarchy
1. **Room Type Variations (`room_types`)**:
   - Properties configure multiple room types (e.g. *Deluxe Mountain Suite*, *Standard Pine Room*), each having capacity, inventory units, standard nightly rate, and guest-wise tier rates.
2. **Guest-Wise Occupancy Pricing Tiers (`pricing_tiers`)**:
   - Each room type supports multiple occupancy tiers (e.g. 1 Guest = ₹3,500, 2 Guests = ₹4,200, 3 Guests = ₹5,000).
   - Each tier defines standard rate (`price_per_night`) and optional promotional rate (`sale_per_night`).
3. **Dynamic Resolution Algorithm**:
   - **Step 1 (Exact Match)**: Find tier where `tier.occupancy == guests_per_room`.
   - **Step 2 (Closest Tier Fallback)**: If no exact match, pick highest tier `<= guests_per_room`, or lowest configured tier if guest count is lower.
   - **Step 3 (Effective Rate Calculation)**: If `sale_per_night > 0 && sale_per_night < price_per_night`, use `sale_per_night`; otherwise use `price_per_night`.
   - **Step 4 (Base Rate Fallback)**: If room type has no tiers configured, fall back to room type `price_per_night`/`sale_per_night`.
4. **Enforcing Upper Bounds & Unavailable States**:
   - **Upper Bound Limits**: Guest selection cannot exceed room `capacity` or property `max_guests`. Room count cannot exceed `total_units` or available units.
   - **Disallowing Booking When Unavailable**: If `is_available: false`, direct booking is prevented, displaying a warning notice and prompting to check alternate dates.

#### Response Data Structure (`AvailabilityQuoteData`)
```json
{
  "property_name": "Sample Mountain Homestay",
  "property_slug": "sample-mountain-homestay",
  "selected_room_type": "Deluxe Mountain Suite",
  "num_guests": 2,
  "applied_tier": {
    "occupancy": 2,
    "price_per_night": 4500.0,
    "sale_per_night": 4200.0
  },
  "room_types": [
    {
      "id": "7b134a62-97bb-41a4-9bdf-8798151240ea",
      "property_room_type_id": "f5193c71-2b0e-473d-9d41-3b7c89fca671",
      "name": "Deluxe Mountain Suite",
      "price_per_night": 4200.0,
      "total_units": 2,
      "capacity": 3,
      "is_selected": true,
      "pricing_tiers": [
        {
          "occupancy": 1,
          "price_per_night": 3500.0,
          "sale_per_night": 3200.0
        },
        {
          "occupancy": 2,
          "price_per_night": 4500.0,
          "sale_per_night": 4200.0
        },
        {
          "occupancy": 3,
          "price_per_night": 5500.0,
          "sale_per_night": 5000.0
        }
      ]
    },
    {
      "id": "e4299b41-5a91-4cf1-88f6-22485fa198cb",
      "property_room_type_id": "018fbc89-9941-479a-bc3e-a1789c671b40",
      "name": "Standard Pine Room",
      "price_per_night": 3000.0,
      "total_units": 4,
      "capacity": 2,
      "is_selected": false,
      "pricing_tiers": [
        {
          "occupancy": 1,
          "price_per_night": 2500.0,
          "sale_per_night": 2200.0
        },
        {
          "occupancy": 2,
          "price_per_night": 3000.0,
          "sale_per_night": 2800.0
        }
      ]
    }
  ],
  "is_available": true,
  "available_units": 2,
  "requested_rooms": 1,
  "check_in_date": "2026-10-10",
  "check_out_date": "2026-10-15",
  "formatted_check_in_date": "10 Oct 2026",
  "formatted_check_out_date": "15 Oct 2026",
  "nights": 5,
  "num_nights": 5,
  "price_per_night": 4200.0,
  "base_amount": 21000.0,
  "subtotal": 21000.0,
  "discount_amount": 0.0,
  "tax_amount": 1050.0,
  "total_amount": 22050.0,
  "currency": "INR",
  "currency_symbol": "₹"
}
```

---

### E. Direct Checkout & Auto-Registration (`POST /api/v1/public/assistant/checkout`)

If an unauthenticated or authenticated guest initiates booking, passing `room_type_id` and `num_guests` calculates the exact guest-wise tiered rate, registers guest user if needed, and initiates the payment gateway session (if payments are enabled).

#### Request Body
```json
{
  "property_id": "sample-mountain-homestay",
  "room_type_id": "7b134a62-97bb-41a4-9bdf-8798151240ea",
  "check_in_date": "2026-10-10",
  "check_out_date": "2026-10-15",
  "num_guests": 2,
  "num_rooms": 1,
  "special_requests": "Vegetarian meals, late check-in",
  "guest_name": "Jane Smith",
  "guest_email": "jane.smith@example.com",
  "guest_phone": "+1234567890",
  "guest_password": "OptionalSecurePassword123!"
}
```

#### Response Body
```json
{
  "status": "success",
  "message": "Checkout completed and booking confirmed.",
  "data": {
    "reply": "🎉 **Reservation Successfully Created!**\n\n• **Booking Reference**: `BK-20261010-9842`\n• **Homestay**: Sample Mountain Homestay (Deluxe Mountain Suite)\n• **Stay Dates**: 10 Oct 2026 to 15 Oct 2026 (5 nights)\n• **Guests**: 2 Guests (Occupancy Tier: 2 Guests)\n• **Nightly Rate**: ₹4,200.0/night\n• **Total Amount**: ₹22,050.0\n\n💳 **Payment Gateway & Checkout**:\n• **Gateway Order ID**: `order_01928374abcd`\n• **Amount Due**: ₹22,050.0\n• **Payment Link**: [Complete Payment Online](http://localhost:4200/bookings/BK-20261010-9842/pay)",
    "intent": "checkout_and_book",
    "action_taken": "Created booking with occupancy-tier pricing, registered guest user, and initiated payment gateway session",
    "booking": {
      "booking_reference": "BK-20261010-9842",
      "id": "c138b14a-89a0-4cfd-872f-53744655ad1e",
      "status": "PENDING",
      "payment_status": "PENDING",
      "property_name": "Sample Mountain Homestay",
      "room_type_name": "Deluxe Mountain Suite",
      "applied_tier": {
        "occupancy": 2,
        "price_per_night": 4500.0,
        "sale_per_night": 4200.0
      },
      "price_per_night": 4200.0,
      "check_in_date": "2026-10-10",
      "check_out_date": "2026-10-15",
      "formatted_check_in_date": "10 Oct 2026",
      "formatted_check_out_date": "15 Oct 2026",
      "num_guests": 2,
      "num_rooms": 1,
      "total_amount": 22050.0,
      "currency": "INR",
      "currency_symbol": "₹",
      "guest": {
        "id": "03b25a40-1bad-47a2-82a7-6de98cdf7a83",
        "full_name": "Jane Smith",
        "email": "jane.smith@example.com"
      },
      "payment_gateway": {
        "gateway": "razorpay",
        "order_id": "order_01928374abcd",
        "key_id": "rzp_test_xxxx",
        "amount": 22050.0,
        "currency": "INR",
        "currency_symbol": "₹",
        "payment_url": "http://localhost:4200/bookings/BK-20261010-9842/pay",
        "status": "initiated"
      }
    },
    "suggested_actions": [
      "Complete payment online",
      "Track booking BK-20261010-9842",
      "View cancellation policy",
      "Explore nearby attractions"
    ]
  }
}
```

---

### F. Initiate Booking Payment Gateway Session

If a guest needs to complete payment for an existing reservation, ask the AI Concierge (e.g., *"Pay for booking BK-20261010-9842"*) or invoke the `initiate_booking_payment` MCP tool:

#### Response Data Structure
```json
{
  "booking_reference": "BK-20261010-9842",
  "id": "c138b14a-89a0-4cfd-872f-53744655ad1e",
  "property_name": "Sample Mountain Homestay",
  "status": "PENDING",
  "payment_status": "PENDING",
  "total_amount": 22050.0,
  "remaining_balance": 22050.0,
  "currency": "INR",
  "currency_symbol": "₹",
  "payment_gateway": {
    "gateway": "razorpay",
    "order_id": "order_01928374abcd",
    "key_id": "rzp_test_xxxx",
    "amount": 22050.0,
    "currency": "INR",
    "payment_url": "http://localhost:4200/bookings/BK-20261010-9842/pay",
    "status": "initiated"
  }
}
```

> [!NOTE]
> **Handling Disabled Payment Mode (`disablePayment: true`)**:
> When `disablePayment` is enabled in `environment.ts`:
> - Online gateway order creation and Razorpay execution are suppressed.
> - The chat UI displays an informational notice: *"Online direct booking and payment is currently disabled."*
> - Direct navigation to homestay details and check dates options remain accessible.

---

## 4. TypeScript Models (`src/app/services/assistant/assistant.model.ts`)

```typescript
export interface AssistantMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  conversation_history?: AssistantMessage[];
  session_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_password?: string;
}

export interface HomestayCardData {
  id: string | number; // Public UUID
  public_id?: string;
  name: string;
  slug: string;
  city?: string;
  location?: string;
  address?: string;
  base_price: number;
  currency: string;
  currency_symbol?: string;
  max_guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  rating?: number;
  review_count?: number;
  cover_image?: string | null;
  property_type?: string;
}

export interface ReviewItem {
  id?: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at?: string;
}

export interface HomestayDetailData extends HomestayCardData {
  description?: string;
  amenities?: string[];
  house_rules?: string[];
  room_types?: PropertyRoomTypeOption[];
  rating_distribution?: Record<string, number>;
  recent_reviews?: ReviewItem[];
  host?: {
    id?: string;
    name?: string;
    avatar?: string;
    is_verified?: boolean;
  };
}

export interface SemanticSearchResult {
  id: string; // Public UUID
  name: string;
  slug: string;
  city_name?: string;
  price_per_night: number;
  currency?: string;
  currency_symbol?: string;
  type?: string;
  similarity_score?: number;
  match_percentage?: number;
  description?: string;
  amenities?: string[];
  cover_image?: string | null;
}

/**
 * Guest-wise / Occupancy-wise Price Tier
 */
export interface PropertyRoomTypePriceTier {
  id?: string;
  occupancy: number; // e.g. 1, 2, 3, 4 guests
  price_per_night: number; // e.g. 3500.0, 4500.0, 5500.0
  base_price?: number;
  sale_per_night?: number; // e.g. 3200.0, 4200.0
}

/**
 * Room Type Option with Room-wise & Guest-wise pricing tiers
 */
export interface PropertyRoomTypeOption {
  id: string; // Public UUID
  property_room_type_id?: string;
  name: string;
  price_per_night: number;
  total_units?: number;
  capacity?: number;
  pricing_tiers?: PropertyRoomTypePriceTier[]; // Capacity / guest-wise rates
  is_selected?: boolean;
}

/**
 * Live Availability & Pricing Quote with Room Type & Occupancy Tier Resolution
 */
export interface AvailabilityQuoteData {
  property_name: string;
  property_slug?: string;
  selected_room_type?: string;
  room_types?: PropertyRoomTypeOption[];
  applied_tier?: {
    occupancy: number;
    price_per_night: number;
    sale_per_night?: number;
  };
  num_guests?: number;
  is_available: boolean;
  available_units?: number;
  requested_rooms?: number;
  check_in_date: string; // ISO format (YYYY-MM-DD)
  check_out_date: string; // ISO format (YYYY-MM-DD)
  formatted_check_in_date?: string; // Display format (e.g. "10 Oct 2026")
  formatted_check_out_date?: string;
  nights?: number;
  num_nights?: number;
  price_per_night?: number;
  base_amount?: number;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  currency: string;
  currency_symbol?: string;
}

export interface PaymentGatewayInfo {
  gateway: string; // "razorpay"
  order_id: string; // Razorpay Order ID
  key_id?: string; // Razorpay Key ID
  amount: number;
  currency: string;
  payment_url: string;
  status: "initiated" | "pending" | "success" | "failed";
}

export interface BookingConfirmationData {
  booking_reference: string;
  id?: string | number;
  booking_id?: number | string;
  public_id?: string;
  status: string;
  payment_status: string;
  property_name: string;
  room_type_name?: string;
  applied_tier?: {
    occupancy: number;
    price_per_night: number;
    sale_per_night?: number;
  };
  price_per_night?: number;
  check_in_date: string;
  check_out_date: string;
  formatted_check_in_date?: string;
  formatted_check_out_date?: string;
  num_guests: number;
  num_rooms?: number;
  total_amount: number;
  currency: string;
  currency_symbol?: string;
  guest?: {
    id?: string | number;
    full_name?: string;
    email?: string;
  };
  payment_gateway?: PaymentGatewayInfo;
}

export interface AssistantPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface AssistantToolCall {
  tool: string;
  arguments?: Record<string, any>;
  result?: any;
  is_error?: boolean;
}

export interface AssistantChatData {
  reply: string;
  session_id?: string;
  intent?: string;
  action_taken?: string;
  tool_calls?: AssistantToolCall[];
  search_results?: HomestayCardData[];
  pagination?: AssistantPagination;
  availability?: AvailabilityQuoteData | null;
  booking?: BookingConfirmationData | null;
  payment?: {
    booking_reference: string;
    id: string;
    property_name?: string;
    status: string;
    payment_status: string;
    total_amount: number;
    remaining_balance: number;
    currency: string;
    currency_symbol: string;
    payment_gateway: PaymentGatewayInfo;
  };
  user?: any;
  suggested_actions?: string[];
}

export interface AssistantApiResponse<T> {
  status: string | boolean;
  message: string;
  data: T;
}

export interface SuggestionItem {
  title: string;
  prompt: string;
  category?: string;
}

export interface AssistantCheckoutRequest {
  property_id: string;
  room_type_id?: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  num_rooms?: number;
  special_requests?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_password?: string;
}

export interface ChatMessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  data?: AssistantChatData;
  isLoading?: boolean;
}

export interface VectorStatusData {
  is_initialized: boolean;
  total_documents: number;
  embedding_dimension: number;
  s3_bucket: string;
  s3_key: string;
  s3_connected: boolean;
  last_synced_at?: string;
}
```

---

## 5. Client-Side Pricing Resolver Helper (`src/app/utils/pricing.utils.ts`)

```typescript
import { PropertyRoomTypeOption, PropertyRoomTypePriceTier } from '../services/assistant/assistant.model';

export interface RoomNightlyRateResult {
  effectivePrice: number;
  standardPrice: number;
  isDiscounted: boolean;
  appliedOccupancy?: number;
}

export function getRoomNightlyRate(
  room: PropertyRoomTypeOption | undefined | null,
  guestsPerRoom: number,
  fallbackPrice: number = 0
): RoomNightlyRateResult {
  const safeGuests = Math.max(1, Math.floor(guestsPerRoom || 1));
  const tiers = room?.pricing_tiers || [];

  if (tiers.length > 0) {
    const sortedTiers = [...tiers].sort((a, b) => a.occupancy - b.occupancy);

    // 1. Exact Match
    let matchedTier = sortedTiers.find((t) => t.occupancy === safeGuests);

    // 2. Closest Match fallback
    if (!matchedTier) {
      const lower = sortedTiers.filter((t) => t.occupancy <= safeGuests);
      matchedTier = lower.length > 0 ? lower[lower.length - 1] : sortedTiers[0];
    }

    if (matchedTier) {
      const standard = Number(matchedTier.price_per_night) || 0;
      const sale = Number(matchedTier.sale_per_night) || 0;
      const isDiscounted = sale > 0 && (standard === 0 || sale < standard);
      const effective = isDiscounted ? sale : standard;

      return {
        effectivePrice: effective,
        standardPrice: standard,
        isDiscounted,
        appliedOccupancy: matchedTier.occupancy,
      };
    }
  }

  // Fallback to room standard rate
  const roomStandard = Number(room?.price_per_night) || fallbackPrice;
  return {
    effectivePrice: roomStandard,
    standardPrice: roomStandard,
    isDiscounted: false,
    appliedOccupancy: undefined
  };
}
```

---

## 6. Angular Service Implementation (`src/app/services/assistant/assistant-service.ts`)

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import {
  AssistantChatRequest,
  AssistantChatData,
  SemanticSearchResult,
  SuggestionItem,
  VectorStatusData
} from './assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly apiService = inject(ApiService);

  public sendMessage(payload: AssistantChatRequest): Observable<ApiResponse<AssistantChatData>> {
    return this.apiService.post<AssistantChatData>('/public/assistant/chat', payload);
  }

  public semanticSearch(
    query: string,
    cityName?: string,
    minPrice?: number,
    maxPrice?: number,
    limit = 6
  ): Observable<ApiResponse<{ query: string; total_matches: number; results: SemanticSearchResult[] }>> {
    return this.apiService.post<{ query: string; total_matches: number; results: SemanticSearchResult[] }>(
      '/public/assistant/semantic-search',
      { query, city_name: cityName, min_price: minPrice, max_price: maxPrice, limit }
    );
  }

  public syncEmbeddings(): Observable<ApiResponse<any>> {
    return this.apiService.post('/public/assistant/sync-embeddings', {});
  }

  public saveVectorsToS3(): Observable<ApiResponse<any>> {
    return this.apiService.post('/public/assistant/vector-save-s3', {});
  }

  public loadVectorsFromS3(): Observable<ApiResponse<any>> {
    return this.apiService.post('/public/assistant/vector-load-s3', {});
  }

  public getVectorStatus(): Observable<ApiResponse<VectorStatusData>> {
    return this.apiService.get<VectorStatusData>('/public/assistant/vector-status');
  }

  public getSuggestions(): Observable<ApiResponse<{ suggestions: SuggestionItem[] }>> {
    return this.apiService.get<{ suggestions: SuggestionItem[] }>('/public/assistant/suggestions');
  }
}
```

---

## 7. Angular UI Component Template & Cards

### Template (`src/app/shared/components/ai-assistant/ai-assistant.html`)

```html
<!-- AVAILABILITY & PRICE BREAKDOWN CARD (Room-Type & Guest-Wise Pricing) -->
<div *ngIf="msg.data?.availability && !msg.data?.booking" class="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-2.5">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold text-teal-900 dark:text-teal-200">
      {{ msg.data!.availability!.property_name }}
    </span>
    <span
      class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      [ngClass]="msg.data!.availability!.is_available ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'"
    >
      {{ msg.data!.availability!.is_available ? 'Available' : 'Unavailable' }}
    </span>
  </div>

  <!-- Room Types & Guest-Wise Tier Rates -->
  <div *ngIf="msg.data!.availability!.room_types && msg.data!.availability!.room_types!.length > 0" class="space-y-1.5 pt-1">
    <span class="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Select Room Type:</span>
    <div class="grid grid-cols-1 gap-1.5">
      <div
        *ngFor="let room of msg.data!.availability!.room_types"
        (click)="switchRoomTypeQuote(msg.data!.availability!, room)"
        [ngClass]="room.is_selected || msg.data!.availability!.selected_room_type === room.name ? 'border-[#126A7A] bg-teal-100/60 dark:bg-teal-900/40 text-teal-950 dark:text-teal-100 ring-1 ring-[#126A7A]' : 'border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:border-teal-300 cursor-pointer'"
        class="p-2.5 rounded-lg border text-xs space-y-1.5 transition-all"
      >
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ room.name }}</span>
          <div class="font-bold text-[#126A7A] dark:text-teal-300">
            {{ msg.data!.availability!.currency_symbol || msg.data!.availability!.currency }} {{ room.price_per_night | number }}<span class="text-[10px] font-normal text-zinc-500">/nt</span>
          </div>
        </div>

        <!-- Guest-wise Tier Pricing Chips -->
        <div *ngIf="room.pricing_tiers && room.pricing_tiers.length > 0" class="flex flex-wrap gap-1 pt-0.5">
          <span
            *ngFor="let tier of room.pricing_tiers"
            class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600"
            [ngClass]="{'border-[#126A7A] font-bold text-[#126A7A] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60': msg.data!.availability!.applied_tier?.occupancy === tier.occupancy}"
          >
            {{ tier.occupancy }} {{ tier.occupancy === 1 ? 'Guest' : 'Guests' }}: {{ msg.data!.availability!.currency_symbol || msg.data!.availability!.currency }} {{ (tier.sale_per_night || tier.price_per_night) | number }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Stay Dates & Occupancy Info -->
  <div class="grid grid-cols-2 gap-2 text-[11px] bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/40">
    <div>
      <span class="text-zinc-500">Dates:</span>
      <div class="font-medium text-zinc-800 dark:text-zinc-200">
        {{ msg.data!.availability!.check_in_date | appDate }} to {{ msg.data!.availability!.check_out_date | appDate }}
      </div>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <span class="text-zinc-500">Guests & Duration:</span>
        <div class="font-medium text-zinc-800 dark:text-zinc-200">
          {{ msg.data!.availability!.num_guests || 1 }} Guest(s) • {{ getQuoteNights(msg.data!.availability) }} nt
        </div>
      </div>
      <button
        (click)="openAvailabilityModalFromQuote(msg.data!.availability!)"
        type="button"
        class="px-2 py-1 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-[#126A7A] dark:text-teal-300 rounded text-[10px] font-semibold transition-colors flex items-center gap-0.5"
      >
        <span>📅</span> Change
      </button>
    </div>
  </div>

  <!-- Price Summary -->
  <div class="space-y-1 text-xs pt-1 border-t border-teal-200/60 dark:border-teal-800/40">
    <div class="flex justify-between text-zinc-600 dark:text-zinc-300 text-[11px]">
      <span>Rate ({{ msg.data!.availability!.applied_tier?.occupancy || msg.data!.availability!.num_guests || 1 }} Guests tier)</span>
      <span>{{ msg.data!.availability!.currency_symbol || msg.data!.availability!.currency }} {{ msg.data!.availability!.price_per_night | number }} × {{ getQuoteNights(msg.data!.availability) }} nt</span>
    </div>
    <div *ngIf="msg.data!.availability!.tax_amount" class="flex justify-between text-zinc-600 dark:text-zinc-300 text-[11px]">
      <span>Tax & Fees</span>
      <span>{{ msg.data!.availability!.currency_symbol || msg.data!.availability!.currency }} {{ msg.data!.availability!.tax_amount | number }}</span>
    </div>
    <div class="flex justify-between font-bold text-teal-950 dark:text-teal-200 text-xs pt-1 border-t border-teal-100 dark:border-teal-900/30">
      <span>Total Amount</span>
      <span>{{ msg.data!.availability!.currency_symbol || msg.data!.availability!.currency }} {{ msg.data!.availability!.total_amount | number }}</span>
    </div>
  </div>

  <!-- Actions: Respect isPaymentDisabled and is_available -->
  <!-- When Payment is Disabled -->
  <div *ngIf="isPaymentDisabled" class="space-y-2 pt-0.5">
    <div class="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <span>ℹ️</span> Online direct booking is currently disabled.
    </div>
    <div class="flex gap-2">
      <a
        *ngIf="msg.data!.availability!.property_slug"
        [routerLink]="['/stay', msg.data!.availability!.property_slug]"
        (click)="closeChat()"
        class="flex-1 py-2 bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-200 dark:hover:bg-white dark:text-zinc-900 font-semibold text-xs rounded-lg shadow-sm transition-colors text-center cursor-pointer"
      >
        View Homestay
      </a>
      <button
        (click)="openAvailabilityModalFromQuote(msg.data!.availability!)"
        type="button"
        class="flex-1 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg transition-colors text-center flex items-center justify-center gap-1 cursor-pointer"
      >
        <span>📅</span> Check Dates
      </button>
    </div>
  </div>

  <!-- When Payment is Enabled -->
  <div *ngIf="!isPaymentDisabled">
    <div *ngIf="msg.data!.availability!.is_available" class="pt-0.5">
      <button
        (click)="initiateBookingFromQuote(msg.data!.availability!)"
        type="button"
        class="w-full py-2 bg-[#FAA52D] hover:bg-[#e89624] text-zinc-900 font-semibold text-xs rounded-lg shadow-sm transition-colors text-center cursor-pointer"
      >
        Instant Book & Pay Online
      </button>
    </div>

    <div *ngIf="!msg.data!.availability!.is_available" class="space-y-2 pt-0.5">
      <div class="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60">
        <span>⚠️</span> This stay is unavailable for the selected dates. Please select different dates.
      </div>
      <button
        (click)="openAvailabilityModalFromQuote(msg.data!.availability!)"
        type="button"
        class="w-full py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg transition-colors text-center flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>📅</span> Check Different Dates
      </button>
    </div>
  </div>
</div>
```

---

## 8. Natural Language Vibe Search Bar Component Example

Add a smart semantic vector search bar anywhere in your application:

```html
<div class="vibe-search-bar">
  <input
    type="text"
    [(ngModel)]="vibeQuery"
    (keyup.enter)="onVibeSearch()"
    placeholder="✨ Try: 'Cozy wooden cottage with fireplace & scenic mountain view'"
  />
  <button (click)="onVibeSearch()">Search</button>
</div>

<!-- Results with Match Badges -->
<div class="results-grid" *ngIf="vibeResults.length">
  <div class="stay-card" *ngFor="let item of vibeResults">
    <div class="vibe-badge" *ngIf="item.match_percentage">
      ✨ {{ item.match_percentage }}% Match
    </div>
    <h4>{{ item.name }}</h4>
    <p>{{ item.city_name }} • {{ item.currency_symbol || item.currency }} {{ item.price_per_night | number }}/night</p>
  </div>
</div>
```

---

## 9. MCP Resources Protocol (`/api/v1/public/mcp/rpc`)

MCP clients can query registered resources via standard JSON-RPC 2.0:

### List Resources (`resources/list`)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {}
}
```

### Read Featured Cities Resource (`resources/read`)
Fetches live featured destinations directly from the database:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "app://featured-cities"
  }
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "app://featured-cities",
        "mimeType": "application/json",
        "text": "[\n  {\n    \"id\": \"01928374-abcd-7000-8000-000000000001\",\n    \"name\": \"City Name\",\n    \"slug\": \"city-name\",\n    \"tag_line\": \"Scenic Mountain Gateway\",\n    \"short_description\": \"A serene escape surrounded by nature.\",\n    \"image_url\": \"https://example.com/cities/city-name.webp\",\n    \"is_featured\": true,\n    \"country\": \"Country Name\"\n  }\n]"
      }
    ]
  }
}
```

---

## 10. Dynamic Country, City & Location Discovery

The AI Assistant and MCP system operates with **zero hardcoded country or city assumptions**:

1. **Multi-Region Deployments**:
   - The platform dynamically resolves the active country from database platform settings (`country` / `default_country`) or the active country records.
   - All destination lists (`app://destinations`, `app://featured-cities`, `get_popular_destinations`) query live database cities and locations.
   - Zero hardcoded fallback lists of cities remain; the assistant queries the database dynamically and renders destination chips based on real database records.

2. **Suggested Prompt Chips (`GET /api/v1/public/assistant/suggestions`)**:
   - Suggested prompts adapt in real time to the database's active featured cities, popular homestays, and platform settings.

3. **Dynamic Zero-Match Search Enrichment**:
   - If a guest searches for an unknown or unlisted location, the assistant intelligently lists top active cities from the database rather than a static list.
