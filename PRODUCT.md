# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Merchant administrators register their business, payment points, and authorized payment QR codes from the QRSafe Admin web application.
- End users send a QR image to the official QRSafe WhatsApp channel and receive a binding verification result.

## Product Purpose

QRSafe creates a verifiable binding between a business and the payment artifacts it claims to authorize. The MVP proves the complete path from merchant onboarding and QR registration to end-user verification over WhatsApp.

## Positioning

QRSafe does not judge a QR by appearance or checksum alone. It compares the decoded QR fingerprint with a registry created by a verified merchant and states whether that exact code was registered as authorized by that business.

## Operating Context

- The merchant operates from `apps/admin` in a desktop or mobile browser.
- Business and representative verification are manual for the hackathon MVP and pre-approved for the recorded demonstration.
- The merchant registers a reusable static payment QR from an image captured or selected on a phone or computer.
- The end user sends a photo through WhatsApp. Kapso delivers it to `apps/api`, which decodes the QR and queries the same registry used by the merchant panel.
- The public landing in `apps/app` is independent from the merchant and verification flows.

## Capabilities and Constraints

- Supabase provides authentication and the PostgreSQL data store, accessed only through `apps/api`.
- The MVP supports one business per authenticated owner and does not include team membership, roles, invitations, or advanced multi-tenancy.
- A verified business can create payment points and register static EMV payment QR bindings.
- Destination ownership is manually confirmed for the MVP; no acquirer or banking ownership API is integrated.
- A binding uses the SHA-256 fingerprint of the exact decoded payload.
- QRSafe states registered authorization or lack of registry coverage. It does not guarantee that a payment, account, device, or transaction is safe and does not label unknown QR codes as fraudulent.
- Merchant operations occur in the web panel. WhatsApp initially serves end users only.
- xMCP integration and merchant operations over WhatsApp are stretch goals after the end-to-end happy path.

## Brand Commitments

- Product name: QRSafe.
- The language must be direct, calm, and exact about what evidence supports each claim.
- Use "binding activo", "registrado" and "autorizado por el comercio" rather than broad promises such as "pago seguro".

## Evidence on Hand

- `packages/verification` decodes photographed QR codes and parses EMVCo and URL payloads.
- `apps/api/src/kapso` receives signed Kapso webhook events, downloads media, and replies over WhatsApp.
- `docs/research/fraude-qr-argentina-y-blockchain.md` documents the identity-binding thesis and its limitations.
- No customer logos, testimonials, production KYB provider, or acquirer integration are available and none may be fabricated.

## Product Principles

1. Verify the relationship, not the visual appearance of the QR.
2. State only what the registry can prove.
3. Keep merchant setup short enough to demonstrate end to end.
4. Make the payment point and authorized business legible in every positive result.
5. Complete the browser-to-WhatsApp loop before adding automation channels.
