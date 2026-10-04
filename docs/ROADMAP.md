# Taries Beauty Emporium — Roadmap

## Requested features (agreed with the owner)

### 1. AI product auto-description  _(status: requested — not yet implemented)_
When a vendor or admin uploads product images/video, the built-in product AI should
automatically generate a short description/about for the product, using all the
information provided in the form (name, category, price, photos/videos, features,
variants, custom details).

- Placement: a button **"Generate description for product"** shown beside/before the
  publish button in the product form (admin + vendor dashboard).
- The generated text goes into the Description field for the user to **review and
  edit** before saving (it must never auto-publish without review).
- Also available after the description is written, so it can be regenerated.
- Implementation notes: must NOT use a banned provider (no Cloudflare/Firebase/
  Supabase/Fly.io). Suitable routes: a VPS-hosted model/API (e.g. DeepSeek — a key
  already exists in the hub env) called through the self-hosted Node service, or a
  PocketBase hook. Generation must be server-side so API keys stay out of the client.
