# Kapso - What the Free Plan Includes

> Date: 2026-08-22 · Scope: **Argentina** - quotas, limits, and prices for Kapso's Free plan, and its boundary with Meta's WhatsApp message charges. Kapso quotas do not depend on country, but **Meta pricing varies by recipient market**, so every cost conclusion here assumes Argentine recipients and cannot be applied to another market without redoing that portion. Covers message volume, connected numbers, media storage, serverless features, project events, logs, transcription, rate limits, retention, and the sandbox number. **Does not** cover production onboarding with Meta, comparisons with other BSPs, or Meta's country-by-country pricing details. · Method: (1) full download of the official documentation corpus `https://docs.kapso.ai/llms-full.txt` (HTTP 200, 615,201 bytes, version dated 2026-08-22) and systematic search within it; (2) download of the pricing page `https://kapso.com/pricing` (HTTP 200, 23,444 bytes) and extraction of the **embedded plan JSON payload from the HTML**, which is more detailed than the rendered table; (3) cross-checking the documentation table against that payload; (4) official Meta documentation for message charges; (5) **read-only** queries to `@kapso/cli` 0.18.0 authenticated as `actassi@gmail.com`, project QRSafe. No configuration changes and no messages sent.

## Executive Summary

**Kapso's Free plan includes 2,000 messages per month.** [PRIMARY] The claim that this number is a **hard limit** - that the service stops when it is reached rather than degrading or billing - is an **INFERENCE, not a fact**: it is supported by the `message_overage_price_dollars: "0.0"` field in the pricing payload, and Kapso **does not document anywhere** what occurs when the quota is reached (see Section 2). The decisive detail is that Kapso counts **both inbound and outbound messages** against the quota, not only bot-sent messages. A QR verification consumes at least 2 messages (the incoming photo and the outgoing response). The actual Free-plan limit is therefore approximately **1,000 verifications per month**, not 2,000.

**The message counter runs out first, with substantial headroom over everything else.** Media storage (1 GB) holds approximately 8,900 images at the empirically measured size (118 KB per WhatsApp photo); at 1,000 verifications per month, it takes about 8-9 months to fill. Serverless functions (100,000 per month) provide 50 invocations for each message in the 2,000-message allowance, or 100 per two-message verification. The 100 req/min rate limit is not a concern for a conversational bot. **There is only one bottleneck: message volume.**

**A better source than the published table was found.** Kapso's pricing page includes a JSON object in its HTML with each plan's limits field by field, including overage prices, event retention, and quotas that the documentation table does not mention (project events, logs, audio transcription, AI credits). That payload is the most granular unauthenticated source available and supports Section 1 of this report.

**That payload contradicts the documentation on one point.** The `docs.kapso.ai` table says Platform includes **1 TB** of media; the pricing-page payload says **2000 GB** (`media_storage_gb_limit: 2000`), or approximately 2 TB. Both versions are reported without choosing one. This is the second time this platform has shown a documentation/reality mismatch; the first was the media host, documented in the channel report.

**Free has no metered overage: overage prices are 0.** `message_overage_price_dollars: 0.0`, `function_overage_price_dollars: 0.0`, `phone_number_overage_price_dollars: 0.0`. In Pro and Platform, those fields do include prices (`$0.002` and `$0.001` per extra message). **What Kapso does exactly when Free reaches 2,000 messages is not documented anywhere** - see Section 2, where the gap is stated rather than inferred.

**Meta charges are separate and currently almost zero for this use case - but that expires on October 1, 2026.** Today, non-template messages are free within the 24-hour customer-service window, which is exactly where a bot that replies to someone who contacted it operates. Meta has already announced that **starting October 1, 2026, service messages will be charged per message**. Pricing will be published on September 1, 2026. In other words, QRSafe's free validation window has an external expiration date, only weeks away.

**Kapso's media retention is not documented. At all.** See Section 7 - this is the most relevant gap for the adapter design and cannot be resolved with the available sources.

---

## 1. Free Plan Quotas

All values in this section come from the **embedded JSON payload at `https://kapso.com/pricing`** [PRIMARY], except where another source is specified. They are transcribed with the original field name so they can be audited.

### Complete Free Plan Table

