# QR Safe Bot — Chat QR verification design

> Date: 2026-08-22 · Scope: Argentina · **Nature of this document: product design, not research.** It adds no new findings from primary sources; it builds on the scope established in [QR fraud in Argentina and blockchain](./qr-fraud-argentina-blockchain.md), [QR-generating competitors in Argentina](./qr-generating-competitors-argentina.md), and [scan-to-redirect intermediary](./scan-redirect-intermediary.md). Claims inherited from those reports retain their source label; design decisions are marked as such.

---

## Scope Decision

** Universal Coverage **: The bot responds to any QR sent to it, not a closed domain.

It is a product decision made with knowledge of the risk. This document does not discuss it: it assumes it and designs it to be sustainable.

---

## 1. The risk to be neutralized

With universal coverage, the vast majority of legitimate QRs ** will not be on the registry**. If the bot responds to all of them with a warning, the following happens, in this order:

1. The user verifies a legitimate QR and receives an alert.
2. Pay the same, because the trade is in front of you and nothing happens.
3. Repeat two or three times.
4. **Learn that alert means nothing.**
5. The day the alert is correct, ignore it.

The product does not fail by producing a false positive. It fails because **it trains its own users to ignore it**. This is the cold-start problem already stated in the main report (§ structural risks): *"Without a critical mass of registered merchants, there is no reason to verify."*

** Design decision **: the solution is not to shorten the scope - it has already been decided that it is universal - but ** to make the force of the response proportional to what the bot actually knows**.

---

## 2. Graduated Trust Architecture

Registration is not a flat list of merchants. It is a set of ** coverage domains **, each with its own status:

| Concept | Definition |
|---|---|
| **Domain** | A limited and enumerable universe of issuers. Ex.: * measured parking of the Municipality of Córdoba*; *products registered in SENASA*; *branches of a chain*. |
| ** Domain coverage ** | What proportion of the legitimate issuers of that domain is loaded. It can be **closed** (100%, listed and agreed with the issuer) or **open** (partial). |
| **Resolution** | Given a QR, which domain it belongs to — and therefore how much authority the bot can speak with. |

The key: **the bot knows which of your domains are closed.** An identifier absent in a closed domain is a strong signal. The same identifier absent in uncovered terrain is no sign of anything, and the bot has to say it with those words.

This allows you to grow without lying: each domain that is 100% closed turns a zone of silence into a zone of firm response, without touching the architecture.

---

## 3. The Four Response States

No state claims that a QR is "safe" or accuses fraud. The bot only establishes **membership or non-membership**: whether a specific code was authorized by the business the consumer believes they are paying. This is a narrower, more defensible claim than "this is safe," and the only claim the product can support.

### 3.1 Verified
> **This code is authorized by {Issuer}.**

The payment identifier is registered by the issuer that the user believes is paying. It is the only affirmative state.

### 3.2 Unauthorized — strong signal
> **This QR is not registered as an authorized means of collection by {Issuer}.**

It is only issued when the QR resolves to a ** closed domain ** and the identifier is not in it. Here the silence of the record is information, because the record is complete.

It is the answer that justifies the product. **It should never be issued outside a closed domain.**

### 3.3 Out of Coverage — No Opinion
> ** I don't have a record of this merchant yet, so I can't confirm or rule anything out. This is not a warning.**

The QR is structurally valid but falls on uncovered ground. **The last sentence is not optional**: it is what prevents the user from reading silence as suspicion, and it is what preserves the value of state 3.2.

Accompany with what can be affirmed without registration (see §4.2) and with the route of enrollment of the trade.

### 3.4 Structural anomaly
> **This code has something weird: {reason}.**

It doesn't depend on registration. They are verifiable observations on the very content of the QR, and work with zero coverage.

---

## 4. What the bot can claim

### 4.1 With registration (membership)

Requires the sender to be charged. It is the core of the product and the one that gives the states 3.1 and 3.2.

### 4.2 No record (structural analysis)

This works from day one, with the registration empty, and is what makes the bot useful before it has coverage:

**In paid QR (EMVCo Merchant Presented Mode frame):**
- Decode the complete TLV structure and display it in plain language: who claims to be paid, in what currency, in what country, with what identifier.
- Validate the **CRC-16/CCITT-FALSE** of field 63.
- **Design warning**: a valid CRC **does not** establish legitimacy. It detects transmission errors, not forgery; a well-formed fraudulent QR passes it just like the original. The bot must never present "CRC valid" as reassurance. It is technical data, not a verdict. [Inherited from `scan-redirect-intermediary.md`]
- Compare the **declared name (field 59)** with the payment identifier. Field 59 is free text and can be copied; "MUNI CORDOBA SEM" does not bind anything. When the declared name suggests a public entity or known brand and the identifier belongs to a different scheme, this can be reported as an anomaly without a registry.
- Detect **currency or country inconsistent** with the declared context.

