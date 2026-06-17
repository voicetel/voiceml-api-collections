# VoiceML API Collections

Official **Postman** and **Bruno** collections for the [VoiceML REST API](https://voicetel.com/docs/api/v0.7/voiceml/) — Twilio-compatible voice, SMS, and AMD, every endpoint pre-wired with HTTP Basic Auth.

![Version](https://img.shields.io/badge/version-0.7.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Postman](https://img.shields.io/badge/Postman-Collection_v2.1-orange)
![Bruno](https://img.shields.io/badge/Bruno-supported-purple)

## Table of Contents

- [What's in the box](#whats-in-the-box)
- [Importing to Postman](#importing-to-postman)
- [Importing to Bruno](#importing-to-bruno)
- [Authentication](#authentication)
- [Variables](#variables)
- [Validation script](#validation-script)
- [API Documentation](#api-documentation)
- [License](#license)

## What's in the box

| File / directory | Purpose |
|------------------|---------|
| `voiceml-api.postman_collection.json` | Single-file Postman Collection v2.1 (drag-and-drop import). |
| `voiceml-api.postman_environment.json` | Companion Postman environment with `baseUrl`, `accountSid`, `apiKey`. |
| `bruno/` | One `.bru` file per request, organized into 8 resource folders. Git-friendly plain text. |
| `bruno/bruno.json` | Bruno project file. |
| `bruno/environments/production.bru` | Production environment (`https://voiceml.voicetel.com`). |
| `spec/callbroadcast.yml` | Pinned copy of the OpenAPI 3.1 source spec, for reproducible builds. |
| `spec/callbroadcast.json` | JSON rendering of the same spec (used by build/validate scripts). |
| `scripts/build.mjs` | Regenerates both collections from the spec. |
| `scripts/validate.mjs` | Asserts every `operationId` in the spec is represented in both collections. |

All **126 operations** across **9 resource families** are covered:

| Family | Endpoints | Highlights |
|--------|-----------|------------|
| **Calls** | 30 | Originate, update, terminate, recordings, streams, SIPREC, transcriptions, events, notifications, `<Pay>` sessions. |
| **Conferences** | 12 | List, fetch, update, participants, conference recordings. |
| **Messages** | 5 | Send SMS, list, fetch, redact / cancel, delete. |
| **Queues** | 10 | Queue CRUD, peek/dequeue members. |
| **Applications** | 5 | TwiML Application CRUD. |
| **Recordings** | 4 | Account-scoped catalog, WAV download. |
| **IncomingPhoneNumbers** | 11 | Tenant self-serve DID management (Local / Mobile / TollFree variants). |
| **SIP** | 45 | SIP Trunking: Domains, CredentialLists, IpAccessControlLists, Domain Auth Mappings (calls + registrations). |
| **Diagnostics** | 4 | Health probe, OpenAPI self-publish (no auth). |

## Importing to Postman

1. Open Postman.
2. Click **Import** (top-left).
3. Drop in **both** files from this repo:
   - `voiceml-api.postman_collection.json`
   - `voiceml-api.postman_environment.json`
4. In the top-right environment dropdown, select **VoiceML · Production**.
5. Open the environment (click the eye icon), and set:
   - `accountSid` — your AccountSid (`AC` + 32 hex characters).
   - `apiKey` — your per-account API key.
6. Send any authenticated request. The collection uses **HTTP Basic Auth** with username = `{{accountSid}}` and password = `{{apiKey}}`.

## Importing to Bruno

1. Install Bruno from [usebruno.com](https://www.usebruno.com).
2. Click **Open Collection**.
3. Select the `bruno/` directory inside this repo.
4. In the bottom-left, choose the **production** environment, then click the gear icon to fill in:
   - `accountSid` — your AccountSid.
   - `apiKey` — your API key (stored as a secret).
5. Send any authenticated request. Collection-level Basic Auth is inherited automatically.

## Authentication

VoiceML uses **HTTP Basic Auth** (Twilio-compatible):

| Field | Value |
|-------|-------|
| Username | Your AccountSid (`AC` + 32 hex chars) |
| Password | Your per-account API key |

The username **must** match the `:AccountSid` path parameter on account-scoped routes (e.g. `/2010-04-01/Accounts/{AccountSid}/Calls.json`).

Both collections wire Basic Auth at the collection root — every request inherits `username={{accountSid}}` and `password={{apiKey}}`. Diagnostic endpoints (`/health`, `/openapi.*`) override auth to **none**.

## Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `baseUrl` | `https://voiceml.voicetel.com` | Override only if you've been issued a private endpoint. |
| `accountSid` | _(empty)_ | Your AccountSid (`AC` + 32 hex). Used as Basic Auth username and path parameter. |
| `apiKey` | _(empty)_ | Treat as a secret. Used as Basic Auth password. |

## Validation script

```bash
# Verify both collections still match the OpenAPI spec.
node scripts/validate.mjs
```

The validation script reads every `operationId` out of `spec/callbroadcast.json`, then walks the Postman JSON and every `.bru` file under `bruno/`. It exits non-zero (and prints what's missing) if any operation isn't represented.

Run by CI on every push and PR — see `.github/workflows/ci.yml`.

To regenerate everything from the pinned spec:

```bash
node scripts/build.mjs
```

## API Documentation

- **Reference docs:** [voicetel.com/docs/api/v0.7/voiceml/](https://voicetel.com/docs/api/v0.7/voiceml/)
- **TwiML validator:** [voicetel.com/voiceml/validator/](https://voicetel.com/voiceml/validator/)
- **SDK catalogue:** [voicetel.com/docs/voiceml-sdks/](https://voicetel.com/docs/voiceml-sdks/)
- **Source OpenAPI spec:** [`spec/callbroadcast.yml`](spec/callbroadcast.yml)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