| Item | Value | Payload field |
| --- | --- | --- |
| Price | **USD 0/month** | `price_cents: 0` / `price_dollars: 0.0` |
| **WhatsApp messages** | **2,000/month** | `messages_per_month: 2000` |
| Extra-message price | **0.0** (no metered overage) | `message_overage_price_dollars: "0.0"` |
| **Connected phone numbers** | **1** | `phone_numbers_limit: 1` |
| Extra-number price | **0.0** (cannot be purchased) | `phone_number_overage_price_dollars: "0.0"` |
| **Media storage** | **1 GB** | `media_storage_gb_limit: 1` |
| **Serverless function calls** | **100,000/month** | `functions_per_month: 100000` |
| Extra-function price | **0.0** | `function_overage_price_dollars: "0.0"` |
| **Project events** | **5,000/month** | `project_events_per_month: 5000` |
| **Project-event retention** | **90 days** | `project_events_retention_days: 90` |
| **Ingested logs** | **100,000/month** | `log_ingestion_events_per_month: 100000` |
| Extra-log price | **0.0 per million** | `log_ingestion_overage_price_dollars_per_million: "0.0"` |
| **Audio transcription** | **1,800 seconds/month** (30 min) | `audio_transcription_seconds_per_month: 1800` |
| **App integration calls** | **0** (none) | `app_integration_calls_per_month: 0` |
| AI credits | **USD 2, one-time** | `ai_credits_monthly: "2.0"`, `ai_credits_recurring: false` |
| White label | **No** | `allows_white_label: false` |

The `features` list in the same payload states this verbatim: `"2,000 WhatsApp messages/month"`, `"100,000 function calls/month"`, `"Up to 1 connected phone number"`, `"Digital phone numbers included"`, `"5,000 project events/month"`, `"$2 AI credits (one-time)"`, `"1GB media storage"`, `"30 minutes audio transcription/month"`, `"100,000 logs/month"`.

### Free Plan Rate Limits

