# Bible Bedtime Español iOS privacy review — 30 August 2026

## Scope and evidence

This is a factual privacy-consistency and adversarial wording review, not legal
advice. It covers the public page at
`/privacy/bible-bedtime-espanol-ios/` and Release build 7 of bundle
`uk.biblebedtime.espanol`.

Evidence inspected:

- packaged build-7 `Info.plist` and strict release report;
- `AppConfig.swift` and `ConversionTelemetry.swift`;
- `PrivacyInfo.xcprivacy`;
- StoreKit purchase/entitlement code;
- local notification scheduling code;
- offline audio, preferences and playback-state code;
- catalogue/scripture/media network policy;
- the existing social/OAuth privacy policy and support route.

## Adversarial findings

1. **Telemetry:** the source contains a first-party telemetry client, but the
   Release package contains no `BBTelemetryEndpointURL`; `AppConfig` therefore
   returns `nil` and event recording performs no request. The page states this
   narrowly and does not claim the code does not exist.
2. **Analytics and crash reporting:** no third-party analytics, advertising,
   tracking or crash-reporting SDK was found in source or package evidence. The
   privacy manifest declares no tracking and no collected data types.
3. **CDN requests:** the app makes HTTPS requests to the isolated Spanish
   content host. Ordinary hosting/network providers may process IP address,
   request time, requested resource and basic connection metadata. The page
   discloses that processing and avoids promising that infrastructure never
   handles technical data.
4. **StoreKit:** Apple processes payment and account data. The app receives
   product/transaction/entitlement state, not full card or bank details. The
   page links to Apple's privacy policy.
5. **Notifications:** reminders are local notifications scheduled only after
   permission. No remote push token or proprietary push service was found.
6. **Local data:** preferences, playback state, saved content and downloaded
   audio remain on device. The deletion remedy—delete downloads or uninstall
   the app—is consistent with the implementation; there is no app account to
   delete.
7. **Children:** the app does not request names, ages, birth dates, location or
   contact details. The wording does not claim legal designation as a children's
   service and directs families to Apple controls.
8. **Scope and contact:** the page names the Spanish app, bundle ID, controller,
   effective date and support route. The support route is the existing public
   contact channel; no unverified email address was invented.
9. **Legacy policy:** the social/OAuth policy remains intact. It now links to
   the app-specific policy so build 7's existing `/privacy/` in-app destination
   still provides a path to the applicable Spanish policy.

## Verdict

**PASS for factual consistency with Release build 7**, subject to these explicit
limitations:

- this is not external legal advice;
- the public wording must be updated before enabling telemetry, analytics,
  remote push, accounts, advertising or a materially different logging setup;
- App Store Connect may use `Data Not Collected` only while the verified Release
  configuration remains unchanged and Signpost Digital Ltd does not use CDN
  technical data for user-level analytics, profiling or tracking;
- Apple and infrastructure providers process data under their own operational
  and legal obligations, which the page does not attempt to override.

Automated evidence: static contract, internal-link, mobile overflow and axe
accessibility checks pass for the new route in the 76-test site suite.
