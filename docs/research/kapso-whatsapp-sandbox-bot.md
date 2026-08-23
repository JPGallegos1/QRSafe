# Kapso as the WhatsApp channel for the bot

> Date: 2026-08-22 · Scope: one technical question only: whether Kapso's WhatsApp sandbox delivers image messages to webhooks, and what the download adapter needs to work. This does not cover comparative pricing, production onboarding with Meta, or evaluation of alternative BSPs. · Method: review of Kapso's official documentation, downloaded in full from `https://docs.kapso.ai/llms-full.txt` (615 KB, 2026-08-22 version) and verified against the published HTML pages; comparison of the classic path with Meta's official documentation; **audit of the locally installed and executed `@kapso/cli` 0.18.0** on 2026-08-22 to verify that the runbook commands actually exist (§5.0.1). No Kapso account, configured credentials, or running sandbox session at the time of the documentary analysis.

## Executive summary

> **EMPIRICALLY VERIFIED on 2026-08-22.** The question was resolved by running the runbook against the real sandbox (`phone_number_id` 597907523413541, with a session activated from a team member's phone). Everything that follows in this summary is an observed **FACT**, not documentation review. Sections 1 through 4 retain the prior documentary analysis, with corrections noted where reality contradicted it.

**Kapso's sandbox DOES deliver image messages.** A message sent from a phone to the sandbox number arrived as `type: "image"`, with `has_media: true` and the complete `media_data` object. The documentation did not state this either way; the test resolved it.

**The original hypothesis was correct, including its most specific part.** The URL **does** point to an Active Storage blob at `app.kapso.ai`:

```
https://app.kapso.ai/rails/active_storage/blobs/redirect/<token>--<signature>/<file>.jpeg
```

The documentation shows `https://api.kapso.ai/media/...`, which is **not what the system returns**. A previous version of this report considered that part of the hypothesis refuted based on the documentation; that refutation was incorrect and is void. This is a reminder that the documentation does not match behavior on this platform, and that a documentation gap does not authorize claiming the opposite.

**Downloading does not require credentials.** Anonymous `curl` to that URL returned **HTTP 200** and exactly the declared `byte_size` (117,868). `X-API-Key` is not required. The URL is long, signed, and unguessable, but public to anyone who has it: **treat it as a secret**.

**Both paths are available, not just one.** In addition to Kapso's own blob, the message contains `image.id`, Meta's `media_id`, plus an `image.url` at `lookaside.fbsbx.com` with an `ext=<epoch>` parameter representing its expiration (about eight minutes after receipt). Meta's path serves as a fallback.

**Actual field location**: `has_media`, `content`, `media_url`, and `media_data` live **inside the message's `kapso` envelope**, not at the root. A parser that looks for them at the top level finds nothing and does not fail: it silently returns `undefined`.

**End-to-end tested pipeline**: WhatsApp → Kapso → download → engine `decodeImage`. The only stage that did not complete was decoding, for a reason unrelated to the channel: the test image was an AI-generated photo whose pattern was not a valid QR code (91 attempts, `UNREADABLE`). **The test must be repeated with a photo of a real QR code.**

## 1. The question: does the sandbox deliver media?

> **ANSWERED: yes.** See the executive summary. This section retains the documentary analysis from before the test, which remains valid as a description of **what the documentation says and does not say**. Its prior conclusion, that the documentation gap did not authorize claiming the capability, was correct at the time and has been superseded by evidence.

### What the sandbox documentation says, verbatim

The [Use Kapso Sandbox](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing) page has a single limitations table, preceded by the sentence "The sandbox is for testing message flows, not production features":

| Feature | Sandbox | Production |
| --- | --- | --- |
| Send text messages | ✅ | ✅ |
| Send interactive messages | ✅ | ✅ |
| Send templates | ❌ | ✅ |
| Sync from WhatsApp | ❌ | ✅ |
| Multiple recipients | ❌ | ✅ |

**FACT.** The five rows describe **outbound** capabilities or template synchronization. **No row addresses inbound messages of any type**, whether text or image. The table cannot be read as an exhaustive enumeration of what the sandbox receives, because it also does not list text reception, which the activation flow itself demonstrates works (the user sends a six-character code by chat).

**DECLARED GAP.** Kapso's documentation contains no statement, affirmative or negative, about whether a sandbox number delivers inbound messages containing media to webhooks. The complete `llms-full.txt` corpus was searched for `sandbox`, `media_data`, `has_media`, `media_url`, and their intersections. No result relates them.

### Other documented sandbox restrictions

Collected from the entire corpus, not only the sandbox page. None concern inbound media:

- **FACT.** "Sandbox configurations are blocked (returns 403)" when attempting to edit the business profile ([Business profile API](https://docs.kapso.ai/api/meta/whatsapp)).
- **FACT.** "BSUID recipients are not supported on sandbox numbers" ([business-scoped user IDs](https://docs.kapso.ai/docs/whatsapp/business-scoped-user-ids)).
- **FACT.** Broadcasts require "Phone number must be production type (not sandbox)".
- **FACT.** Starting a workflow with `recipient` on a sandbox number returns `422`.
- **FACT.** "Activation codes expire 15 minutes after the session is created."
- **FACT.** Session statuses: `pending_activation`, `active`, `superseded`. Claiming the same phone from another project leaves the previous session in `superseded`, closes its open conversations, and routes new messages only to the active session.
- **FACT.** "Active sandbox session required to send messages": the `to` field must match the registered phone.

**INFERENCE (weak, not actionable).** Kapso lists in detail the things the sandbox cannot do, including low-profile limitations such as the business-profile 403. The absence of a written restriction for inbound media is consistent with it working, but also with nobody documenting it. An argument from silence does not resolve the question.

### The pricing clue, and why it is insufficient

**FACT.** All plans include a sandbox number: "All plans include unlimited API calls, AI agents, workflows, serverless function calls, and a Kapso sandbox number. Plans differ in message volume, connected numbers, media storage, and integration calls." The Free plan includes 2,000 messages/month, one connected number, and **1 GB of Media storage** ([pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)).

**FACT.** "Kapso counts **all messages** (inbound and outbound) toward your plan limit", and the list explicitly includes "Media messages (image, video, audio, document)" and "Messages you receive from customers" ([pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)).

**HYPOTHESIS.** The fact that the free plan includes both a sandbox and media quota suggests that media storage is a platform capability that spans number types. This is a reasonable reading. **It is not evidence that the sandbox delivers images**: the media quota is also consumed by a production number on the same Free plan, and nothing in the documentation ties the two together.

---

## 2. Webhook payload shape

### Image message: verbatim JSON from the documentation

From [Message events](https://docs.kapso.ai/docs/platform/webhooks/message-events), section "Message type-specific data → Media messages (image/video/document)", reproduced verbatim:

```json
{
  "message": {
    "id": "wamid.789",
    "timestamp": "1730093000",
    "type": "image",
    "image": {
      "caption": "Photo description",
      "id": "media_id_123"
    },
    "kapso": {
      "direction": "inbound",
      "status": "received",
      "processing_status": "pending",
      "origin": "cloud_api",
      "has_media": true,
      "content": "Photo description Image attached (photo.jpg) [Size: 200 KB | Type: image/jpeg] URL: https://api.kapso.ai/media/...",
      "media_url": "https://api.kapso.ai/media/...",
      "media_data": {
        "url": "https://api.kapso.ai/media/...",
        "filename": "photo.jpg",
        "content_type": "image/jpeg",
        "byte_size": 204800
      },
      "message_type_data": {
        "caption": "Photo description"
      }
    }
  }
}
```

The complete `whatsapp.message.received` envelope (visible in the text-message example on the same page) adds the following outside `message`:

```json
  "conversation": {
    "id": "conv_123",
    "phone_number": "16315551181",
    "business_scoped_user_id": "US.13491208655302741918",
    "status": "active",
    "phone_number_id": "123456789012345"
  },
  "phone_number_id": "123456789012345"
```

### Image message: observed REAL JSON

**FACT**, captured on 2026-08-22 with `kapso whatsapp messages list --phone-number-id 597907523413541 --direction inbound`. Trimmed to the relevant fields; tokens are intentionally truncated.

```json
{
  "type": "image",
  "from": "54XXXXXXXXXX",
  "id": "wamid.HBgNNTQ5MzQxNjQxNzk4MRUCABIYIEFDMjZBRDFF...",
  "timestamp": "1787443106",
  "image": {
    "id": "1371993794424264",
    "mime_type": "image/jpeg",
    "sha256": "zTC1IRibhUeU8FXIJjVt/Iz06A+cWxwwkneq+WVXaKE=",
    "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1371993794424264&source=webhook&ext=1787443262&hash=...",
    "link": "https://app.kapso.ai/rails/active_storage/blobs/redirect/eyJfcmFpbHMi...--97f070bb.../image_cd71339006dd.jpeg"
  },
  "kapso": {
    "direction": "inbound",
    "status": "delivered",
    "processing_status": "pending",
    "origin": "cloud_api",
    "phone_number": "54XXXXXXXXXX",
    "phone_number_id": "597907523413541",
    "has_media": true,
    "whatsapp_conversation_id": "20e0e0c5-d08f-4361-8d3c-f563d58ee884",
    "contact_name": "<contact name>",
    "content": "Image attached (image_cd71339006dd.jpeg) [Size: 115.1 KB | Type: image/jpeg] URL: https://app.kapso.ai/rails/active_storage/...",
    "media_url": "https://app.kapso.ai/rails/active_storage/blobs/redirect/eyJfcmFpbHMi...--97f070bb.../image_cd71339006dd.jpeg",
    "media_data": {
      "url": "https://app.kapso.ai/rails/active_storage/blobs/redirect/eyJfcmFpbHMi...--97f070bb.../image_cd71339006dd.jpeg",
      "filename": "image_cd71339006dd.jpeg",
      "content_type": "image/jpeg",
      "byte_size": 117868
    },
    "message_type_data": {}
  }
}
```

**Differences from the documentation example**, all verified:

| | The documentation says | The system returns |
|---|---|---|
| Blob host | `api.kapso.ai/media/...` | **`app.kapso.ai/rails/active_storage/blobs/redirect/...`** |
| `image.url` field | does not appear in the example | `lookaside.fbsbx.com` URL with `ext=<epoch>` |
| `image.link` field | does not appear in the example | duplicates Kapso's blob URL |
| `message_type_data` | undocumented | present, empty in this case |

> **Personal data is deliberately anonymized.** The test phone number and contact name were replaced with placeholders: this repository is public, and an example payload does not need anyone's real phone number to document the message shape. The structure matters here, not who sent the photo.

**Actual keys in the `kapso` envelope** for a media message: `direction`, `status`, `processing_status`, `origin`, `phone_number`, `phone_number_id`, `has_media`, `whatsapp_conversation_id`, `contact_name`, `content`, `media_data`, `media_url`, `message_type_data`.

For a text message, the envelope contains the same fields except `media_data`, `media_url`, and `message_type_data`, and `has_media` is `false`.

> **Parsing trap, and it is easy to miss**: `has_media` and `content` are **inside `kapso`**, not at the message root. A parser that looks for them at the top level does not fail: it silently returns `undefined` and makes you believe that the message contained no media. This happened during this verification.

### Point-by-point comparison with the hypothesis

| Hypothesis claim | Verdict | Evidence |
| --- | --- | --- |
| `has_media: true` | **CONFIRMED** | Literal in the image example |
| `media_data` object with `url`, `filename`, `content_type`, `byte_size` | **CONFIRMED** | All four fields, with those exact names |
| `media_url` also arrives | **CONFIRMED** (not in the hypothesis) | Sibling field, same value in the example |
| the `url` points to an **Active Storage** blob | **EMPIRICALLY CONFIRMED** | The documentation does not mention it, but the system returns `/rails/active_storage/blobs/redirect/...` |
| the `url` points to **`app.kapso.ai`** | **EMPIRICALLY CONFIRMED** | The documentation shows `api.kapso.ai/media/...`, but the system returns `app.kapso.ai` |
| Kapso ingests the file and serves it from its own storage | **SUPPORTED** (see below) | Own host + `stored media` + Media storage quota |
| instead of Meta's `media_id` → Graph API path | **PARTIAL** | Meta's `media_id` **also arrives**, in `message.image.id` |

**On the final point, which matters most for the adapter:** the payload contains **both**. `message.image.id` is Meta's `media_id` and enables the classic path; `kapso.media_url` is the URL on Kapso infrastructure. They are not mutually exclusive alternatives: they are two paths to the same bytes, with different expiration properties (section 4).

### Evidence that `media_data` is Kapso storage, not a Meta mirror

**FACT.** The SDK field reference ([Kapso extensions](https://docs.kapso.ai/docs/whatsapp/typescript-sdk/kapso-extensions)) describes them as follows, verbatim:

| Field | Description |
| --- | --- |
| `has_media` | True when a media blob is attached. |
| `media_data` | URL, filename, content type, and byte size for stored media. |
| `media_url` | Direct URL to the attached media. Inbound: immediate. Outbound: appears shortly after send. |

**FACT.** [WhatsApp data](https://docs.kapso.ai/docs/platform/whatsapp-data), Media section: "**Stored**: File attachments on messages (images, videos, audio, documents)", accessible from "Dashboard: WhatsApp > Data > Media".

**INFERENCE.** "stored media", "Inbound: immediate", an own host (`api.kapso.ai`), and a GB-measured plan quota together describe the platform's own storage, not a proxy for Meta's temporary URL. **How that storage is implemented underneath is undocumented, but the empirical test revealed it: the actual URL path is `/rails/active_storage/blobs/redirect/`, namely Rails Active Storage.** This must not be claimed based on the documentation, but may be claimed based on the observation.

### Webhook operational details

- **FACT.** Formats: `kapso` (default, with event filtering, buffering, and a structured payload) and `meta` (raw forwarding of Meta's payload, without filtering or buffering). The adapter should use `kapso`, because it is the only one that provides `media_url` ([Webhooks overview](https://docs.kapso.ai/docs/platform/webhooks/overview)).
- **FACT.** Kapso webhook headers: `X-Webhook-Event`, `X-Webhook-Signature` (hmac-sha256-hex), `X-Idempotency-Key`, `X-Webhook-Payload-Version: v2`. With buffering enabled, `X-Webhook-Batch: true` and `X-Batch-Size` are added.
- **FACT.** "Your endpoint must return `200 OK` within 10 seconds."
- **FACT.** Retries occur at 10 s, 40 s, and 90 s. "After max retries, batched messages fall back to individual delivery."
- **FACT.** With buffering, the body changes shape: "the body uses a batch envelope with `type`, `batch: true`, `data: [...]`, and `batch_info`". The parser must support both forms.
- **GAP / GOTCHA.** The [security](https://docs.kapso.ai/docs/platform/webhooks/security) page says "Kapso creates a signature by hashing the **raw JSON payload**", but its own Node.js example signs `JSON.stringify(payload)` over the already parsed object, and the Python example uses `json.dumps(payload)`. These are not equivalent if Kapso serializes differently from `JSON.stringify`. **The documentation does not resolve the ambiguity.** Preserving the raw body is the defensive implementation, but verify it against a real webhook before treating signature verification as correct.

---

## 3. Sandbox and Free-plan limits

### Sandbox

Already listed in section 1. The actionable summary: **there is no documented limit affecting inbound media**, nor is there a guarantee. What is documented and affects the proof of concept:

- No templates. The entire test must be initiated by the user from the phone.
- One recipient per session: `to` must match the registered phone.
- The activation code expires after 15 minutes.
- **GAP.** No maximum duration for an already activated session is published.
- **GAP.** No maximum number of test sessions or phones per project is published.
- **GAP.** No size limit for **inbound** images is published. The 5 MB JPEG/PNG limit documented in [Upload media](https://docs.kapso.ai/api/meta/whatsapp/media/upload-media) applies to uploads, not reception.

### Free plan

**FACT** ([pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)):

| | Free | Pro | Platform |
| --- | --- | --- | --- |
| Messages/month | 2,000 | 100,000 | 1,000,000 |
| Connected numbers | 1 | 3 (then $10 each) | 50 (then $5 each) |
| Media storage | 1 GB | 100 GB | 1 TB |
| Integration calls/month | — | 1,000 | 10,000 |

**FACT.** Inbound messages count against the quota, as do media messages. A test of 20 photos consumes 40 messages against the 2,000-message cap (round trip), which is irrelevant for the proof of concept.

**FACT.** "Sandbox number — Free, shared with other users (but isolated). Use it for testing and development."

**GAP.** Retention is not published: neither how many days Kapso keeps messages and media nor what happens after exceeding 1 GB on the Free plan.

---

## 4. Media URL lifetime and implications for the adapter

This is a design requirement, not a detail. There are three separate clocks, and only two are documented.

> **Measured on 2026-08-22**, on the actual Active Storage URL:
>
> - **Anonymous download works.** `curl` without headers returned `HTTP 200` and exactly 117,868 bytes, the same as the declared `byte_size`. **`X-API-Key` is not required.** **FACT.**
> - **Lifetime remains unmeasured.** The download occurred within a few minutes of receiving the message. `check-media-url.sh` must still be run to determine whether and when the URL expires. **OPEN GAP.**
> - **Meta's URL does declare its expiration in its own parameter**: `image.url` contains `ext=<epoch>`, which was about eight minutes after receipt in the capture. **FACT.**
>
> **Practical consequence while the blob lifetime remains unmeasured**: download on webhook receipt and persist the bytes. Do not store the URL as though it were stable. Since downloading does not require credentials, **the URL is a secret**: anyone with it can download the image.

| URL | Documented expiration | Source |
| --- | --- | --- |
| `kapso.media_url` / `kapso.media_data.url` (`https://api.kapso.ai/media/...`) | **UNDOCUMENTED** | — |
| URL returned by `GET /{media_id}` through the Kapso→Meta proxy | "The returned URL is temporary and **expires after 5 minutes**" | [Get media URL](https://docs.kapso.ai/api/meta/whatsapp/media/get-media-url) |
| `download_url` in that same response (embedded token) | "They **expire 4 minutes after issue**" | [Download media file](https://docs.kapso.ai/api/meta/whatsapp/media/download-media-file) |
| Direct Meta media URL (classic path) | "Media URLs **expire after 5 minutes**"; the `media_id` received by webhook can be downloaded for 7 days | [Meta Cloud API — Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media) |

Additional primary notes:

- **FACT.** Kapso's `download_url` does not require `X-API-Key`: "No `X-API-Key` header is needed — authentication is embedded in the token."
- **FACT.** The proxy is at `https://api.kapso.ai/meta/whatsapp/v24.0`, and "Mirrors Meta's Graph API shapes, so existing Cloud API code ports over with a base URL change."
- **GAP.** The documentation **does not say** whether `media_data.url` requires authentication (`X-API-Key`, bearer, or none). This is an unknown that the runbook resolves with `curl`.

### Design consequences

**REQUIREMENT (derived, non-optional).** The adapter **downloads the bytes when it receives the webhook**, not in an indefinitely delayed job. Rationale: the lifetime of `media_data.url` is undocumented, and the fallback path, Meta's `media_id` through the proxy, has a hard five-minute limit. Designing for the shortest known clock is the only defensible position while the other is unknown.

**REQUIREMENT.** Downloading cannot happen inside the handler that must return `200` in under 10 seconds. The sequence is: verify signature → deduplicate by `X-Idempotency-Key` → **enqueue with already-downloaded bytes or with download as the worker's first immediate step** → return `200`. QR decoding follows; `packages/verification/src/decode.ts` runs a ladder of up to eight variants plus a tile sweep, and that cost does not fit the webhook budget.

**REQUIREMENT.** Store `message.image.id`, Meta's `media_id`, alongside the event. It is the only recovery path if `media_data.url` fails or has expired, and its seven-day window is much wider than that of any URL.

**About the engine:** `decodeImage(source: string | Buffer)` already accepts bytes, so the adapter only needs to pass it a `Buffer`. The engine does not need changes. What is missing is precisely what this research seeks to enable: the piece that obtains those bytes.

---

## 5. Verification runbook (5 minutes, requires a phone)

> **The commands in this section no longer come from the documentation: they were audited against the installed CLI.** Everything marked FACT here comes from running `--help` or the command on this machine on 2026-08-22, using `@kapso/cli` 0.18.0. Where the original report's syntax differed from reality, it has been corrected and noted.

### 5.0 State on this machine, verified on 2026-08-22

**FACT: installation.** `npm install -g @kapso/cli` was run (143 packages). Result:

- `kapso --version` → `@kapso/cli/0.18.0 win32-x64 node-v24.14.0`
- Location: `C:\Users\admin\AppData\Roaming\npm\node_modules\@kapso\cli`
- `node --version` → **v24.14.0**, satisfying the package's `engines.node: >=20.19`.

**FACT: authentication: no credentials exist.** Verbatim output of `kapso status --output json`:

```json
{
  "data": {
    "authenticated": false,
    "authentication_mode": "none",
    "project_access": { "ready": false }
  },
  "next": [{ "command": "kapso login" }]
}
```

Any project command also fails with this verbatim error:

```
 »   Error: Not authenticated. Run "kapso login" first.
```

with `exit code 2`. **`kapso login` was not run and no credentials were configured**: `login` is interactive (opens the browser) and remains a human step.

**FACT: `KAPSO_API_KEY` is a real authentication path.** Verified without configuring anything: with `KAPSO_API_KEY` set to an invalid value *only within the test process*, the error changes from `Not authenticated` to `Error: Invalid or missing API key`. In other words, the CLI **reads that variable** and sends it to the server. The variable was not left set in the environment.

**GOTCHA: `~/.kapso/cli` exists but is empty, and its existence does NOT prove there is a session.** It did not exist before installation. The CLI creates it on first startup even without login: `getCliHomeDir()` in `dist/services/cli-home.js` calls `mkdirSync` unconditionally. Today it contains `config/` and `secure/`, **both empty**. Any credential check must use `kapso status --output json`, not directory presence. (It can be relocated using the `KAPSO_CLI_HOME` variable.)

**FACT: `jq` is not installed on this machine.** `curl` (8.18.0) and `bash` are. This is why scripts under `scripts/kapso/` parse JSON with `node` rather than `jq`.

### 5.0.1 Audit of the runbook commands

The original report took these commands from the documentation, not the tool. They were checked one by one.

| Original runbook command | Exists? | Verdict |
| --- | --- | --- |
| `kapso whatsapp numbers list --output json` | Yes | **CORRECT** |
| `kapso whatsapp messages list --phone-number-id <id> --direction inbound --limit 5 --output json` | Yes | **CORRECT**, all four flags exist with those exact names |
| `kapso whatsapp conversations list --phone-number-id <id> --status active --output json` | Yes | **CORRECT**; `--status` accepts `active\|ended` |
| `kapso whatsapp messages get <message-id> --output json` | Yes | **CORRECT**; the ID is a positional argument |
| `kapso whatsapp webhooks new --phone-number-id ... --url ... --event ... --active` | Yes | **CORRECT**; `--url` is the only required flag |
| `kapso whatsapp webhooks list --phone-number-id <id>` | Yes | **CORRECT** |
| `kapso login`, `kapso status` | Yes | **CORRECT** |
| `... --output json \| jq '.[0] \| {...}'` | — | **INCORRECT: corrected below** |

**CORRECTION 1 (the one that broke the runbook).** CLI JSON **is not a bare array**: it is wrapped. `messages list` and `conversations list` return `{ "data": [...], "paging": {...} }`; `numbers list` returns `{ "data": [...], "meta": {...} }` (`PagedResponse<T>` and `ApiEnvelope<T>` in `dist/models/api.d.ts` and the `@kapso/whatsapp-cloud-api` types). The original report's `jq '.[0]'` **would not have returned anything**. The correct expression is `jq '.data[0]'`.

**CORRECTION 2 (minor).** `--output json` is **the default value** in `numbers list`, `messages list`, `messages get`, `conversations list`, `webhooks list`, and `logs search`: providing it is redundant but harmless, and should remain explicit so the runbook does not depend on a default. It is **not** the default in `kapso status` or `kapso whatsapp webhooks new`, where the default is `human` and the flag **is necessary**.

**FACT: JSON field names are `snake_case`.** The CLI applies `decamelizeKeys` from `humps` to everything it prints (`dist/utilities/output.js`). Internal types are camelCase (`hasMedia`, `mediaData`, `contentType`, `byteSize`), but output is `has_media`, `media_data`, `content_type`, `byte_size`, matching section 2's documentation. The scripts still tolerate both forms.

**FACT: CLI 0.18.0 has no sandbox command.** `kapso whatsapp sandbox` returns `Error: Command whatsapp:sandbox not found`, and the word `sandbox` **does not appear anywhere in the CLI source code**. This confirms through the tool what the documentation suggested: creating and activating the sandbox session is dashboard + phone only.

**NEW FINDING: `kapso logs search` can show what Kapso delivered to webhooks.** It was not in the original report. It supports `--source all|external_api_log|whatsapp_webhook_event|flow_event|webhook_delivery`, `--query`, `--filter k=v`, `--period 24h|7d|30d`, `--problems-only`, and `--limit`. It enables inspecting webhook deliveries **without setting up a tunnel**, making it the natural complement to step 4.

**NEW FINDING: a number record includes `inbound_processing_enabled`.** The `WhatsAppNumber` type (`dist/models/api.d.ts`) includes `inboundProcessingEnabled?: boolean`. If the sandbox does not deliver anything inbound, this is the first field to check. **That type has no field marking a number as sandbox**: the sandbox is identified by its visible number, not a discriminator.

**NEW GAP / GOTCHA.** SDK types declare `kapso.content` as `Record<string, unknown>`, while the webhook documentation example shows it as a **string** (`"Photo description Image attached (photo.jpg) ..."`). Both cannot be true at the same time. **Do not parse `content` until seeing a real payload.**

**RESOLVED BY THE TEST.** The prior analysis was a weak inference: `GET https://api.kapso.ai/media/<nonexistent-id>` without credentials returns **404 HTML**, not 401 or 403, which could not support a conclusion because 404 can be issued before or after authorization.

The 2026-08-22 measurement resolves it: the actual `media_data` URL was downloaded **without any credentials**, with `HTTP 200` and exact `byte_size`. **It does not require `X-API-Key`.** With the corresponding security implication: that URL is a secret, because anyone who has it can download the file.

### 5.1 Scripts to avoid doing it by hand

Two scripts in [`scripts/kapso/`](../../scripts/kapso/), written using **verified** CLI syntax:

| Script | What it does | Output |
| --- | --- | --- |
| [`poll-inbound.sh`](../../scripts/kapso/poll-inbound.sh) | Polls inbound messages every N seconds until it finds one with `has_media == true`, then prints it formatted. A person sends the photo and the script detects it automatically. It tolerates missing messages and CLI errors without stopping. | `kapso-inbound-media.json` with the full payload · exit `0` found / `2` timeout |
| [`check-media-url.sh`](../../scripts/kapso/check-media-url.sh) | Requests a `media_data.url` at **0, 5, 10, and 30 minutes** and records each attempt's HTTP status. It tries first without credentials and, if it gets 401/403, retries with `X-API-Key`. It measures the two gaps in section 4. | CSV `kapso-media-url-vigencia.csv` with minute, anonymous status, authenticated status, and reading |

Both use `node` to parse JSON (`jq` is not installed here) and `bash`. `poll-inbound.sh` warns in advance if `kapso status` reports `authenticated: false`.

### Step 0: Install and authenticate (once)

**Already completed on this machine:**

```bash
npm install -g @kapso/cli    # FACT: 0.18.0 installed
```

**Pending, requires a person**: `kapso login` is interactive and opens the browser:

```bash
kapso login                  # session is stored in ~/.kapso/cli/
kapso status --output json   # must change from "authenticated": false to true
```

Browser-free alternative, with a project API key created at [app.kapso.ai](https://app.kapso.ai) (verified: the CLI reads this variable):

```bash
export KAPSO_API_KEY=your_project_api_key   # PowerShell: $env:KAPSO_API_KEY = "..."
```

### Step 1: Create and activate the sandbox session (**human step**)

In the dashboard, **WhatsApp → Sandbox → Add Test Number**, enter the phone that will be used for testing, then select **Create**. Kapso displays a six-character code, the shared number, and an **Open WhatsApp** button. From that phone, send the exact code (case-sensitive) in the chat. A confirmation arrives. **The code expires after 15 minutes.**

### Step 2: Locate the sandbox `phone_number_id`

```bash
kapso whatsapp numbers list --output json
```

**Syntax verified.** Output is `{ "data": [ ... ], "meta": { ... } }`. For a quick view, `--output human` prints one line per number including `phone_number_id=`:

```bash
kapso whatsapp numbers list --output human
```

**No field marks a number as sandbox**: identify it by the visible number shown in the dashboard. Record its `phone_number_id`; everything that follows uses it. If the CLI accepts the actual number instead of the ID, `--phone-number "+549..."` resolves it automatically (a flag available in `messages list`, `conversations list`, `webhooks list`, and `messages get`).

It is also worth checking `inbound_processing_enabled` on the number record: if it is `false`, nothing will arrive and the rest of the runbook proves nothing.

### Step 3: **Send a photo containing a QR code from the phone to the sandbox number** (**human step**)

This is the step that decides the research and **cannot be simulated**. A real photo taken with the camera, sent as an image through the chat.

To avoid watching the console, start the waiting script **beforehand**, which detects the message automatically:

```bash
./scripts/kapso/poll-inbound.sh --phone-number-id <id> --interval 10 --timeout 900
```

It exits with `0` as soon as it sees an inbound message with `has_media == true`, prints the summary, and leaves the complete payload in `kapso-inbound-media.json`. It exits with `2` if the timeout expires, and in that case prints what to check before concluding anything.

### Step 4: Read the real message and inspect the payload

If manual inspection is preferred instead of the script:

```bash
kapso whatsapp conversations list --phone-number-id <id> --status active --output json

kapso whatsapp messages list \
  --phone-number-id <id> \
  --direction inbound \
  --limit 5 \
  --output json
```

For a specific message:

```bash
kapso whatsapp messages get <message-id> --output json
```

**Decision criteria for the latest inbound message:**

| Observation | Interpretation |
| --- | --- |
| `type: "image"` and `kapso.has_media: true` and `kapso.media_data.url` are present | The sandbox delivers media. Hypothesis confirmed. |
| `type: "image"` but `has_media: false` or no `media_data` | The sandbox receives the image but does not ingest it. The `message.image.id` proxy path remains. |
| the message does not appear, or arrives as text/placeholder | The sandbox does not deliver inbound media. Escalate to Kapso support or use a production number. |

Extract only what matters. **Watch the envelope**: the previous version of this report used `.[0]` and would not have returned anything:

```bash
kapso whatsapp messages list --phone-number-id <id> --direction inbound --limit 1 --output json \
  | jq '.data[0] | {type, image, has_media: .kapso.has_media, media_url: .kapso.media_url, media_data: .kapso.media_data}'
```

Without `jq` (this machine's case), the same with `node`:

```bash
kapso whatsapp messages list --phone-number-id <id> --direction inbound --limit 1 --output json \
  | node -e "let r='';process.stdin.on('data',c=>r+=c).on('end',()=>{const m=JSON.parse(r).data[0];console.log(JSON.stringify({type:m.type,image:m.image,...m.kapso},null,2))})"
```

**Useful complement**: see what Kapso delivered to webhooks without setting up a tunnel:

```bash
kapso logs search --source whatsapp_webhook_event --period 24h --limit 20 --output json
kapso logs search --source webhook_delivery --problems-only --output json
```

### Step 5: Test the media URL: it exists, authenticates, and returns bytes

This step measures the two gaps in section 4, **lifetime** and **authentication** of `media_data.url`, and is automated:

```bash
./scripts/kapso/check-media-url.sh "<media_data.url>" \
  --api-key "$KAPSO_API_KEY" \
  --download ./qr-sandbox.jpg
```

It requests the URL at **0, 5, 10, and 30 minutes**; at each point it first tries without credentials and, if it receives 401/403, retries with `X-API-Key`. It records everything in `kapso-media-url-vigencia.csv` and reports between which two minutes it stopped returning bytes. **It runs for 30 minutes: leave it in a separate terminal.** The measurement *is* the waiting.

The equivalent `curl` commands, if manual testing is preferred:

```bash
curl -sSI "<media_data.url>"                                  # is it public?
curl -sSI -H "X-API-Key: $KAPSO_API_KEY" "<media_data.url>"   # does it need the API key?
curl -sSL -H "X-API-Key: $KAPSO_API_KEY" "<media_data.url>" -o ./qr-sandbox.jpg
```

**If it still returns `200` after 30 minutes, the URL is not short-lived**; if it returns `403`/`404`, that minute is the adapter's actual budget.

Then test the bytes against the engine, which is the only criterion that matters:

```bash
node -e "require('./packages/verification/dist/decode.js').decodeImage(require('fs').readFileSync('./qr-sandbox.jpg')).then(r=>console.log(r))"
```

### Step 6: Fallback path, if `media_data.url` does not work

Using the payload's `message.image.id`:

```bash
curl -sS -H "X-API-Key: $KAPSO_API_KEY" \
  "https://api.kapso.ai/meta/whatsapp/v24.0/<media_id>?phone_number_id=<id>"
```

The response contains Meta's URL (five-minute lifetime) and Kapso's `download_url` (four minutes, no `X-API-Key` required).

### Shell-free alternative: Project MCP

**FACT** ([MCP server](https://docs.kapso.ai/docs/whatsapp/mcp)). Endpoint: `https://api.kapso.ai/mcp`. Authentication uses browser login or the `Authorization: Bearer YOUR_PROJECT_API_KEY` / `X-API-Key: YOUR_PROJECT_API_KEY` header.

```bash
claude mcp add --transport http kapso https://api.kapso.ai/mcp \
  --header "Authorization: Bearer $KAPSO_API_KEY"
```

Relevant tools, with their documented actions:

| Tool | Actions |
| --- | --- |
| `whatsapp_numbers` | `help`, `list`, `get`, `resolve`, `health`, `start_setup`, `create`, `update`, `delete` |
| `whatsapp_conversations` | `help`, `list`, `get`, `set_status` |
| `whatsapp_messages` | `help`, `list`, `get`, `send`, `mark_read` |
| `whatsapp_webhooks` | `help`, `list`, `get`, `create`, `update`, `delete` |

`action: "help"` on any of them returns required and optional parameters plus examples. **GAP.** The documentation does not publish the field schema returned by `whatsapp_messages.list`; it cannot be claimed in advance that it exposes `media_data` in this form.

### When it is time to connect the actual webhook

```bash
kapso whatsapp webhooks new \
  --phone-number-id <id> \
  --url "https://<tunnel>.ngrok.app/webhooks/kapso/whatsapp" \
  --event whatsapp.message.received \
  --kind kapso \
  --payload-version v2 \
  --active \
  --output json

kapso whatsapp webhooks list --phone-number-id <id> --output json
```

**Syntax verified, with two additions absent from the original report.** `webhooks new` exposes `--kind kapso|meta` and `--payload-version v1|v2` as explicit flags: they are exactly the two decisions section 2 says must be made (`kapso` format to get `media_url`; payload v2). They should be declared rather than trusting the default. `--buffer-enabled` / `--no-buffer-enabled`, `--buffer-window-seconds`, `--max-buffer-size`, `--header Name=value`, `--secret-key`, and `--inactivity-minutes` also exist. **For the proof of concept, use `--no-buffer-enabled`**: buffering changes the body shape (section 2) and adds an unnecessary variable to the test. `--url` is the only required flag, and `--output` **is required here** because its default is `human`.

In the dashboard, the equivalent path is **WhatsApp → Configurations → Sandbox WhatsApp → Manage Webhooks**. Only HTTPS endpoints reachable from the Internet are accepted; for local use, the documentation recommends `ngrok http 3000` or `cloudflared tunnel --url http://localhost:3000`.

### 5.9 What remains to be done, and who must do it

Everything automatable is complete. What follows **requires a person** and cannot be simulated, in this order:

1. **Log in to the CLI.** Run `kapso login` in an interactive terminal (opens the browser). Browser-free alternative: create a project API key at [app.kapso.ai](https://app.kapso.ai) and export it as `KAPSO_API_KEY`. **Blocker: without this, everything else returns `Not authenticated`.**
2. **Confirm login.** `kapso status --output json` must return `"authenticated": true`. It currently returns `false`.
3. **Create the sandbox session in the dashboard.** WhatsApp → Sandbox → *Add Test Number* → enter the test phone → *Create*. Record the six-character code. CLI 0.18.0 **cannot** do this step.
4. **Activate the session from the phone.** Send that exact code (case-sensitive) by WhatsApp to the shared sandbox number. **It expires after 15 minutes.**
5. **Obtain the `phone_number_id`.** Run `kapso whatsapp numbers list --output human`. Also verify that `inbound_processing_enabled` is not `false`.
6. **Start the detector.** Run `./scripts/kapso/poll-inbound.sh --phone-number-id <id> --interval 10 --timeout 900` and leave it running.
7. **Send the QR photo from the phone to the sandbox number.** A real photo taken with the camera, sent as an image rather than a document. **This is the step that answers the research question.**
8. **Read the verdict** using the step 4 table, based on the summary printed by the script or `kapso-inbound-media.json`.
9. **Measure the media URL.** Run `./scripts/kapso/check-media-url.sh "<media_data.url>" --api-key "$KAPSO_API_KEY" --download ./qr-sandbox.jpg`. It runs for 30 minutes.
10. **Test the bytes against the engine.** Run `decodeImage` on `./qr-sandbox.jpg`. This is the only criterion that determines whether the channel works.
11. **Return to this report and record the result**, including measured lifetime and whether the URL requested `X-API-Key`. Until then, **section 1 remains true: it is not proven that the sandbox delivers images.**

---

## 6. What the Test Webhook button does NOT answer

**FACT.** Kapso exposes `POST /whatsapp/webhooks/{webhook_id}/test`, described verbatim as follows ([Test project webhook](https://docs.kapso.ai/api/platform/v1/webhooks/test-project-webhook)):

> "Send a test payload to the webhook endpoint. Optionally specify an `event_type` to test with a specific event payload. The event type must be one of the events the webhook is configured to receive."

**INFERENCE (strong and directly derived from the text).** Kapso **generates the payload on demand**, using an `event_type` selected by the person triggering the test. It does not come from a real message or number: it is synthetic data Kapso builds to exercise the endpoint. Therefore, if triggered with `event_type: whatsapp.message.received`, **the test payload may contain a perfectly formed `media_data` even if the sandbox never delivers an image in real life**. It shows contract shape, not channel capability.

**It is useful for:** validating that the endpoint is reachable, the HMAC signature verifies, deduplication by `X-Idempotency-Key` works, and the parser does not fail on the v2 structure.

**It is not useful for:** answering this research question. The only valid test is a real message, sent by a person from a real phone (section 5, steps 1 and 3).

**GAP / CORRECTION TO A SECONDARY SOURCE.** A search-engine summary attributed the sentence "realistic sample data that matches the exact structure of production webhooks" to the documentation. **That sentence was not found on any Kapso documentation page.** The full corpus was searched for `Send Test`, `sample data`, `realistic`, `production webhook`, and `exact structure`: the only result is the endpoint description quoted above. Neither a button literally named "Test Webhook" nor "Send Test" was found documented in the dashboard docs. The warning still stands, based on the nature of an on-demand generated payload, but **that sentence must not be cited as though it came from Kapso**. The [`docs.kapso.ai/docs/integrations/api-webhooks`](https://docs.kapso.ai/docs/integrations/api-webhooks) page that the search engine offered as a source returns **HTTP 404**.

---

## 7. Implications for the adapter

The engine does not change. `decodeImage(source: string | Buffer)` in `packages/verification/src/decode.ts` already accepts bytes. The missing part is the piece that obtains them, and these are the constraints derived from what was verified:

1. **Download when the webhook is received.** The lifetime of `media_data.url` is unknown and the fallback path expires in five minutes. Do not defer downloading to a job with arbitrary latency. (Section 4.)

2. **Persist `message.image.id` alongside the event.** It is the only recovery path with a wide window (seven days according to Meta) if Kapso's URL fails.

3. **Two retrieval paths, not one.** Primary: `GET kapso.media_data.url`. Fallback: `GET https://api.kapso.ai/meta/whatsapp/v24.0/{media_id}?phone_number_id=...`, then `download_url` (which does not require `X-API-Key`). The adapter should implement the primary path and keep the second behind an interface, not hardwire it.

4. **The handler returns `200` in under 10 seconds and decodes nothing.** Verify signature → deduplicate by `X-Idempotency-Key` → enqueue → `200`. The engine's variant ladder and tile sweep run in the worker.

5. **Idempotency is mandatory.** Retries occur at 10 s, 40 s, and 90 s. Without deduplication, one photo can be processed up to four times.

6. **Parse both body forms.** With buffering disabled, the standalone event arrives; with buffering, `{ type, batch: true, data: [...], batch_info }` arrives. Detect it through `X-Webhook-Batch` or `body.batch === true`.

7. **Validate `content_type` and `byte_size` before downloading.** They arrive in the payload. Reject non-images and impose an application-specific byte cap: the sandbox reception limit is undocumented.

8. **Do not assume a phone number is present.** "Do not assume every payload has a phone number": Kapso adds `business_scoped_user_id`, `parent_business_scoped_user_id`, and `username`. This matters for the identity and subscription gateway defined in [`docs/b2c-flow.md`](../b2c-flow.md), which is resolved **before** the engine and outside the chat.

9. **Preserve the raw body for signing, and verify it against a real webhook.** The documentation says "raw JSON payload" but its examples reserialize with `JSON.stringify`. The ambiguity is unresolved in the documentation.

10. **The QR arrives as a photo from a nervous user, not as a clean file.** This is exactly the case for which `decode.ts` built its preprocessing ladder. The adapter must not crop, recompress, or resize before passing the bytes on: the engine already has its own `MAX_SIDE` and strategy.

---

## Limitations of this research

> **Reconciled with the 2026-08-22 experiment.** A previous version of this section said the main question remained open. It no longer does: the runbook was executed. What follows distinguishes what was proven from what remains unmeasured.

**Closed by the test:**

- **The sandbox delivers images.** A photo was sent from a phone and arrived as `type: "image"` with `has_media: true` and complete `media_data`. This could not previously be written as a fact anywhere; now it is an observed fact.
- **`media_data.url` does not require authentication.** Anonymous download returned `HTTP 200` with exact `byte_size`.
- **The response shape no longer comes from SDK types.** It was previously known from package declarations; there is now a captured real payload, which differs from the documentation in the blob host.

**Still open:**

- **The lifetime of `media_data.url` was not measured.** This is the most costly gap if assumed incorrectly. The download happened within a few minutes of receiving the message, so it is unknown whether and when that URL expires. `scripts/kapso/check-media-url.sh` measures it; until it is run, the design requirement is to download on webhook receipt and persist the bytes.
- **Reading a real code through the channel was not tested.** The complete pipeline worked, WhatsApp, Kapso, download, and `decodeImage`, but the test image was AI-generated and its pattern was not a valid QR code, so it returned `UNREADABLE` after 91 attempts. **It must be repeated with a photo of a real QR code**; `scripts/qr-tests/` generates sheets ready to photograph.
- **The webhook was not tested.** Everything verified was done by querying the API through the CLI. That Kapso delivers the same payload to a custom endpoint is a reasonable inference, not a measured fact.
- **Retention**: how long Kapso retains the file is undocumented anywhere. It publishes capacity, never duration.
- **The `scripts/kapso/` scripts were not tested against Kapso.** Their syntax, handling of the `Not authenticated` error, and parser were validated against synthetic payloads with the shape documented in section 2. `check-media-url.sh` was tested against real URLs returning `200` and `404`. **Neither has yet run against a real message.**
- **Kapso's documentation changes rapidly.** Everything cited is from the 2026-08-22 version.
- **One URL failed:** `https://docs.kapso.ai/docs/integrations/api-webhooks` → **HTTP 404**. `https://www.npmjs.com/package/@kapso/cli` returned **HTTP 403** to the automated tool; the version was obtained from `https://registry.npmjs.org/@kapso/cli/latest`.
- **No legal issues were evaluated.** Retention, data residency, DPA, SLA. A QR photo taken by a user is data about a real person; this must be resolved before production and cannot be resolved with technical documentation.
- **Out of scope:** production onboarding with Meta, Argentine number, business verification, templates, billing. This report answers one question only.
