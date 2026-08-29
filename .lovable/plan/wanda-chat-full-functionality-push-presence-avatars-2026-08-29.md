# Wanda Chat — Full Functionality, Push, Presence, Avatars

## Important note on Wi-Fi Direct / Bluetooth

The app runs in the browser (Android, iPhone, Windows), and browsers do not allow
apps to send messages over Wi-Fi Direct or Bluetooth peer-to-peer. That is only
possible in a native Android build. So the chat will keep using the internet, but
it will be built as an ultra-low-data, zero-rating-ready channel:

- Text-first: messages are tiny (a few hundred bytes each).
- Images are compressed in the phone before upload (long edge 1280px, ~150 KB).
- Videos/documents capped, with a clear size warning before sending.
- A "Data Saver" toggle: media only downloads when you tap it.
- Offline queue: messages typed with no signal are stored on the device and sent
  automatically when connection returns.
- Everything served from one domain so a mobile network can zero-rate it, plus a
  visible "Zero-rated channel" badge in the chat header.

## What gets built

### 1. Avatars / profile pictures
- Upload and crop-to-square profile photo on the profile page, stored in the
  existing avatars bucket, saved to the profile record.
- Avatars shown everywhere: chat list, chat header, message rows in group chats,
  new-chat member search, and the app header.
- Falls back to a gold initial medallion when no photo exists.

### 2. Online / offline presence
- Live presence so you can see who is online right now.
- Chat list shows a green dot for online, "last seen ..." for offline.
- Chat header shows "online" / "last seen today at 14:03" and "typing…".
- A counter at the top of the chat page: "X of Y members online".

### 3. Push notifications (background)
- Firebase Cloud Messaging connected so notifications arrive even when the app is
  closed. You will get a connect card in chat to link your Firebase project — this
  needs the "Include web push" option so the browser keys are supplied.
- "Enable notifications" button in chat settings; device tokens saved per user.
- New message triggers a push with the sender's name, avatar and a preview, and
  tapping it opens that conversation.
- In-app: unread badges per conversation, a total badge on the Chat button, sound,
  and a toast when the app is open.
- Muting per conversation.

### 4. Location
- Send current location (already present) plus **live location sharing** for
  15/60 minutes with a moving marker, and a "stop sharing" control.
- Location messages render as a small static map card with a tap-through to maps.

### 5. Chat completeness
- Read receipts (sent / delivered / read ticks), typing indicators.
- Reply-to-message, delete for me / delete for everyone, copy text.
- Group chats: create group, name it, add members, member list.
- Search inside a conversation, unread divider, jump-to-latest.
- Voice notes with waveform and playback speed.
- Attachment sheet reskinned to the gold theme.

## Technical section

- Backend: new tables `message_receipts` (delivered/read per user), `device_tokens`
  (FCM token per user/device), `conversation_settings` (mute, pinned),
  `live_locations` (expiring share), plus `messages.reply_to_id` and
  `messages.deleted_at`. `profiles.last_seen_at` for offline timestamps. All with
  GRANTs and RLS scoped to conversation participants.
- Presence via Supabase Realtime presence channel per user, with `last_seen_at`
  written on disconnect.
- Push send path: a TanStack server function triggered after insert, reading
  recipient device tokens and calling FCM through the Lovable connector gateway;
  stale tokens deleted on 404/400.
- `public/firebase-messaging-sw.js` for background delivery; permission request
  guarded for the preview iframe (must be opened in its own tab to grant).
- Client-side image compression via canvas before upload; media fetched lazily
  under Data Saver; outbox queued in IndexedDB and flushed on `online`.
- Manifest + icons so the app installs to the home screen (required for iPhone push).

## Testing after build
Sign in on two devices/browsers, confirm presence dots, send text/photo/voice/
location, close one app fully and confirm the push arrives and opens the thread.