Separate source, explicitly segmented by plan: [Rate limits](https://docs.kapso.ai/api/rate-limits) [PRIMARY].

| Limit | Free |
| --- | --- |
| Requests per minute (per API key, or per IP without a key) | **100** |
| Workflow executions per second, per workflow | **5** |

**FACT.** The window is a fixed minute, not a rolling one: *"The window is a fixed minute, not a rolling one. A project with no active plan gets the free limit."* Each response includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`; when exceeded, it returns `429` with `Retry-After: 60`. Workflow bursts return `429` with `Retry-After: 1`.

### What Free Includes According to the Documentation

**FACT.** [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq), verbatim: *"All plans include unlimited API calls, AI agents, workflows, serverless function calls, and a Kapso sandbox number. Plans differ in message volume, connected numbers, media storage, and integration calls."*

**DECLARED INTERNAL CONTRADICTION.** That sentence says serverless function calls are **unlimited** in all plans. The pricing-page payload says `functions_per_month: 100000` for Free and lists it as a visible feature (`"100,000 function calls/month"`). These are not compatible: it is either unlimited or 100,000. Both are reported. In practical terms, this is immaterial for QRSafe - 100,000 is ample - but it disproves taking the word "unlimited" literally.

**The same contradiction applies to "unlimited API calls"**: Free has a published rate limit of 100 req/min. "Unlimited" here means "without a monthly quota," not "without a limit."

### What Counts as a Message - the Most Important Fact

**FACT.** [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq), verbatim: *"Kapso counts **all messages** (inbound and outbound) toward your plan limit"*. The published list:

Counted:
- Text messages you send
- Messages with media (image, video, audio, document)
- Template messages
- Interactive messages (buttons, lists)
- **Messages you receive from customers**
- Reactions

Not counted:
- Read receipts

**This is the line that defines the plan's actual limit.** The QR photo sent by the user consumes quota. The bot's response consumes quota. Nothing a verification bot does is free against this quota.

### What the CLI Confirms About This Account

**FACT (observed on 2026-08-22).** `kapso status --output json` returns the QRSafe project (`1fa75a14-5810-4bdf-807d-d248297446cc`), user `actassi@gmail.com`, `whatsapp_numbers.count: 1`. `kapso whatsapp numbers list --output json` returns exactly one number: `phone_number_id` **597907523413541**, `"kind": "sandbox"`, `"display_name": "Sandbox WhatsApp"`, `inbound_processing_enabled: true`.

**DECLARED GAP - and it is relevant.** The CLI counts the sandbox number within `whatsapp_numbers.count`. The documentation, by contrast, presents *"a Kapso sandbox number"* as included in all plans **separately** from the "Connected numbers" row. **It could not be determined whether the sandbox number consumes the sole `phone_numbers_limit: 1` slot in the Free plan.** If it does, connecting a production number on Free would require relinquishing the sandbox. No endpoint or CLI command exposes quota consumption, and testing it would require onboarding a real number - outside this research's read-only scope.

**The CLI has no usage, quota, or billing command.** Available topics are `customers`, `logs`, `projects`, `whatsapp`, plus `build`, `link`, `login`, `logout`, `pull`, `push`, `setup`, `status`. None expose consumption against the 2,000 messages. **Actual plan consumption is not observable through the CLI**; it would have to be checked in the dashboard.

---

## 2. What Happens When Each Quota Is Exceeded

This section is largely a documentation gap. It is stated as such.

### What Is Documented

| Exceeded quota | Behavior | Source |
| --- | --- | --- |
| **Rate limit (100 req/min on Free)** | `429 Too Many Requests` with `X-RateLimit-Remaining: 0` and `Retry-After: 60`. Body: `{"error": "Rate limit exceeded", ...}` | [Rate limits](https://docs.kapso.ai/api/rate-limits) [PRIMARY] |
| **Workflow burst (5/s/workflow on Free)** | `429` with `X-Burst-RateLimit-Remaining: 0` and `Retry-After: 1` | same source |
| **Project events above the monthly quota** | *"event emission returns `402 Payment Required` unless your plan allows metered overage"* | [Events](https://docs.kapso.ai/docs/platform/events) [PRIMARY] |
| **Project events unavailable on the plan** | Creating or updating event definitions and `project.event` subscriptions returns `402 Payment Required` | same source |
| **Event older than the retention window** | *"Events older than your project's event retention window are rejected."* | same source |
| **Upload file size** | Images 5 MB, audio/video 16 MB, documents 100 MB. *"Requests exceeding these limits fail immediately."* | `llms-full.txt` corpus [PRIMARY] |
| **Persistently failing webhook** | Automatic pause. It triggers when all **three** conditions occur within a 15-minute window: >=20 total deliveries, >=10 failed, and >=85% failure rate. The webhook becomes `active: false`, pending deliveries are marked `failed` with `"Webhook inactive; delivery skipped"`, and all project members are notified by email. **Nothing is retried until it is manually reactivated** from Integrations -> Webhooks. | [Webhooks](https://docs.kapso.ai/docs/platform/webhooks) [PRIMARY] |

### What Is NOT Documented

**DECLARED GAP - the most important one in this section.** **No statement was found about what happens when the Free plan reaches its 2,000 monthly messages.** There is no plan-limits page, related error code, degradation notice, or mention of a cutoff. The full 615 KB corpus was searched for `message limit`, `exceed`, `suspend`, `blocked`, `run out`, `allowance`, `402`, `upgrade`, and combinations of those terms with `plan`. The only match for `## What counts toward my message limit?` explains **what** is counted, never **what happens afterward**.

The same applies to exceeding 1 GB of media, 100,000 function calls, 100,000 logs, or 1,800 transcription seconds. None has documented behavior.

**INFERENCE (unconfirmed; not actionable as certainty).** The pricing payload assigns `message_overage_price_dollars: "0.0"` to Free and actual prices to Pro (`0.002`) and Platform (`0.001`). The natural reading is that Free **does not allow metered overage** and therefore the quota is a hard cap, not a billing threshold. The documented project-event precedent - `402 Payment Required` when the plan does not allow metered overage - points in the same direction. **But this is a structural inference, not a verified fact**: Kapso never writes this for messages. A `0.0` could also mean "free" or "unused field." **Closing this gap would require exhausting the quota on a real account and observing the error.**

**An analogous inference with the same caveat** applies to numbers: `phone_number_overage_price_dollars: "0.0"` in Free, versus `$10.0` in Pro and `$5.0` in Platform. The documentation is explicit here and supports it: *"No. The Free plan includes 1 WhatsApp number. Upgrade to Pro for up to 3 numbers."*

---

## 3. What Is Outside the Free Plan

### Confirmed Exclusions

| Capability | Free status | Source |
| --- | --- | --- |
| **Second WhatsApp number** | Excluded. *"No. The Free plan includes 1 WhatsApp number. Upgrade to Pro for up to 3 numbers."* | [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq) [PRIMARY] |
| **App integration calls** | **0/month** - the documentation table marks it with `-`, and the payload with `app_integration_calls_per_month: 0` | pricing FAQ + payload [PRIMARY] |
| **Local numbers / own Twilio** (*Provide local numbers*) | *"Free and Legacy: visible in the UI, but cannot be enabled"* | [Provide local numbers](https://docs.kapso.ai/docs/platform/phone-numbers/provide-local-numbers) [PRIMARY] |
| **White label** | `allows_white_label: false` | payload [PRIMARY] |
| **Advanced analytics** | Listed as a Pro and Platform feature, not Free | payload [PRIMARY] |
| **Priority support** | Platform only | payload [PRIMARY] |
| **Recurring AI credits** | Free receives USD 2 **one-time** (`ai_credits_recurring: false`) | payload [PRIMARY] |

### Confirmed Included - Relevant to the Bot

This directly answers the part of the question about "anything the bot will need":

- **Webhooks: included.** [FACT] There is no indication that WhatsApp webhooks are restricted by plan. The sandbox page explicitly documents the *"Route to webhooks"* path in Sandbox WhatsApp configuration. The only plan-gated subscription is `project.event`, a custom project-event type, and **not** what the bot needs (the bot needs `whatsapp.message.received`).
- **API: included.** [FACT] *"All plans include unlimited API calls"*, subject to the already noted 100 req/min rate-limit qualification.
- **Inbound media: included and empirically verified.** [FACT] The channel report (`docs/research/kapso-whatsapp-sandbox-bot.md`, `docs/kapso-canal` branch) established this with a real sandbox test: `type: "image"` arrived with `has_media: true` and complete `media_data`. No plan quota restricts receipt of media; there is a **storage** quota (1 GB), and every media message **counts against the 2,000-message limit**.
- **Project events: included in Free**, with 5,000/month and 90 days' retention (`project_events_per_month: 5000`). **DECLARED CONTRADICTION:** the documentation table has no row for project events, and the Events page says they are *"plan-gated"* with `402` when *"project events are not available on your plan"*. The payload says they are available in Free with a quota. Both versions are reported.
- **Sandbox number: included in all plans.** *"All plans include ... a Kapso sandbox number."*

### Plan Names That Do Not Match Across Sources

**DECLARED CONTRADICTION.** Sources do not agree on how many plans exist or what they are called:

| Source | Plans named |
| --- | --- |
| `kapso.com/pricing` payload | `free`, `pro`, `platform` - **and nothing else** |
| Pricing FAQ table | Free, Pro, Platform + *"Enterprise plans have custom limits and pricing"* |
| Rate limits page | Free, **Legacy**, Pro, Platform, Enterprise |
| Provide local numbers | Enterprise; **"Pro, Team, Platform"**; "Free and **Legacy**" |

**"Team" appears only once in the 615 KB corpus** (in *Provide local numbers*) and does not exist in any other source, including the pricing payload. **"Legacy"** appears as a plan in rate limits and *Provide local numbers*, with the same limits as Free (100 req/min, 5 executions/s), but **cannot be purchased**: it is not on the pricing page. The reasonable reading is that Legacy is a grandfathered historical plan and "Team" is a naming remnant, but **no source says so**, and it therefore remains a gap.

---

## 4. The Sandbox Number and Its Limits

Source: [Use Kapso Sandbox](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing) [PRIMARY], plus restrictions distributed across the corpus.

### What Is Documented

**FACT.** It is a **shared** number among users but session-isolated: *"Sandbox number - Free, shared with other users (but isolated). Use it for testing and development."*

**FACT.** The flow: a session is created with the test phone, a six-character activation code is received, and that code is sent by WhatsApp to the sandbox number.

**FACT - the only published numeric duration.** *"Activation codes expire 15 minutes after the session is created. Create a new session to get a fresh code."* And: *"Codes expire after 15 minutes - create a new session to get a fresh one."*

**FACT.** Session states: `pending_activation`, `active`, `superseded`.

**FACT - claiming a number from another project.** A phone already active in another session can be claimed: create the new session and send the code from that phone. Then *"the new session becomes `active`"*, *"the previous session becomes `superseded` and its open sandbox conversations are closed"*, and *"new inbound messages route only to the active session"*. The code must be sent from the phone for which the session was created.

**FACT.** Sessions are managed in WhatsApp -> Sandbox: view which phones are authorized, the agent/configuration each uses, and delete them.

**FACT.** The sandbox routes to agents, flows (via *Inbound Message Trigger*), and **webhooks** (Configurations -> Sandbox WhatsApp -> Manage Webhooks).

### Documented Sandbox Restrictions

| Restriction | Source |
| --- | --- |
| Send templates: no | limitations table |
| Sync from WhatsApp (templates): no | table + *"Sync is disabled for sandbox numbers"* |
| Multiple recipients: no | table |
| Send text and interactive messages: yes | table |
| The `to` field must match the registered phone | *"Active sandbox session required to send messages"* |
| Business-profile configuration: `403` | Business Profile API |
| BSUID as recipient: unsupported | [business-scoped user IDs](https://docs.kapso.ai/docs/whatsapp/business-scoped-user-ids) |
| Broadcasts: prohibited (*"Phone number must be production type (not sandbox)"*) | corpus |
| Start workflow with `recipient` on sandbox: `422` | corpus |

### Sandbox Gaps

**DECLARED GAP - concurrent sessions.** **No published limit was found for concurrent sandbox sessions or distinct test numbers per project.** The documentation uses the plural (*"view all sessions"*, *"See which phone numbers are authorized"*), confirming that more than one is possible, but **does not publish the maximum**. Searches covered `sandbox` combined with `limit`, `maximum`, `concurrent`, `sessions`, and `per project`. No result.

**DECLARED GAP - session duration.** **The 15 minutes apply to the *activation code*, not to the session.** No statement was found about how long an activated session lasts, whether it expires due to inactivity, or whether it must be renewed. The only documented ways for an active session to end are being made `superseded` by another session or being deleted manually.

**DECLARED GAP - renewal.** No "renewal" mechanism for a session is documented. What is documented is **re-creating it**: creating a new session and reactivating with a new code.

**Related FACT, concerning the free non-sandbox number.** The free Kapso-managed number in the Free plan - distinct from the sandbox - does have strict rules: *"Free plan only"*, *"The user's default first project"*, **"One lifetime claim per user"**, *"Kapso instant setup path only"*. There is also a trap: *"If that first free number is later deleted or disconnected, the lifetime free claim does **not** reset."* In addition, *"If the number has no production messages within 30 days, it is automatically released."* [PRIMARY, [Instant setup](https://docs.kapso.ai/docs/platform/phone-numbers/)]

---

## 5. Paid Plans and What Each Adds

**All prices are in USD** [PRIMARY, `kapso.com/pricing` payload, `price_dollars` fields]. No conversion is made.

| | Free | Pro | Platform |
| --- | --- | --- | --- |
| **Price** | **USD 0/month** | **USD 25/month** | **USD 299/month** |
| Messages/month | 2,000 | 100,000 | 1,000,000 |
| Extra-message price | - (`0.0`) | **USD 0.002** | **USD 0.001** |
| Connected numbers | 1 | 3, then **USD 10**/extra | 50, then **USD 5**/extra |
| Media storage | 1 GB | 100 GB | **see contradiction below** |
| Function calls/month | 100,000 | 1,000,000 | 10,000,000 |
| Extra-function price | - (`0.0`) | USD 0.000002 | USD 0.000002 |
| Integration calls/month | **0** | 1,000 | 10,000 |
| Extra-integration price | - | USD 0.01 | USD 0.01 |
| Project events/month | 5,000 | 250,000 | 6,000,000 |
| **Event retention** | **90 days** | **180 days** | **365 days** |
| Logs/month | 100,000 | 1,000,000 | 10,000,000 |
| Extra-log price | - (`0.0`) | USD 1.50 per million | USD 1.50 per million |
| Audio transcription | 1,800 s (30 min) | 18,000 s (5 h) | 180,000 s (50 h) |
| Extra-transcription price | - | USD 1.00/hour | USD 1.00/hour |
| AI credits | USD 2 (one-time) | - | - |
| Advanced analytics | no | yes | yes |
| Priority support | no | no | yes |

**DECLARED CONTRADICTION - Platform media storage.** Both versions are reported without choosing one:

- The table at [docs.kapso.ai/docs/whatsapp/pricing-faq](https://docs.kapso.ai/docs/whatsapp/pricing-faq) says **1 TB**.
- The `kapso.com/pricing` payload says **`media_storage_gb_limit: 2000`**, and the feature text says **"2000GB media storage"**, or approximately 2 TB.

Free (1 GB) and Pro (100 GB) do match across both sources. The discrepancy is exclusive to Platform. The documentation itself indicates what should take precedence: *"Prices and limits are always up to date at [kapso.ai/pricing](https://kapso.ai/pricing)"* - suggesting that 2000 GB is current and 1 TB is outdated. **But that is an inference about which source is stale, not a verification.** Operational note: `kapso.ai/pricing` returns **301 -> `kapso.com/pricing`**; the canonical domain is `.com`.

### Enterprise

**FACT.** *"Enterprise plans have custom limits and pricing."* No price is published. It does appear in the rate-limit tables (**2,000 req/min**, 30 executions/s/workflow) and in *Provide local numbers* as a plan in which that capability is *"included"*.

### Documented Add-on

**FACT.** *Provide local numbers* (local numbers using own Twilio): *"Pro, Team, Platform: available as a `$400/mo` add-on on the existing project subscription"*. Enterprise includes it. Free and Legacy cannot enable it.

---

## 6. Separate Meta Costs

**This is where estimates break down, so it is explicit: Kapso's Free plan does NOT include Meta charges.**

**FACT.** [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq), verbatim: *"Kapso plan message allowances and Meta message fees remain separate in both modes."* Kapso's pricing page itself says in its header: *"Meta conversation and template charges are passed through separately."*

In other words: the Free plan's 2,000 messages/month are a **Kapso platform quota** (processing, storage, inbox, analytics, flows, agents, functions, support - according to *"What does Kapso charge for?"*). Anything Meta charges to deliver messages is external and added on top.

### What Meta Charges Today - Official Meta Source

**FACT** [PRIMARY, [Meta: Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing)]. Since **July 1, 2025**, **per-message pricing** applies, not per-conversation pricing: *"Conversation-based pricing is deprecated. It was replaced with per-message pricing on July 1, 2025."* And: *"You are only charged when a template message is delivered."*

- **Service messages**: free. Meta has not charged for them **since November 2024**.
- **Non-template messages** within the 24-hour customer-service window: free.
- **Utility templates within that window**: free.
- **Templates outside the window**: charged, at a rate that varies by category (marketing / utility / authentication) and recipient country.
- **Free Entry Point**: a free 72-hour window when the user arrives through a Click-to-WhatsApp ad.

**For a bot that only replies to someone who wrote first, all of this currently falls within the 24-hour window and Meta's cost is zero.**

### The October 1, 2026 Change - a Dated Risk

**FACT** [PRIMARY, [Meta: Changes to non-template message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)]:

- **August 1, 2026**: Meta begins charging Meta Business Agent messages by token, at **USD 2.00 per million tokens** (approximately 4-5 cents per message).
- **October 1, 2026**: **service messages become charged per message.** Verbatim: *"charge on a per-message basis for service messages, consistent with how Meta charges for template messages."* They had not been charged since November 2024.
- **October 1, 2026**: utility messages, which had not been charged since July 1, 2025, **become charged per message again**.
- Service pricing will match utility/authentication pricing by market. Meta will publish it **by September 1, 2026**: *"announce and publish the rates that take effect October 1, 2026, including rates for service messages, by September 1, 2026."*
- There are currently no volume tiers for service messages.

**Kapso confirms this and agrees** [PRIMARY, pricing FAQ]: *"**Non-template messages stop being free on October 1, 2026.** The free-form replies you send inside the 24-hour customer service window will be billed per message."* Kapso adds that Meta indicated it will bill at each market's utility rate, and that the September 1 rate-card update could still change those rates.

**Translated to QRSafe:** the verification conversation currently costs nothing in Meta charges. **From October 1, 2026, every bot response will have a per-message cost**, at a rate that as of 2026-08-22 **has not yet been published** (approximately 10 days remain until the September 1 announcement). Estimating the bot's operating cost more than one month ahead is currently impossible with published data.

### How Meta Is Paid Through Kapso

**FACT** [PRIMARY, [Meta message billing](https://docs.kapso.ai/docs/whatsapp/meta-message-billing)]. Two modes, selected for the entire WABA:

- **`customer_managed`**: pays with the payment method configured in Meta Billing Hub.
- **`partner_managed`**: pays with Kapso credits. *"Kapso deducts Meta's published USD price from your project credits with no added fee."*

Numeric details: for USD accounts, the charge is Meta's published price **without markup**. For accounts in another currency, it is Meta's USD price **plus a foreign-exchange margin (5% at launch)**. Project credits, charges, and invoices are always in USD. If the project runs out of credits, *"potentially paid sends pause"*. `meta_billing_mode` can only be set when creating the link and **cannot be changed afterward**.

**Relevant to Argentina:** a WABA whose Meta-assigned currency is not USD would pay the USD price **+5%** through Kapso credits. In addition: *"Kapso enables non-USD accounts one currency at a time. If your account's currency is not enabled yet, connecting Kapso credits is blocked with `unsupported_currency`."* **No list of enabled currencies was found**, so it cannot be stated whether ARS is supported.

---

## 7. Data and Media Retention

### The Only Published Numeric Retention Period

**FACT.** **Project-event** retention, from the pricing payload:

| Plan | `project_events_retention_days` |
| --- | --- |
| Free | **90 days** |
| Pro | 180 days |
| Platform | 365 days |

With the documented consequence: *"Events older than your project's event retention window are rejected."*

**FACT.** Media uploaded to Meta through the standard endpoint: *"`meta_media`: Standard upload to Meta's media endpoint (**30-day lifetime**)"*. **Note: this is the lifetime of media in Meta, not Kapso**, and applies to **uploaded**, not received, media.

**FACT.** Setup links expire 30 days after creation.

### The Gap That Matters to the Adapter

**DECLARED GAP - and it could not be resolved.** **Kapso's documentation contains no statement about how long it retains a received file.** The full corpus was searched for `retention`, `retained`, `deleted after`, `purge`, `stored for`, `how long`, `data retention`, plus combinations of those with `media` and `storage`. The only matches involving `media` are **capacity** quotas (`media_storage_gb_limit`, "1GB media storage"), never **time**.

Kapso publishes how much **space** it provides. It does not publish how much **time** it retains it. These are different questions, and only the first is answered.

**It is also not documented** what happens when the project reaches 1 GB: whether new media are rejected, old media are deleted FIFO, or there is a charge. See Section 2 - the same gap.

**Related FACT, already empirically verified** (channel report, `docs/kapso-canal` branch): the actual inbound-media URL is an Active Storage blob on `app.kapso.ai` (`/rails/active_storage/blobs/redirect/<token>--<signature>/<file>.jpeg`), downloadable anonymously with `curl`, HTTP 200. **The documentation shows `https://api.kapso.ai/media/...`, which is not what the system returns.** The corpus continues to show this in payload examples (`"media_url": "https://api.kapso.ai/media/..."`). This discrepancy remained current on 2026-08-22 and is why this report does not infer retention from the documentation.

**Meta's path does have a measured duration**, not documented but observed: the `image.url` from `lookaside.fbsbx.com` contains an `ext=<epoch>` parameter that expires approximately **8 minutes** after the message is received. That is the only known actual duration for inbound media, and it is very short.

**Design conclusion, with uncertainty made explicit:** because (a) Kapso's media retention is not published, (b) Meta's path expires in approximately 8 minutes, and (c) Kapso's documentation has already proven outdated regarding the media host, **the adapter must not rely on Kapso retaining the file**. If QRSafe needs the original file beyond processing time, it must persist it independently upon receipt. This is not a generic precautionary recommendation: **there is no data that supports doing otherwise**.

---

## 8. Implications for QRSafe

### Yes, the Free Tier Is Sufficient for Validation - up to Approximately 1,000 Verifications per Month

**The position, and the number supporting it:**

The Free plan provides **2,000 messages/month**, and Kapso **counts inbound and outbound messages**. A minimum verification cycle is:

| Step | Direction | Counted? |
| --- | --- | --- |
| The user sends the QR photo | inbound | **yes** |
| The bot responds with the result | outbound | **yes** |

**2 messages per verification -> 2,000 / 2 = 1,000 verifications/month.**

If the bot also sends an acknowledgement ("I received your image; processing it"), the cycle rises to 3 messages and the limit falls to **approximately 666 verifications/month**. If the flow includes an initial greeting and a clarification question, that is 4-5 messages, and the limit falls to **400-500/month**.

**A direct, low-cost design consequence:** every message the bot does not send yields half a verification more of allowance. In the Free plan, **bot verbosity costs 50% of the limit**. A bot with a single response turn doubles validation capacity compared with one that sends an acknowledgement. This should be decided now, not when the quota runs out.

### What Runs Out First - and How Far Away the Second Limit Is

| Resource | Free quota | Estimated consumption at 1,000 verifications/month | Headroom |
| --- | --- | --- | --- |
| **Messages** | **2,000/month** | **2,000/month** | **0% - this is the limit** |
| Media storage | 1 GB | approximately 118 MB/month (at 118 KB/photo, actual measured size) | approximately 8-9 months until full, **if nothing is deleted** |
| Serverless functions | 100,000/month | approximately 2,000-10,000 depending on design | 90%+ free |
| Logs | 100,000/month | depends on verbosity | ample |
| Project events | 5,000/month | 0 if unused | unused |
| Rate limit | 100 req/min | a conversational bot does not approach it | irrelevant |
| Audio transcription | 30 min/month | 0 - QRSafe processes images | unused |

**The message counter runs out first, and there is no nearby second place.** Everything else has between one and two orders of magnitude of headroom. The 118 KB-per-photo figure is not an assumption: it is the exact `byte_size` (117,868 bytes) of the real test image downloaded from the sandbox, documented in the channel report.

**Media-storage qualification: it can still matter.** The message quota is **monthly and resets**. Storage is **cumulative** and - according to Section 7 - **it is unknown whether Kapso purges anything**. In the worst case (Kapso never deletes), 1 GB fills in about 8-9 months of operation at the plan limit. This is the second limit over time, even if not within the month.

### When Payment Is Necessary, and How Much

The jump is **USD 25/month** (Pro), which raises the quota to **100,000 messages/month** - **50 times** Free, or approximately 50,000 verifications/month at a two-message cycle. This is a disproportionate jump relative to price: there is no intermediate tier. In practice, **QRSafe does not need to pay anything until it exceeds approximately 1,000 verifications/month, and once it does, USD 25 buys two orders of magnitude of headroom**. Pro also enables metered overage (USD 0.002/message), eliminating the risk of a hard cap.

### The Three Things to Monitor

1. **October 1, 2026.** [FACT, Meta source] Service messages stop being free. Until that date, QRSafe's Meta cost is zero; afterward, each bot response has a charge. **Pricing will be published on September 1, 2026** - approximately 10 days remain. Any cost projection from October onward is currently impossible with published data and must be redone when Meta publishes the rate card.
2. **Media retention, which is not published.** The adapter must persist independently every file it needs after processing time. There is no data that permits trusting Kapso as durable storage, and Meta's path expires in approximately 8 minutes.
3. **The sole number slot.** `phone_numbers_limit: 1`, and it is unclear whether the sandbox occupies it (Section 1). Before attempting to connect a production number in Free, this must be resolved because, if the sandbox occupies the slot, the sandbox -> production transition is exclusive rather than additive.

### Secondary Operational Risk: Automatic Webhook Pausing

**FACT.** If the QRSafe endpoint fails persistently - >=20 deliveries and >=10 failures with a >=85% error rate within 15 minutes - Kapso **pauses the webhook and does not reactivate it automatically**. It stops delivering messages until someone manually reactivates it from the dashboard. A broken Friday deployment can leave the bot silent for the entire weekend without anyone noticing, apart from the email to project members. Monitor the webhook's `active` state, not only the endpoint's own health.

---

## Research Limitations

**What remains explicitly unanswered:**

1. **What happens exactly when Free exceeds 2,000 messages.** Not documented. The inference from `message_overage_price_dollars: "0.0"` points to a hard cap, but it is a structural inference, not a fact. **It can only be resolved by exhausting the quota on a real account.**
2. **How long Kapso retains a received file.** Not documented anywhere. This is the highest-impact gap for the adapter design (Section 7).
3. **What happens upon reaching 1 GB of media.** Not documented: it is unknown whether it rejects, purges, or charges.
4. **How many concurrent sandbox sessions are allowed**, and **how long an activated session lasts**. The published 15 minutes apply to the activation code, not the session. No published test-number limit.
5. **Whether the sandbox number consumes the sole `phone_numbers_limit: 1` slot.** The CLI counts it within `whatsapp_numbers.count`; the documentation presents it as separately included. Not resolvable without onboarding a real number.
6. **Meta pricing from October 1, 2026.** Meta committed to publish it by September 1, 2026. As of 2026-08-22, it **does not exist**. Any operational cost calculation after that date is impossible with public sources.
7. **Whether ARS is among currencies enabled for Kapso credits.** The mechanism (`unsupported_currency`, 5% FX margin) is documented; the list of enabled currencies was not found.
8. **The "Team" and "Legacy" plans.** "Team" appears only once in the 615 KB corpus and in no other source. "Legacy" has published limits but cannot be purchased. No source explains what they are.
9. **Actual QRSafe account consumption.** The CLI exposes no usage, quota, or billing command. It was not possible to observe how many of the project's 2,000 messages have been consumed. This would require the authenticated dashboard.

**Reported contradictions left unresolved** (under the explicit rule not to choose between versions):

- **Platform media storage**: 1 TB (docs) versus 2000 GB (pricing payload).
- **Serverless functions**: *"unlimited ... serverless function calls"* (docs) versus `functions_per_month: 100000` in Free (payload).
- **API calls**: *"unlimited API calls"* (docs) versus the published Free rate limit of 100 req/min.
- **Project events**: described as *"plan-gated"* with `402` when unavailable (docs) versus `project_events_per_month: 5000` available in Free (payload). The documentation FAQ table has no events row.
- **Plan names**: four sources, four different lists (Section 3).
- **Media host**: `api.kapso.ai/media/...` in corpus examples versus `app.kapso.ai/rails/active_storage/...` empirically observed. Verified in the channel report; still uncorrected in the documentation.

**Methodological warning that applies throughout the report.** This platform has already demonstrated that its documentation does not always describe its behavior - the media host is the proven precedent. The figures in this report are **what Kapso publishes**, not what Kapso does. The only layer actually verified here is the authenticated CLI layer (Section 1, account status), and that layer does not expose quotas. **No quota figure in this report was verified against the system's actual behavior.**

**On the source hierarchy used.** When the documentation table and the pricing-page payload differ, this report **does not choose**: it reports both. It does note that the documentation itself declares `kapso.ai/pricing` to be the authoritative source (*"Prices and limits are always up to date at kapso.ai/pricing"*), which provides a published reason to prefer the payload - but that is an argument, not a verification.

---

## Sources

**Primary - Kapso:**
- [`https://docs.kapso.ai/llms-full.txt`](https://docs.kapso.ai/llms-full.txt) - complete documentation corpus. HTTP 200, 615,201 bytes, downloaded 2026-08-22.
- [`https://kapso.com/pricing`](https://kapso.com/pricing) - HTTP 200, 23,444 bytes. `https://kapso.ai/pricing` returns **301** to this URL. Contains the plan JSON payload used in Sections 1 and 5.
- [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)
- [Rate limits](https://docs.kapso.ai/api/rate-limits)
- [Use Kapso Sandbox](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing)
- [Meta message billing](https://docs.kapso.ai/docs/whatsapp/meta-message-billing)
- [Events](https://docs.kapso.ai/docs/platform/events)
- [Provide local numbers](https://docs.kapso.ai/docs/platform/phone-numbers/provide-local-numbers)
- CLI `@kapso/cli` 0.18.0 authenticated - `kapso status`, `kapso whatsapp numbers list`, `kapso --help` (read-only, 2026-08-22).

**Primary - Meta:**
- [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing)
- [Changes to non-template message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)

**Internal repository source:**
- `docs/research/kapso-whatsapp-sandbox-bot.md` (`docs/kapso-canal` branch) - empirical verification of inbound media, actual blob host, and measured size of 117,868 bytes. Not modified by this research.
