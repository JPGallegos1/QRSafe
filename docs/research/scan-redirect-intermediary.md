# Middle layer between scan and redirect — feasibility per platform

> Date: 2026-08-22 · Scope: Android and iOS (Argentine park), Argentine mobile browsers and wallets/PSP, platform status as of August 2026 · Method: verification against official platform documentation (developer.android.com, developer.apple.com, developer.chrome.com, webkit.org, extensionworkshop.com/MDN, emvco.com), product documentation of wallets and text of BCRA communications downloaded from the official site. Each claim carries its source labeled **[PRIMARY]** or **[SECONDARY]** and its epistemic status **FACT / INFERENCE / HYPOTHESIS**. The gaps are stated in line with what was sought.

This report answers an architectural rather than a market question: **can QRSafe sit between QR scanning and destination loading, and what limits do Android, iOS, and browsers impose?** It supplements [`qr-fraud-argentina-blockchain.md`](./qr-fraud-argentina-blockchain.md).

---

## Executive summary

1. **The finding that reorders the question: in the Argentine payment QR there is no redirection to intercept.** The interoperable QR follows the EMVCo Merchant Presented Mode standard, the content of which ** is not a URL**. EMVCo says it verbatim: *"such data is payment specific and does not have a general purpose, unlike a uniform resource locator (URL) […] A generic QR Code reader such as the mobile operating system provided camera application is generally not usable with the EMV Merchant Presented QR Code Specification."* [PRIMARY — https://www.emvco.com/emv-technologies/qrcodes/] **DONE**. The system camera does not open a browser: there is no → browser camera jump to get in the way.

2. ** Direct consequence **: Options 1 and 2 (OS layer and browser layer) **do not apply to QRSafe core use case ** (charging QR override). They apply to ** Scan QR ** — menu, signage, signage, plates, tags — and to *quishing* with URLs, which do encode http(s) and do end in a browser.

3. **Android — Option 1: viable TODAY, with only one documented route: registering as a browser.** From Android 12, *"a generic web intent resolves to an activity in your app only if your app is approved for the specific domain contained in that web intent. If your app isn't approved for the domain, the web intent resolves to the user's default browser app instead."* [PRIMARY] As QRSafe does not control third-party domains, it cannot verify them via App Links; the only door left open is the ** default browser role ** (`ROLE_BROWSER`), which is obtained by declaring a generic filter attempt `<data android:scheme="http" />` and asking the user with `RoleManager.createRequestRoleIntent()` (API 29+). [PRIMARY] **DONE**.

4. **iOS — Option 1: impossible as a non-browser app; possible ONLY as a browser with managed entitlement and explicit approval from Apple.** Universal Links require a file served in the target domain and Apple is limited to: *"Only you can store this file on your server, securing the association of your website and your app."* [PRIMARY] **DONE** — QRSafe cannot claim third-party domains. The only remaining path: *"The system invokes the default web browser in iOS whenever the user opens an HTTP or HTTPS link"* [PRIMARY], and that role requires the managed entitlement `com.apple.developer.web-browser`, which is requested by form and approved by Apple on a case-by-case basis. **And Apple explicitly contemplates the exception that QRSafe needs**: *"Your app may present a 'Safe Browsing' or other warning for content suspected of phishing or other problems."* [PRIMARY] **DONE**.

5. **Option 2 — extensions: covers a maximum ~9% of the Argentine park.** Chrome for Android does not support extensions (Chromium work is for desktop *builds* over Android, with mobile explicitly out of reach) and Chrome is 86.31% of the mobile browser in Argentina. Safari iOS does support Web Extensions from iOS 15, but Apple documents that **does not support request blocking **: *"`BlockingResponse` not supported. Blocking requests not supported." * [PRIMARY] — only `declarativeNetRequest`, local declarative rules, no server query per request.

6. **DNS is not good for this and it should be said straight away.** DNS resolves host names: it does not see the path, it does not see the *frame* EMVCo, it does not know if the navigation came from a QR or a tap, and blocking at the DNS level means blocking the entire domain. Google itself limits the scope of Private DNS: *"The secure channel only applies to DNS, so it can't protect users from other kinds of security and privacy violations."* [PRIMARY] **DONE**.

7. **Option 3 — SDK in wallets: it is the only architecture that truly sits inside the payment flow, and there is a concrete regulatory lever.** Comm. "A" 8032 states that *"cuando un pago con tarjeta de crédito se inicie desde una billetera digital interoperable mediante la lectura de un código QR, la responsabilidad por fraude será asumida por la billetera"* (English: "when a credit-card payment is initiated from an interoperable digital wallet by scanning a QR code, liability for fraud will be assumed by the wallet") [PRIMARY] **FACT**: the actor that absorbs the loss is the one that must integrate mitigation. Com. "A" 7463 requires schemes to support their fraud analyses with tools that identify suspicious patterns and to consider actions according to assessed risk, naming as an example *"alertar al cliente ordenante y/o requerirle confirmación por vías alternativas antes de cursar la transacción"* (English: "alert the ordering customer and/or require confirmation through alternative channels before processing the transaction") [PRIMARY] **FACT**. It is an obligation of means with an example that describes the QRSafe function: it legitimizes the category, but **does not require its purchase** (see §4.3). What does **not** exist today is a public wallet SDK to plug into: the only documented program (Mercado Pago’s issuing flow) is reserved for external digital wallets, not verifiers.

8. **Recommendation (§6)**: stop pursuing OS-level interception for payments: it does not exist. Split the product into two fronts with different architectures: **an owned channel + wallet SDK** for payment QR codes, and **a dedicated Android browser** (`ROLE_BROWSER`) for exploration QR codes, where the intermediary layer is technically real.

---

## 1. The point of interception: what happens between scanning and loading

Before evaluating architectures, it is necessary to determine what is being intercepted. **There is no single flow: there are two, and they are incompatible with each other.**

### 1.1 EMVCo Payment Flow A — QR (the central case of QRSafe)

**DONE** [PRIMARY]. The Argentine merchant QR carries an EMVCo *payload*, not a URL. The Mercado Pago API that generates the QR returns a `qr_data` field, described as *"Trama EMVCo para la generación del código QR"* (English: "EMVCo payload for generating the QR code"), with this response example:

```json
{
  "qr_data": "00020101021243650016COM.MERCADOLIBRE02013063638f1192a-5fd1-4180-a180-8bcae3556bc35204000053039865802BR5925IZABEL AAAA DE MELO6007BARUERI62070503***63040B6D",
  "in_store_order_id": "d4e8ca59-3e1d-4c03-b1f6-580e87c654ae"
}
```

Source: https://www.mercadopago.com.ar/developers/es/reference/qr-dynamic/_instore_orders_qr_seller_collectors_user_id_pos_external_pos_id_qrs/post

**FACT** [PRIMARY] EMVCo explicitly describes what that format entails for a generic reader:

> *"The EMV Merchant Presented QR Code Specification defines an interoperable and domain-specific format for communicating the data from the merchant to the consumer in a structured manner to initiate a payment; such data is payment specific and does not have a general purpose, unlike a uniform resource locator (URL). Consequently, a specific mobile app is generally required to process the information in the EMV QR Code and to conduct the payment itself. **A generic QR Code reader such as the mobile operating system provided camera application is generally not usable with the EMV Merchant Presented QR Code Specification.**"*
>
> https://www.emvco.com/emv-technologies/qrcodes/

**FACT** [PRIMARY]. The resolution of the destination is done by the wallet against the acquirer's API, not the browser: Mercado Pago's accepting flow documents the `GET /resolve?data={qr_raw}` call that `order_id` returns and payment methods. Source: https://www.mercadopago.com.ar/developers/es/docs/qr-code/interoperable/acceptor-flow

Actual sequence of Flow A:

```
Physical QR code (EMVCo payload)
   └─> system camera: decodes and displays PLAIN TEXT (no link, no navigation)
   └─> user opens their wallet and scans again
        └─> wallet: GET /resolve?data={qr_raw}  →  acquirer/IEP
             └─> wallet displays collector.name and amount
                  └─> confirmation  →  irreversible transfer
```

**There is no connection between “scan” and “browser” in this flow, because there is no browser.** The only gap available is *inside* the wallet, between `resolve` and user confirmation. That is Option 3, and there is no other.

> **Void declared**: it could not be confirmed with primary documentation what exactly encodes the sticker of the ** Official QR Kit ** of Mercado Pago (pure EMVCo frame or a proprietary URL that opens the app via App Links). Searched `mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr/kit-oficial`, static QR developer documentation (`/docs/qr-code/integration-configuration/qr-static/landing` returned **HTTP 404**) and API reference. If the kit were to encode a URL, some of Stream A would migrate to Stream B and change the verdict for Android. **It is the first empirical test to run (§7).**

### 1.2 Flow B — QR of exploration and quishing (where the intermediate layer does exist)

Restaurant menus, tourist signage, historic plaques, product labels, municipal posters, and phishing QRs all encode an http URL (s). Here it is:

```
Physical QR code (URL https://…)
   └─> camera / Lens: recognizes the URL and offers to open it
        └─> the OS resolves a web intent (Android) / opens the default browser (iOS)
             └─> ► INTERCEPTION POINT ◄
                  └─> page loads
```

Everything that follows in §2 and §3 applies **exclusively to Flow B**.

---

## 2 - Option 1 — OS Layer

### 2.1 Android

#### 2.1.1 What changed in Android 12 and why it closes the obvious path

**DONE** [PRIMARY]. Verbatim text of *Behavior changes: all apps* (Android 12), section **Web intent resolution**:

> *"Starting in Android 12 (API level 31), a generic web intent resolves to an activity in your app only if your app is approved for the specific domain contained in that web intent. If your app isn't approved for the domain, the web intent resolves to the user's default browser app instead.*
>
> *Apps can get this approval by doing one of the following:*
> - *Verify the domain using Android App Links. […] In your app's intent filters, check that you include the `BROWSABLE` category and support the `https` scheme.*
> - *Request the user to associate your app with the domain in system settings."*
>
> https://developer.android.com/about/versions/12/behavior-changes-all

> ** Source Note **: The URL `https://developer.android.com/about/versions/12/web-intent-resolution` * *exists but redirects** (HTTP 200 after redirection) to `https://developer.android.com/training/app-links/verify-applinks`, which does not contain that text. The quote was taken from `behavior-changes-all`, which does contain it.

**INFERENCE (high confidence)**: Before Android 12, an app could declare an intent filter for `https` with a wildcard host and appear in the “Open with” dialog for any URL. Android 12 removed that path: without domain approval, the intent goes straight to the default browser. Google has already shut down exactly this technique once. It is the report’s **most relevant precedent for progressive restriction**.

#### 2.1.2 The two ways of approval by domain, and why neither works

**DONE** [PRIMARY]. Automatic verification (`autoVerify`): *"For each unique hostname found in the intent filters, Android queries the corresponding websites for the Digital Asset Links file at `https://hostname/.well-known/assetlinks.json`."* — https://developer.android.com/training/app-links/verify-android-applinks

→ This requires **control of the destination domain’s server**. QRSafe does not control `restaurante-x.com.ar` or `cordoba.gob.ar`. **Ruled out.**

**FACT** [PRIMARY]. Manual association by the user: the app launches `Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS`; the user sees the **Open by default** screen, enables **Open supported links**, and selects domains under **Links to open in this app**; *"They can also select **Add link** to add domains."* The documentation notes: *"On a given device, only one app at a time can be associated with a particular domain."* Same source.

→ This requires the user to add **each domain manually**. For a product whose value lies in intercepting domains *unknown in advance*, it is unusable. **Ruled out.**

States available at runtime through `DomainVerificationManager`: `DOMAIN_STATE_VERIFIED`, `DOMAIN_STATE_SELECTED`, `DOMAIN_STATE_NONE`. [PRIMARY, same source]

#### 2.1.3 The route that does work: the browser role

**FACT** [PRIMARY]. Literal definition of the role in the `RoleManagerCompat` reference (identical to that of `android.app.role.RoleManager`):

> *"**ROLE_BROWSER** — The name of the browser role. To qualify for this role, an application needs to handle the intent to browse the Internet:*
> ```xml
> <activity>
>   <intent-filter>
>     <action android:name="android.intent.action.VIEW" />
>     <category android:name="android.intent.category.BROWSABLE" />
>     <category android:name="android.intent.category.DEFAULT" />
>     <data android:scheme="http" />
>   </intent-filter>
> </activity>
> ```
> *The application will be able to handle that intent by default."*
>
> https://developer.android.com/reference/androidx/core/role/RoleManagerCompat

**FACT** [PRIMARY]. `RoleManager.createRequestRoleIntent(String roleName)`, available from **API level 29** (Android 10): *"Returns an Intent suitable for passing to `Activity.startActivityForResult(Intent,int)` which prompts the user to grant a role to this application."* — https://developer.android.com/reference/android/app/role/RoleManager

**Android conclusion (FACT + INFERENCE)**: an app that declares the generic browser intent filter and obtains `ROLE_BROWSER` receives **every** http/https URL that the system could not route to a domain-verified app, precisely the fallback described in the Android 12 quotation (*"the web intent resolves to the user's default browser app instead"*). QRSafe can then display its verification screen and, depending on the result, load the destination in a `WebView`/Custom Tab or stop it.

The cost is explicit: **QRSafe would have to be a browser**, with the corresponding maintenance surface, and the user must **change their default browser**.

#### 2.1.4 Package visibility (Android 11)

**FACT** [PRIMARY]. *"When an app targets Android 11 (API level 30) or higher and queries for information about the other apps that are installed on a device, the system filters this information by default."* This affects `queryIntentActivities()`, `getPackageInfo()`, and `getInstalledApplications()`. Visibility can be restored by declaring `<queries>` in the manifest. https://developer.android.com/training/package-visibility

→ Relevant if QRSafe wants to enumerate installed wallets to offer “continue in Mercado Pago / MODO”: it must declare the packages or intent in `<queries>`. This is an administrative requirement, not a blocker. **Second precedent for progressive restriction** by Google.

#### 2.1.5 Does the native scanner respect the app chooser, or does it go straight to Chrome?

**Declared gap.** No official Google documentation was found that explicitly states how the system camera / Google Lens QR scanner resolves the destination. Searches were run on `support.google.com/camerafromgoogle`, `developer.android.com`, and `support.google.com/chrome`, restricted to Google domains.

The official help documentation says only the following [PRIMARY — https://support.google.com/camerafromgoogle/answer/12033278]:

> *"To open a browser page, app, or payments app after a QR code is scanned, click the banner that appears."*

**INFERENCE (medium-high confidence)**: the fact that the banner can open *"a browser page, app, or payments app"* indicates that the destination is resolved through the standard intent system and is therefore subject to App Links and the default browser. **Google does not state this in any text that could be verified, so it must not be presented as fact.** This is the second mandatory empirical test (§7).

#### 2.1.6 Android summary

| Dimension | Assessment |
|---|---|
| **Technical feasibility** | **Partial: yes, only through `ROLE_BROWSER`.** Registering for “any URL” as a non-browser app: **No** since Android 12 [PRIMARY]. As the default browser: **Yes** [PRIMARY, `ROLE_BROWSER` + `createRequestRoleIntent` API 29+]. |
| **Coverage** | 87.46% of Argentina’s mobile device base is Android [SECONDARY, StatCounter Jul-2026]. However, it covers only **Flow B**: zero coverage for EMVCo payment QR codes. |
| **Friction** | High. Install the app **and** change the default browser in a system dialog. A default browser is chosen once during the phone’s lifetime; requesting that change for a security feature is a greater barrier than the “extra step” already identified as the main risk (§4.3 of the main report). |
| **Third-party dependency** | Google. The role exists by Android’s decision; camera-scanner behavior depends on Google Lens / the OEM. |
| **Breakage risk** | **High, with two documented precedents**: Android 11 restricted package visibility; Android 12 closed generic web-intent resolution. Google narrowed this surface in two consecutive versions. Whether `ROLE_BROWSER` remains open to non-browser apps is a **HYPOTHESIS** about the future, not a guarantee. |

---

### 2.2 iOS

**This is the point at which the report must be unequivocal.**

#### 2.2.1 Universal Links: claiming third-party domains is impossible

**FACT** [PRIMARY]. Apple, on the association mechanism:

> *"When someone installs your app, the system checks a file stored on your web server to verify that your website allows your app to open URLs on its behalf. **Only you can store this file on your server, securing the association of your website and your app.**"*
>
> https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content

**FACT** [PRIMARY]. Operational requirements for the file: it is served at `https://<fully qualified domain>/.well-known/apple-app-site-association`; *"You must host the file using `https://` with a valid certificate and with no redirects"*; and since iOS 14, the request is made by an Apple CDN rather than the device. https://developer.apple.com/documentation/xcode/supporting-associated-domains

→ **By design, Universal Links are a *domain-owner opt-in* mechanism.** A third-party app cannot claim `restaurante-x.com.ar`. **Closed.**

#### 2.2.2 Custom URL schemes: they do not capture http/https

**INFERENCE (high confidence)**: declared as an inference because **no Apple sentence was found that explicitly prohibits it**. The indirect primary evidence is strong: among the requirements to be a default browser, Apple lists *"Your app must specify the HTTP and HTTPS schemes in its `Info.plist` file"* **alongside** the managed-entitlement requirement. If declaring the schemes alone were sufficient, the entitlement would be redundant. The `CFBundleURLTypes` documentation and the guide to defining custom schemes were searched without finding an explicit prohibition.

#### 2.2.3 SFSafariViewController: not an interception layer

**FACT** [PRIMARY]. *"Interactions with the web interface aren't visible to your app, and you can't access AutoFill data, browsing history, or website data."* — https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller

→ It serves as a **rendering surface after** an app’s own verification, not as an inspection point. Apple also **explicitly prohibits** it in apps with the browser entitlement (§2.2.4).

#### 2.2.4 The only real route: become the default browser (iOS 14+) with a managed entitlement

**FACT** [PRIMARY]. Literal text from *Preparing your app to be the default web browser*:

> *"In iOS 14 and later, users can select an app to be their default web browser. […] **The system invokes the default web browser in iOS whenever the user opens an HTTP or HTTPS link.** Because this app becomes the user's primary gateway to the internet, Apple requires that web browsing apps meet specific functional criteria to protect user privacy and ensure proper access to internet resources.*
>
> *Apps express their capability to be a default web browser by using the `com.apple.developer.web-browser` managed entitlement. Request the default browser entitlement by filling out the [form]."*
>
> https://developer.apple.com/documentation/xcode/preparing-your-app-to-be-the-default-browser

**FACT** [PRIMARY]. Admission criteria, verbatim from the same page:

> *"Apps that register as a default web browser option must satisfy the following criteria:*
> - *Your app must specify the HTTP and HTTPS schemes in its `Info.plist` file.*
> - *Your app can't use [SFSafariViewController].*
> - *On launch, the app must provide a text field for entering a URL, search tools for finding relevant links on the internet, or curated lists of bookmarks.*
> - *When opening an HTTP or HTTPS URL in its default configuration:*
>   - ***The app must navigate directly to the specified destination and render the expected web content. Apps that redirect to unexpected locations or render content not specified in the destination's source code don't meet the requirements of a default web browser.***
>   - *Apps designed to operate in a parental controls or locked down mode may restrict navigation to comply with those goals.*
>   - ***Your app may present a "Safe Browsing" or other warning for content suspected of phishing or other problems.***
>   - *Your app may offer a native authentication UI for a site that also offers a native web sign-in flow."*

**And a cross-restriction, also verbatim**:

> *"Apps that have the [`com.apple.developer.web-browser`] managed entitlement **may not claim to respond to Universal Links for specific domains. The system will ignore any such claims.** Apps with the entitlement can still open Universal Links to other apps as usual."*

**FACT** [PRIMARY]. How the user changes it: *Settings > Apps > Default Apps > Browser App*. The unified Default Apps screen requires **iOS 18.2 or later**. https://support.apple.com/en-us/121430

#### 2.2.5 Does the Camera app open a third-party app or Safari?

**FACT** [PRIMARY]. The official guide confirms that the destination can be an app: *"You can use Camera or Control Center to scan Quick Response (QR) codes for **websites, apps**, coupons, tickets, and more."* — https://support.apple.com/guide/iphone/scan-a-qr-code-iphe8bda8762/ios

**Declared gap.** Neither that guide nor the developer documentation states **which browser** Camera opens when the QR code is a URL. Searches were conducted on `support.apple.com/guide/iphone`, the `SafariServices` documentation, and the developer site.

**INFERENCE (high confidence)**: combining two primary facts: (a) Camera offers to open the link, and (b) *"The system invokes the default web browser in iOS whenever the user opens an HTTP or HTTPS link"*: the scanned link should go to the default browser. **Apple does not state this on any page that could be verified.** Third mandatory empirical test (§7).

**Exact condition under which Camera opens a third-party app (FACT, by combining primary sources)**: when the scanned URL is covered by a Universal Link whose `apple-app-site-association` is published **on that URL’s domain** and the corresponding app is installed. In other words, **only the domain owner can trigger that handoff.** No other condition is documented.

#### 2.2.6 iOS verdict, without ambiguity

> **Intercepting a URL scanned by the Camera app from a third-party app that is not a browser is NOT POSSIBLE on iOS.** There is no public API that permits it. Universal Links require control of the destination domain [PRIMARY]; custom schemes do not capture http/https; `SFSafariViewController` cannot see what occurs inside [PRIMARY].
>
> **The only possible architecture on iOS is for QRSafe to BE a full web browser**, obtain the managed entitlement `com.apple.developer.web-browser`, and have the user choose it as their default browser in *Settings > Apps > Default Apps*.
>
> **That route is not closed to an anti-fraud product**: Apple explicitly contemplates that a default browser *"may present a 'Safe Browsing' or other warning for content suspected of phishing or other problems"* [PRIMARY]. A verification interstitial falls, literally, within what is permitted. What is **not** allowed is redirecting to unexpected destinations or rendering content not in the destination’s source code.

#### 2.2.7 iOS summary

| Dimension | Assessment |
|---|---|
| **Technical feasibility** | **No** as a normal app. **Partial (Yes, conditional)** as a browser with a managed entitlement approved by Apple, and only for Flow B. |
| **Coverage** | 12.51% of Argentina’s mobile device base [SECONDARY, StatCounter Jul-2026]. Zero coverage for EMVCo payment QR codes. |
| **Friction** | **The highest of the three options.** Install an app that must also be a usable browser (URL field, search, or bookmarks on launch, per Apple’s requirement), then change the default browser. |
| **Third-party dependency** | **Apple, explicitly and at its discretion.** The entitlement is *managed*: Apple either grants it or does not. There is no technical right of appeal. It also requires manual provisioning profiles. |
| **Breakage risk** | **High and different in nature from Android**: on Android, the risk is that an API closes; on iOS, the risk is that Apple **does not grant the entitlement in the first place**. Documented restriction precedent: *"Apps that have the managed entitlement may not claim to respond to Universal Links for specific domains. The system will ignore any such claims."* |

---

## 3. Option 2 — Browser layer

### 3.1 Extensions

#### 3.1.1 Actual status by browser

| Browser | Extensions? | Evidence | Label |
|---|---|---|---|
| **Chrome Android** | **No** | Chromium’s only work on Android extensions is the issue *"Support extensions on experimental desktop android builds"* (356905053), with mobile explicitly out of scope. https://issues.chromium.org/issues/356905053 | [PRIMARY — official Chromium issue tracker] |
| **Firefox Android** | **Yes** | Mozilla documents extension development and distribution for Firefox for Android and **recommends Manifest V2** because of unresolved MV3 issues (no background service worker). https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/ | [PRIMARY] |
| **Safari iOS** | **Yes, since iOS 15** | *"Safari web extensions are available in macOS with Safari 14 and later, visionOS 1 and later, and **iOS 15 and later**."* https://developer.apple.com/documentation/safariservices/safari-web-extensions | [PRIMARY] |
| **Samsung Internet** | **Not verified** | Not investigated. It supports *content blockers*, not the full WebExtensions API: **not confirmed with a primary source**, declared as a gap. | — |

> **Declared gap**: no `developer.chrome.com` or `support.google.com` page was found that explicitly states “Chrome for Android does not support extensions.” Searches were restricted to `developer.chrome.com`, `chromium.org`, `blog.chromium.org`, and `support.google.com`. The available evidence is the cited Chromium issue and Android’s total absence from extension documentation. The claim is supported, but the source is a bug tracker, not product documentation.

#### 3.1.2 What an extension can actually do: MV3 vs. blocking webRequest

**FACT** [PRIMARY]. Chrome, on `declarativeNetRequest`: the API can **block**, **redirect**, **upgrade the scheme** (http→https), **allow**, and **modify headers**, and does so *"without intercepting them and viewing their content, thus providing more privacy."* Documented limits: up to 30,000 dynamic rules, 5,000 session rules, at most 50 enabled static rulesets, and 1,000 regex rules per type. https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

**FACT** [PRIMARY]. Chrome, on migration: MV3 replaces *"intercepting network requests and altering them at runtime with `chrome.webRequest`"* with declarative rules. https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests

**FACT** [PRIMARY]. Firefox retains the blocking model: `webRequest.onBeforeRequest` with `"blocking"` in `extraInfoSpec` can return a `BlockingResponse` with `cancel: true` or `redirectUrl`, subject to the `webRequestBlocking` permission. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest

**FACT** [PRIMARY]. **Safari does not support request blocking.** Apple lists this under API incompatibilities:

> *"`BlockingResponse` not supported. Blocking requests not supported. `opt_extraInfoSpec` not supported for any of the events."*
>
> https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility

**FACT** [PRIMARY]. Safari does support `declarativeNetRequest` from Safari 15 (*"adds support for the Declarative Net Request WebExtensions API to block content on the web"*, https://webkit.org/blog/11989/new-webkit-features-in-safari-15/), with dynamic and session rules from Safari 15.4, and Manifest V2 and V3 from Safari 15.4.

**FACT** [PRIMARY]. Safari iOS permission model: the user must grant access site by site. *"When the user visits a page where they haven't granted access to your Safari web extension, Safari shows a badge next to your extension's item that indicates the user needs to interact with the extension to grant it permission. […] In iOS, the user selects the extension's entry in the More menu, and selects a permission option."* The per-site options are **Ask / Allow / Deny**. https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions

#### 3.1.3 Can a navigation be stopped before it occurs?

**Yes, but the answer varies by browser, and no variant is convenient for identity binding:**

- **Firefox (MV2, blocking `webRequest`)**: yes, with a possible asynchronous query. It is the only option that would permit “stop the request, ask the QRSafe backend, and only then decide.” Argentina mobile market share: **0.2%**.
- **Safari / Chrome MV3 (`declarativeNetRequest`)**: yes, but **the decision must be preloaded in local rules**. There is no synchronous server callout per request. **INFERENCE**: for identity binding, which requires resolving “does this QR belong to this merchant?” against a remote registry, the practical route would be a **redirect rule** that diverts payment-domain patterns to an owned interstitial, which would make the query. It works conceptually, but breaks legitimate navigation to the same domain and requires host permission for payment domains, precisely the most costly permission to ask a user for.
- **Chrome Android**: not applicable; there are no extensions.

#### 3.1.4 Extension summary

| Dimension | Assessment |
|---|---|
| **Technical feasibility** | **Partial.** Safari iOS 15+: yes, declarative only, without request blocking [PRIMARY]. Firefox Android: yes, full capability [PRIMARY]. Chrome Android: **no**. |
| **Coverage** | **~9.04% confirmed** of Argentina’s mobile browser market (Safari 8.84% + Firefox 0.20%). Chrome, at 86.31%, is structurally excluded. **The upper bound remains open**: Samsung Internet (3.91%) was not verified (§3.1.1), and if it supported WebExtensions the total would rise to ~13%. [SECONDARY, StatCounter Jul-2026]. Zero Flow A coverage. |
| **Friction** | High on iOS: install the container app from the App Store, enable the extension in Safari Settings, and grant permission **per site** (Ask/Allow/Deny), precisely the worst model for a product that must act on domains the user has never visited. |
| **Third-party dependency** | Apple (App Store review + WebKit), Mozilla (AMO). Google is not involved because it has no product to support. |
| **Breakage risk** | **Medium-high and already materialized.** The transition to MV3 already eliminated blocking `webRequest` in Chrome; Safari never implemented it. The platform trend is toward less interception capability, not more. |

### 3.2 DNS

#### 3.2.1 What is possible

**FACT** [PRIMARY]. **Android**: Private DNS (DNS over TLS) has existed since Android 9. *"DNS over TLS uses the TLS protocol to establish a secure channel to the server. Once the secure channel is established, DNS queries and responses can't be read or modified by anyone else who might be monitoring the connection."* The user configures a provider hostname in *Network & internet settings*. https://android-developers.googleblog.com/2018/04/dns-over-tls-support-in-android-p.html

**FACT** [PRIMARY]. **iOS**: two routes.
- App with `NEDNSSettingsManager`: *"When your app starts up, access the shared instance of the DNS settings manager, and load existing settings from the preferences […] **In order to use your DNS settings, the user needs to enable it in the Settings app on iOS** or in System Preferences on macOS."* https://developer.apple.com/documentation/networkextension/nednssettingsmanager
- MDM profile `com.apple.dnsSettings.managed`: *"When installed from an MDM, the setting only applies to managed Wi-Fi networks. When installed manually, this setting also applies to cellular networks."* https://developer.apple.com/documentation/devicemanagement/dnssettings

#### 3.2.2 What is NOT possible, stated explicitly

**FACT (by protocol definition) + [PRIMARY] for the scope stated by Google:**

1. **DNS resolves host names. Nothing more.** It cannot see the path or query string, so it cannot distinguish `banco.com/legit` from `banco.com/phishing`.
2. **DNS does not know where navigation came from.** A DNS query originating from a scanned QR is indistinguishable from one originating from a link tap or typing in the address bar. **For a product whose premise is “the observed QR does not belong to this merchant,” DNS has access to neither term of the comparison.**
3. **In Flow A, there is no useful DNS query.** The EMVCo payment QR does not generate navigation; the only DNS resolution is performed by the wallet against its own acquirer’s domain. Blocking that blocks the wallet.
4. **The only available action is binary and coarse-grained**: allow or block an entire domain.
5. Google explicitly limits the scope: *"(The secure channel only applies to DNS, so it can't protect users from other kinds of security and privacy violations.)"* [PRIMARY]

> **DNS is not a QR-origin verification layer. It is a domain blocklist. These are different problems and should not be conflated in the product narrative.**

#### 3.2.3 DNS summary

| Dimension | Assessment |
|---|---|
| **Technical feasibility** | **No, not for the QRSafe problem.** Technically deployable (Android 9+ and iOS with a profile or NetworkExtension), but **cannot express the property the product needs to verify**. |
| **Coverage** | Irrelevant: it does not cover Flow A and can only block entire domains in Flow B. |
| **Friction** | Medium-high (manual configuration on Android) to very high (profile/MDM on iOS; with MDM, additionally, **managed Wi-Fi networks only** [PRIMARY]). |
| **Third-party dependency** | Low for infrastructure, but irrelevant given the verdict. |
| **Breakage risk** | Low. It is standard infrastructure. |

---

## 4. Option 3 — SDK in wallets

### 4.1 Why it is the only option truly inside the payment flow

From §1.1: in Flow A, the only existing gap is **inside the wallet**, between `resolve` and user confirmation. No OS or browser layer can occupy that place because the OS never sees a URL and the browser never opens. **This is not an architectural preference: it is a consequence of the QR format.**

### 4.2 What each wallet exposes today

#### Mercado Pago: a documented program exists, but it is not for QRSafe

**FACT** [PRIMARY]. A publicly documented interoperable QR **issuer flow** exists, and it is reserved for wallets: the documentation explicitly says *"Si no sos representante de una billetera digital, andá al overview de Código QR"* (English: "If you are not a representative of a digital wallet, go to the QR Code overview"). The application requirements are corporate name, **CUIT**, the **acceptor’s resolve API URI (IEP)**, and an approval questionnaire (operator used, supported QR types, refunds, production date, testing). https://www.mercadopago.com.ar/developers/es/docs/qr-code/interoperable/issuer-flow

**FACT** [PRIMARY]. The **acceptor flow** documents the `GET /resolve?data={qr_raw}` call, which returns `order_id` and payment methods. https://www.mercadopago.com.ar/developers/es/docs/qr-code/interoperable/acceptor-flow

**INFERENCE**: there is no SDK or extension point through which a third party can **inject a verification** into the wallet flow. What exists is a route for **another wallet** to interoperate. QRSafe could use that route only if it became a wallet, PSP, or transaction processor: a scope change beyond this report’s evaluation.

#### MODO: it does not issue QR codes, and its SDK is for checkout

**FACT** [PRIMARY]. MODO documents the merchant side as follows: *"El QR lo emite tu adquirente desde tu terminal. MODO es la solución que tu cliente usa para pagarlo desde su app bancaria."* (English: "Your acquirer issues the QR from your terminal. MODO is the solution your customer uses to pay it from their banking app.") This is cited and verified in [`qr-generating-competitors-argentina.md`](./qr-generating-competitors-argentina.md) §2.3.

**FACT** [PRIMARY]. MODO’s SDK v2 is an **e-commerce payment button** (frontend + backend integration), published at https://merchants.modo.com.ar/docs. No surface related to physical QR scanning or validation was found in that documentation.

> **Declared gap**: no MODO partner program focused on fraud mitigation or QR verification was found. Searches were run on `modo.com.ar`, `docs.modo.com.ar`, and `merchants.modo.com.ar`.

#### Cuenta DNI Comercios: no public integration documentation

**Declared gap.** No public API or SDK documentation, nor developer program, was found for Cuenta DNI Comercios. Searches were run on `bancoprovincia.com.ar`, `cuentadni.com.ar`, and `gba.gob.ar`. The only integration reference is the ability to collect payments with CLAVE DNI by linking through Link for proprietary systems, without a published technical specification. **INFERENCE**: the entry route would be commercial/institutional, not technical.

### 4.3 The regulatory lever: what the BCRA requires and what it does not

The full texts of the communications were downloaded and read from the official BCRA site.

**FACT** [PRIMARY] — **Comm. "A" 7463**, point 2.6.1 of the rules on *Sistema Nacional de Pagos – Transferencias* (National Payment System – Transfers), verbatim:

> *"2.6.1. Cada esquema de transferencias inmediatas deberá: […]*
> *b. **Apoyar sus análisis de fraude con herramientas que permitan identificar patrones sospechosos.** De acuerdo con el riesgo evaluado y en función de las responsabilidades identificadas, deberá contemplar acciones en coordinación con los participantes de los esquemas involucrados (por ejemplo: **alertar al cliente ordenante y/o requerirle confirmación por vías alternativas antes de cursar la transacción**)."*
>
> https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7463.pdf

> English translation: *"2.6.1. Each immediate-transfer scheme must: […] b. **Support its fraud analyses with tools that identify suspicious patterns.** In accordance with the assessed risk and based on the identified responsibilities, it must consider actions in coordination with the participants in the schemes involved (for example: **alert the ordering customer and/or require confirmation through alternative channels before processing the transaction**)."*
>
> **Plain reading**: the obligated party is the **immediate-transfer scheme**, not the individual wallet, and the obligation concerns means (“support its analyses with tools”), not results. However, the example’s wording, *alert the ordering customer before processing the transaction*, describes **exactly** the function QRSafe seeks to perform. This is the report’s strongest persuasive lever and should be used for what it is: a regulatory example that legitimizes the category, not a procurement mandate.

**FACT** [PRIMARY] — **Comm. "A" 8032**, point 1, verbatim:

> *"1. Establecer que cuando un pago con tarjeta de crédito se inicie desde una billetera digital interoperable mediante la lectura de un código QR, **la responsabilidad por fraude será asumida por la billetera**, excepto: a) cuando la billetera procese el pago con los requisitos y estándares técnicos de tokenización y autenticación de la marca de la tarjeta; b) que la transacción no pueda procesarse con los requisitos y estándares técnicos disponibilizados por la marca de la tarjeta […]; c) que exista acuerdo en contrario entre emisores, billeteras y/o adquirentes/agregadores […]. A excepción del caso previsto en el inciso b), **los adquirentes no podrán ser debitados/contracargados** por operaciones iniciadas desde billeteras digitales interoperables con lectura de códigos QR que hayan sido desconocidas o fraudulentas."*
>
> https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8032.pdf

> English translation: *"1. Establish that when a credit-card payment is initiated from an interoperable digital wallet by scanning a QR code, **liability for fraud will be assumed by the wallet**, except: a) when the wallet processes the payment using the technical requirements and standards for tokenization and authentication of the card brand; b) when the transaction cannot be processed using the technical requirements and standards made available by the card brand […]; c) when issuers, wallets, and/or acquirers/aggregators agree otherwise […]. Except in the case provided for in subsection b), **acquirers may not be debited/charged back** for unknown or fraudulent transactions initiated from interoperable digital wallets by scanning QR codes."*
>
> **Plain reading**: this is the **economic** lever, and the product’s best one. The rule places the loss on the wallet when payment is initiated **by QR scanning**. An actor that absorbs losses has a direct incentive to integrate mitigation. **Important limitation that must not be hidden**: the textual scope is **credit-card payment**, not PCT transfer. Sticker fraud involving static transfer QR codes falls outside this article; in that case, as the main report already notes (§4.3), the loss falls on the merchant and payer, not the wallet.

**FACT** [PRIMARY] — **Comm. "A" 8298** (2025-08-07): its annex addresses **CBU/CVU totals by CUIT/CUIL** administered by CEC-BV and enhanced risk analysis for customers with an unjustified number of accounts. https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8298.pdf

> **Scope correction**: this communication addresses **mule accounts**, not QR integrity. It creates no obligation that can be used as a direct lever for QRSafe. It should not be cited as though it did.

**Declared gap**: **no** BCRA rule was found that requires verification of the displayed QR’s **physical integrity or ownership**. This is consistent with the main report’s finding (§1.4). The texts of A 7463, A 8032, and A 8298 were reviewed.

### 4.4 Wallet SDK summary

| Dimension | Assessment |
|---|---|
| **Technical feasibility** | **Yes: it is the only option that technically occupies the payment decision point.** It does not depend on a Google or Apple API. |
| **Coverage** | Potentially **100% of Flow A** for each integrated wallet, equally on Android and iOS. Actual coverage today: **0%**, because there is no integration. |
| **User friction** | **Zero: its decisive advantage.** The user installs nothing, changes no default, and grants no permission. Verification appears on the screen they are already using. It resolves the structural risk that the main report identifies as the model’s principal risk (§4.3: verifier adoption). |
| **Third-party dependency** | **Total: its decisive weakness.** It depends on a commercial decision by Mercado Pago, MODO, or Banco Provincia. There is no self-service technical route. |
| **Breakage risk** | Low technically (an API contract is stable). High commercially: the integration fails if the wallet decides to build it in-house, and Mercado Pago has **maximum capacity** to do so according to the competitor map. |

---

## 5. Comparison

### 5.1 Comparison table

| | **Op. 1a — Android browser (`ROLE_BROWSER`)** | **Op. 1b — iOS browser (entitlement)** | **Op. 2a — Extensions** | **Op. 2b — DNS** | **Op. 3 — Wallet SDK** |
|---|---|---|---|---|---|
| **Technical feasibility** | **Partial (yes, as a browser)** | **Partial (yes, with Apple approval)** | **Partial (Safari/Firefox)** | **No, for this problem** | **Yes** |
| **Supporting quotation** | `ROLE_BROWSER` + `createRequestRoleIntent` API 29+ [PRIMARY] | *"The system invokes the default web browser […] whenever the user opens an HTTP or HTTPS link"* + managed entitlement [PRIMARY] | *"available in […] iOS 15 and later"* / *"Blocking requests not supported"* [PRIMARY] | *"The secure channel only applies to DNS"* [PRIMARY] | Comm. "A" 8032 pt. 1 [PRIMARY]; MP issuer flow [PRIMARY] |
| **Covers the EMVCo payment QR (Flow A)?** | **No** | **No** | **No** | **No** | **Yes** |
| **Covers the exploration QR (Flow B)?** | Yes | Yes | Yes, partially | Domain blocking only | No |
| **Argentina device-base coverage** | 87.46% (Android) | 12.51% (iOS) | 9.04% confirmed (mobile Safari + Firefox); up to ~13% if Samsung Internet qualifies | n/a | 0% today; ~100% per integrated wallet |
| **Friction** | Install + change default browser | Install full browser + change default (iOS 18.2+ for the Default Apps screen) | Install container app + enable extension + **per-site** permission | Manual configuration / MDM profile (managed Wi-Fi only through MDM) | **None** |
| **Depends on** | Google | **Apple, at its discretion** | Apple / Mozilla | No relevant party | The wallet |
| **Breakage risk** | High: two precedents (Android 11 and 12) | High: entitlement may not be granted | Medium-high: MV3 already eliminated blocking `webRequest` | Low | Low technical / high commercial |

### 5.2 Combined device-base coverage

Reference data, Argentina, July 2026 [SECONDARY — Statcounter Global Stats; this is a web-traffic measurement panel, not a census]:

| Mobile operating system | Share | | Mobile browser | Share |
|---|---|---|---|---|
| Android | **87,46%** | | Chrome | **86,31%** |
| iOS | **12,51%** | | Safari | **8,84%** |
| | | | Samsung Internet | 3,91% |
| | | | Brave | 0,38% |
| | | | Firefox | **0,20%** |
| | | | Opera | 0,16% |

Sources: https://gs.statcounter.com/os-market-share/mobile/argentina · https://gs.statcounter.com/browser-market-share/mobile/argentina

**Interpretation of these figures:**

1. **An Android-only solution excludes one in eight Argentine phones.** However, the socioeconomic skew of iOS in Argentina means that this 12.5% is not interchangeable with the 87.5% in transaction value. **HYPOTHESIS, not verified**: the average ticket and merchant profile of the iOS segment differ from Android. This was not investigated.

2. **The extension route covers a confirmed ~9%**, and its limit is structural rather than temporary: it depends on Google bringing extensions to Chrome Android, which its own tracker places out of scope for mobile. The precise ceiling remains open until Samsung Internet (3.91%) is verified; it could rise to ~13%, still a fraction of the device base and not something that should be presented as settled.

3. **The highest combined Flow B coverage** is Android browser (87.46%) + iOS browser (12.51%) ≈ **~100% of the device base**, but requires maintaining **two complete browser products** and creates **the highest friction of all options on both platforms**.

4. **Flow A coverage is a function not of the device base, but of the wallet base.** A single Mercado Pago integration would cover, in one move, more QR payment flow than any combination of Options 1 and 2, simultaneously on Android and iOS.

---

## 6. Verdict and recommended architecture

### 6.1 Position

**The original question contains a premise the evidence does not support.** QRSafe cannot “sit between the camera that scans the QR and the browser that opens the URL” in the case that matters, because **Argentine QR payments have neither a browser nor a URL**. The EMVCo payload is not a web resource; EMVCo explicitly says that a generic reader such as the system camera *"is generally not usable"* with that format. Pursuing the OS-level intermediary-layer model for payments would mean building on an interception point that does not exist.

**Recommended architecture: a verification SDK/API embedded in the wallet (Option 3), with an owned channel as a tactical bridge and no dedicated browser in the first stage.**

### 6.2 Why

1. **It is the only option that occupies the actual decision point.** The gap between `resolve` and user confirmation is the only place in Flow A where a verification can be inserted. Everything else is impossible because of the format, not because an API is missing.
2. **It is the only option with zero friction**, and friction is already identified as the model’s principal structural risk (§4.3 of the main report: 73% scan without verifying the destination; the B2C checker category is contracting precisely because of the extra step). Options 1 and 2 **worsen** that risk: changing the default browser creates more friction, not less, than opening an extra app.
3. **It is the only option independent of Google and Apple.** Options 1 and 2 have documented precedents for narrowing: Android 11 (package visibility), Android 12 (generic web-intent resolution), MV3 (elimination of blocking `webRequest`), and iOS’s discretionary entitlement grant. All move in the same direction.
4. **It has a concrete, verified regulatory lever.** Comm. "A" 8032 places fraud loss on the wallet when card payment is initiated by QR scanning. Comm. "A" 7463 names as an example of an anti-fraud tool exactly *"alertar al cliente ordenante […] antes de cursar la transacción"* (English: "alert the ordering customer […] before processing the transaction").

### 6.3 What is given up by choosing it, without sugarcoating

- **Self-service is given up.** There is no technical entry point: the product does not exist until a wallet signs. Option 1 on Android could be deployed tomorrow without anyone’s permission; Option 3 cannot.
- **Roadmap control is given up.** Time to market becomes dependent on someone else’s commercial cycle.
- **Cannibalization risk is accepted.** Mercado Pago has maximum capacity to build it in-house according to the competitor map. Integrating with the party that can replace you is a bet with an expiration date.
- **It is accepted that the A 8032 lever covers credit cards only.** For stickers on static transfer QR codes, QRSafe’s central case, the loss remains with the merchant and payer, and the wallet has no equivalent obligation. The wallet sales argument must be reputational and retention-based, not just about chargebacks.
- **Exploration QR coverage is deferred.** Menus, signage, plaques, and labels are outside a wallet SDK’s reach.

### 6.4 The combination that covers more than either alone

**It does exist, but it is two products, not one**, and conflating them is the mistake to avoid:

| Front | Architecture | Status |
|---|---|---|
| **Payment QR (Flow A)** | QRSafe-owned channel → evolves into a wallet SDK/API | Owned channel: today. SDK: medium term, dependent on adoption. |
| **Exploration QR and quishing (Flow B)** | QRSafe browser on Android with `ROLE_BROWSER` | Technically deployable today [PRIMARY]. Requires deciding whether building a browser is worthwhile. |

**Recommendation for Flow B: do not build it now.** It is a different product, with a different user, business model, and enormous maintenance surface (being a browser). It remains a documented option for when the binding registry reaches critical mass and an exploration use case emerges with an identified paying customer, for example a municipality with 600 signs in public spaces.

**On iOS, to close the ambiguity**: if the decision is ever made to pursue Flow B on iOS, the only route is a browser with a managed entitlement. One favorable fact should not be lost: Apple **explicitly contemplates** that a default browser may display *"a 'Safe Browsing' or other warning for content suspected of phishing or other problems."* QRSafe’s interstitial literally fits within that exception. What does **not** fit is redirecting to unexpected destinations. This is a product-design distinction, not a permissions distinction, and it must be respected from the first mockup.

---

## 7. What must be tested to confirm it

Ordered by impact on the verdict. The first three can **change it**.

| # | Test | Why it matters | How |
|---|---|---|---|
| 1 | **Scan a real Mercado Pago Official QR Kit with the iOS Camera app and Google Lens.** Does it display plain text, a URL, or an app banner? | If the kit encodes a proprietary URL rather than a pure EMVCo payload, **part of Flow A moves to Flow B** and Options 1 and 2 regain relevance for payments. This is the declared gap in §1.1. | Empirical test with a physical kit. |
| 2 | **Verify whether Android’s native QR scanner respects the default browser** or goes straight to Chrome. | Option 1a **depends entirely** on this and is currently an INFERENCE without documentary support (§2.1.5). | Test app with `ROLE_BROWSER`; scan a URL using the system camera on Pixel + Samsung. |
| 3 | **Verify whether the iOS Camera app opens the URL in the default browser** when it is not Safari. | Same importance for Option 1b (§2.2.5). | iPhone with iOS 18.2+, Default Apps → third-party browser, scan a URL. |
| 4 | **Ask Apple** (`default-browser-requests@apple.com`, official form) whether an anti-fraud-focused browser qualifies for the managed entitlement. | Determines whether Option 1b exists or is theoretical. | Formal inquiry before investing in development. |
| 5 | **Android prototype with `ROLE_BROWSER`**: measure what percentage of users complete the default-browser change. | Quantifies what is currently qualitative friction. If it is <10%, Option 1a is ruled out by adoption even if technically viable. | Test with real users. |
| 6 | **Safari extension prototype with `declarativeNetRequest`** that redirects payment-domain patterns to an interstitial. | Confirms whether a declarative rule intercepts navigation originating from Camera and measures the cost of per-site permission. | Xcode + iOS 15+ device. |
| 7 | **Formally request Mercado Pago’s issuer flow** and ask whether it admits an integrator that is not a wallet. | Determines whether Option 3 has an entry point or whether a commercial relationship must be built from scratch. | Documented issuer-flow form. |
| 8 | **Ask BCRA/CIMPRA**: does a QR-to-merchant binding verifier qualify as a “tool that identifies suspicious patterns” under point 2.6.1.b? | Converts the persuasive lever into a regulatory argument usable in commercial material. | Formal inquiry. |
| 9 | **Contact Banco Provincia** regarding Cuenta DNI Comercios. | The §4.2 gap can only be closed institutionally. | Commercial channel. |
| 10 | **Verify Samsung Internet extension support** (3.91% of Argentina’s device base). | Declared gap in §3.1.1; it could add ~4 points to Option 2. | Samsung Developers documentation. |

---

## Research limitations

- **No tests were run on real devices.** The entire report is documentary analysis. The three questions with the greatest impact on the verdict (§7.1–3) can only be resolved empirically.
- **Central declared gap**: primary documentation could not confirm what the Mercado Pago Official QR Kit sticker encodes. The URL `https://www.mercadopago.com.ar/developers/es/docs/qr-code/integration-configuration/qr-static/landing` returned **HTTP 404**.
- **No official Google or Apple documentation was found** that explicitly states which browser the system QR scanner opens. Both claims in the report are marked as INFERENCE and must not be cited as facts.
- **No `developer.chrome.com` page was found that states** Chrome for Android does not support extensions. The evidence used is Chromium tracker issue 356905053: a Google source, but a bug tracker rather than product documentation.
- **URL note**: `https://developer.android.com/about/versions/12/web-intent-resolution` **exists but redirects** to `/training/app-links/verify-applinks`, which does not contain the web-intent-resolution text. The quotation came from `/about/versions/12/behavior-changes-all`.
- **URL note**: `https://developer.apple.com/documentation/xcode/preparing-your-app-to-be-the-default-browser-or-email-client` returned **HTTP 404**. The current page is `/documentation/xcode/preparing-your-app-to-be-the-default-browser`.
- The `developer.android.com` and `developer.apple.com` reference pages render through JavaScript and cannot be read with a simple fetch. Quotations from `RoleManagerCompat`, `RoleManager`, `SFSafariViewController`, `NEDNSSettingsManager`, `DNSSettings`, and the Safari Web Extensions pages were extracted through direct HTTP from the served HTML and Apple documentation’s public JSON endpoint (`developer.apple.com/tutorials/data/documentation/…`). They are official texts, but obtained through a non-browsable route.
- **Google Play policy was not reviewed** for apps requesting `ROLE_BROWSER`, nor were Apple App Review policies reviewed beyond the entitlement page. Both could impose additional restrictions not considered here.
- **Samsung Internet was not researched** (3.91% of Argentina’s mobile device base), nor was any Chinese OEM browser.
- **Market-share data are from Statcounter**, a web-traffic measurement panel. It is not a device census and overrepresents browser use relative to app use. The data are used as an order of magnitude, not an exact figure.
- **The full text of Comm. "A" 8114 was not reviewed** (consolidated text of *Sistema Nacional de Pagos – Servicios de pago* [National Payment System – Payment Services], 27,613 characters), nor were CIMPRA bulletins. It could contain relevant obligations not detected here.
- **The characterization of Flow A relies on Mercado Pago and EMVCo.** The behavior of QR codes generated by other Argentine acquirers (Payway, Getnet, Clover, Nave, Fiserv), whose format could differ, was not verified.
- The report **does not assess costs, development effort, or implementation time** for any option. The §6 recommendation concerns feasibility and platform risk, not business viability.