**In Scan QR (URL):**
- Show the ** real and complete destination **, expanding shorteners. It is the most useful and cheapest contribution: the user sees where he is going before going.
- Point out discrepancy between the domain and the entity that the QR claims to represent.
- Detect deceptive homographs and subdomains, precisely what the SENASA mechanism ("check that the URL begins with `aps2.senasa.gov.ar`") leaves to the human eye and cannot withstand.

> ** Positioning Note **: §4.2 alone is not defensible as a product — this is what Bitdefender Scamio already does, for free. The differential is §4.1. §4.2 is the bridge that keeps the bot useful while the register fills.

---

## 5. Channel

### 5.1 The WhatsApp Problem

It is stated in the main report (§4.2) and should not be minimized:

> *"WhatsApp is the dominant fraud channel (5,509 UFECI reports in 2024): risk of confusion with a scam. [...] It inherits the problem of entrusting the identity anchor to a dominant fraud channel."*

A bot that asks users to "send me the QR" is formally indistinguishable from the scam that says the same thing. There is also an operational constraint to validate before committing to the channel: **WhatsApp Business API limitations for financial use cases**.

### 5.2 Design Mitigations

- **Bot never starts conversation.** Only respond to the person who writes to you first. Any proactive message destroys the distinction with fraud.
- **The bot never asks for data.** Neither amount, nor account, nor DNI, nor voucher. Receives an image and returns an analysis. A bot that asks for nothing cannot be confused with one that asks.
- ** Physical, not digital, entry point.** Access comes from the shop or municipality sign, not from a forwarded link. This attacks the root vector and also turns the sender into an acquisition channel.
- ** Verifiable identity outside the channel**: verified official account, published on the site of the associated issuer.

> **HYPOTHESIS to be validated**: that a physical entry point is sufficient to avoid confusion with fraud. No Argentine background of QR verification bot was found, so there is no precedent to learn from. [Inherited from main report]

---

## 6. How to fill out the registration

Order matters: each closed domain turns mute terrain into terrain with firm response.

| Order | Domain | Why first | Status |
|---|---|---|---|
| 1 | **Metered parking, Municipality of Córdoba** | ~600 posters, single issuer, enumerable identifiers. It has already issued public warnings about fake QR fines, confirming awareness of the threat. 100% closable with a single agreement. | Checked Lead #1 |
| 2 | ** Multi-branch chains ** | One agreement covers N locations. High density per unit of commercial effort. | Unmapped |
| 3 | **Issuers with QR already normalized** | SENASA already anchors its QRs in its own domain: the domain is enumerable without building it. | View Competitor Report |

**Metric that governs the product**: proportion of queries that fall into the closed domain. While low, the bot is mostly §4.2 and has no competitive defense. This is the number to look at, not the total number of queries.

---

## 7. Open risks

1. **Erosion of state 3.3.** If commercial pressure turns "out of coverage" into a soft warning, the product collapses into the §1 scenario. This line cannot be crossed.
2. **Liability for a false verification.** If the bot says "verified" about a QR that proves fraudulent, the reputational damage is greater than if the product had not existed. This requires legal definition before launch.
3. ** Actual friction.** The user must decide to verify **before * * paying, open the chat and take a photo. It is more friction than an app at the time of use; what is saved is the installation. **It's not validated for people to do that.**
4. ** Dominant Fraud Channel.** §5.1. Mitigated by design, unresolved.
5. ** Free competitor already active.** Bitdefender Scamio does on-demand QR analysis by chat at no cost. Everything that is §4.2 competes against free.

---

## What needs to be verified before building

- ** WhatsApp Business API restrictions for financial cases.** Blocker for channel choice. Not verified.
- **What the Mercado Pago Official QR Kit sticker encodes**: a pure EMVCo payload or a proprietary URL. This changes what the bot can parse in the country’s most common case. An empirical test is pending, as declared in `scan-redirect-intermediary.md`.
- **If the Municipality of Córdoba can list their payout identifiers.** All of Domain 1 depends on that, and there is no confirmation that such a list exists in a searchable form.
- ** Legal viability of status 3.1** against a verified fake.
