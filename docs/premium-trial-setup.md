# Premium free trial setup (App Store / Play / RevenueCat)

MVP in the app detects trials from RevenueCat `CustomerInfo` (`periodType === "TRIAL"`). No database migration is required: webhook already writes `plan: premium` + `premium_until` from `expiration_at_ms`, and expiry / `EXPIRATION` already runs the free-plan downgrade path.

## 1. App Store Connect (iOS)

1. Open your app → **Subscriptions** → Premium group → `monthly_premium` and/or `yearly_premium`.
2. For each subscription you want trialled:
   - **Subscription Prices** → **Introductory Offers**
   - Create a **Free** offer
   - Duration: **14 days** (or your chosen length)
   - Eligibility: typically **New subscribers** (first time only)
3. Submit the offer with the next app version if ASC requires review for the change.
4. Sandbox: use a Sandbox Apple ID that has **not** already consumed the intro offer (or clear trial eligibility in StoreKit testing / new sandbox user).

## 2. Google Play Console (Android)

1. **Monetize** → **Subscriptions** → base plans for `monthly_premium` / `yearly_premium`.
2. Add an **offer** with a **free trial** phase:
   - Phase 1: Free · 14 days
   - Phase 2: Paid (base plan price)
3. Activate the offer and make sure it is available in the countries you sell in.
4. License testers: use accounts eligible for the offer (Play often limits one intro per account).

Product IDs must keep matching `shared/payments/iapProducts.ts`:

- `monthly_premium`
- `yearly_premium`
- `lifetime_premium` (no trial)

## 3. RevenueCat

1. Confirm products are imported/synced from ASC + Play (same store product IDs).
2. Entitlement **`vehico Premium`** must include monthly + yearly (and lifetime if used).
3. Offering (current): packages pointing at those products – no special “trial product” needed; the store intro offer rides on the same product.
4. Webhooks: existing endpoint is enough. Trial start looks like `INITIAL_PURCHASE` with a short `expiration_at_ms`; conversion is `RENEWAL`; cancel-after-trial / end is `EXPIRATION` / cancellation events you already handle.
5. Optional: Customer Center / paywall copy in RC dashboard can mention the trial, but the native Shop screen already shows trial CTAs when `introPrice` / Android `freePhase` is present.

## 4. What the app does after setup

| Area | Behavior |
| --- | --- |
| Shop (not subscribed) | CTA **Start free trial** when store product exposes a free intro; disclosure “N-day free trial, then price” |
| Shop (current plan) | Badge **Trial** / **Ends soon**; shows ends/converts/renews date from RC + DB |
| Home (Vehicles) | Banner in last 3 days of trial, or last 7 days of a **cancelled** subscription |
| Push | Local notifications at 3 days, 1 day, and day-of for trial end / cancelled sub end; tap opens Shop |
| Downgrade | Unchanged write path: webhook → free plan + picker; client also flips off Premium at local expiry and `PremiumDowngradeHandler` prompts for free-plan vehicle |

## 5. Sanity checklist

- [ ] Sandbox purchase shows trial in Shop current-plan card (`periodType` trial)
- [ ] `premium_until` in Supabase matches trial end after webhook
- [ ] Cancel during trial → banner + pushes fire; after expiry → free limits + vehicle picker
- [ ] Converted trial → paid period, `willRenew: true`, no “ending” banner
- [ ] App Review disclosures mention free trial length and price after trial (Shop copy covers this when offer is present)

## 6. Out of scope (this MVP)

- Custom “grant Premium without IAP” trials
- DB columns for trial state
- Paid introductory pricing (non-zero intro) – intentionally ignored for the free-trial CTA
