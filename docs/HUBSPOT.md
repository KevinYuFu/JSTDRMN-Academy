# HubSpot and the Academy

JSTDRMN’s public site already lives on HubSpot CMS. Bootcamp applications should stay there. This app is the student portal: videos, slides, and who is allowed in. HubSpot does not need to host the lessons.

Yu doesn’t have to pick a HubSpot plan to run the prototype. Until `HUBSPOT_PRIVATE_APP_TOKEN` is set, signup sync and the cohort webhook do nothing. The teacher screen can still grant a seat by email.

## What “accepted” has to mean

A form submission means someone applied. It does not mean they paid or that they were offered a seat. Don’t unlock a cohort from the form alone.

The useful signal is later: a deal moves to a won/accepted stage, or a contact property such as `academy_cohort` is set to `cohort-6` after payment clears. That property is one you create in HubSpot. It is not built in.

## Three ways to connect

### (a) Links back and forth

The Academy page on jstdrmn.com links to this app’s signup. “Get Info” on a bootcamp links back to the existing HubSpot page or form. After Yu accepts someone, Yu types their email on **Grant or revoke** and picks the cohort.

Nothing to break, no token, no extra HubSpot subscription. The miss is human: a student pays, and the portal stays locked until someone remembers.

This is already how the prototype behaves with no token.

### (b) A Private App token, and we call HubSpot

In HubSpot: Settings → Integrations → Private Apps → create a private app (the current docs also call the older ones “legacy private apps”; a single-account token is still the right tool here). Copy the access token into `HUBSPOT_PRIVATE_APP_TOKEN`.

Calls use `Authorization: Bearer <token>`.

Useful endpoints, all on `https://api.hubapi.com`:

| Job | Call | Scope |
| --- | --- | --- |
| Create a contact | `POST /crm/v3/objects/contacts` | `crm.objects.contacts.write` |
| Update that contact later | `PATCH /crm/v3/objects/contacts/{email}?idProperty=email` | same write scope |
| Find a contact | `POST /crm/v3/objects/contacts/search` | `crm.objects.contacts.read` |
| Read a deal | `GET /crm/v3/objects/deals/{id}?properties=dealstage,academy_cohort` | `crm.objects.deals.read` |
| See which contact is on the deal | `GET /crm/v4/objects/deals/{id}/associations/contacts` | deals read |
| List deal stages | `GET /crm/v3/pipelines/deals` | deals read, or the pipelines scope if HubSpot asks |
| Read applications | `GET /form-integrations/v1/submissions/forms/{formGuid}` | `forms` |

HubSpot also publishes dated paths such as `/crm/objects/2026-09/contacts`. The `/crm/v3/objects/...` paths above are the ones this app calls. A 409 on create means the email already exists; the stub then patches that contact.

Form submissions come back newest first (`limit` up to 50, then `after`). They include the fields and the page URL. They do **not** include the HubSpot contact id, so you match on email. They also don’t tell you the person was accepted.

A practical (b) loop for bootcamps:

1. On signup or purchase, create or update the contact (this app does that when the token is set).
2. In HubSpot, a workflow you already have — or a person — sets `academy_cohort` on the contact or the deal when payment clears. Setting a property does not require the webhook add-on.
3. Either Yu hits a future “sync now” button, or a private-app webhook tells us the deal stage changed and we read the deal. Private-app webhooks are configured in the private app’s Webhooks tab (target URL must be HTTPS). A `deal.propertyChange` subscription needs `crm.objects.deals.read`. The payload is a batch of events with an object id, not the email, so the app has to look the deal up. That lookup runs only when `HUBSPOT_LIVE=true`.

Create these contact properties before turning live mode on, or the first call that sends them will 400 and this app retries with only email, first name, and last name:

- `academy_signed_up`
- `academy_last_purchase`
- `academy_cohort` (the cohort slug, e.g. `cohort-6`)

Same `academy_cohort` property on deals if you track a deal per applicant.

### (c) A HubSpot workflow calls us

In a contact or deal workflow: when the stage becomes accepted, add the **Send a webhook** action. It POSTs to `https://<this app>/api/hubspot/webhook`. The URL has to be HTTPS. Put the email and `cohortSlug` (or contact property `academy_cohort`) in the body if the action lets you customize it. If it sends the enrolled record instead, this app also understands:

```json
{ "properties": { "email": { "value": "fan@example.com" }, "academy_cohort": { "value": "cohort-6" } } }
```

and the same shape with plain strings.

HubSpot’s own docs put this action on **Operations Hub Professional** (and the same tier for bots). A CMS site does not include it. Since April 2021 it has not been part of a generic Enterprise bundle either, except for accounts that already had it. Confirm the subscription before choosing this.

Workflow requests can be signed. If you set `HUBSPOT_CLIENT_SECRET` to the app’s client secret, this app checks `X-HubSpot-Signature-v3`: HMAC-SHA256 of `method + full URL + raw body + timestamp`, base64, and it rejects timestamps older than five minutes. The URL HubSpot signed has to match the URL we verify, including `https`.

A private-app `deal.propertyChange` subscription is a different product from the workflow action. It does not need Operations Hub. It does need a public HTTPS endpoint and a follow-up API read, which is why it sits with (b) in this note.

## Recommendation

Use **(b)**.

Keep applications on the HubSpot pages you already have. Keep the manual grant screen for exceptions and for the cohorts you load by hand. Add one private app so a new student becomes a contact, and so a won deal (or `academy_cohort`) can open the right portal without Yu retyping it.

(a) is the right backup, and it is what runs today with no token. It will get missed once more than one cohort is in session.

(c) is the nicest “when this happens, call us” if JSTDRMN already pays for Operations Hub Professional. The webhook route is already the place that workflow would call, so you would not rebuild the portal. Don’t buy Operations Hub only for this. A private-app deal webhook plus the deal read in (b) does the same job on a normal CRM seat.

## What the stub does

| `HUBSPOT_PRIVATE_APP_TOKEN` | Behavior |
| --- | --- |
| Unset | `syncContact` returns immediately. `POST /api/hubspot/webhook` returns `{ "ok": true, "skipped": true }` and grants nothing. |
| Set, `HUBSPOT_LIVE` not `true` | Signup and purchase write a row to the HubSpot log (visible on the teacher desk) and do not call HubSpot. The webhook grants a cohort when the JSON includes an email and a cohort slug. Deal-stage batches are acknowledged and not granted, because the email isn’t in the payload. |
| Set, and `HUBSPOT_LIVE=true` | Signup and purchase call the contacts API. A `deal.propertyChange` for `dealstage`, when the stage is in `HUBSPOT_ACCEPTED_DEAL_STAGES` (default `closedwon,accepted`), loads the deal and its contact and grants `academy_cohort`. |

If the email has no Academy account yet, the grant waits. It applies when they sign up with that same email.

Unknown cohort slugs are reported and not retried as server errors. A failed live lookup returns 502 so HubSpot can retry. A bad signature returns 401.

Set `HUBSPOT_CLIENT_SECRET` before this URL is on the public internet. With a token and no secret, the webhook accepts unsigned JSON so you can try it locally.

## Try the webhook locally

```bash
# .env
HUBSPOT_PRIVATE_APP_TOKEN=stub

curl -s -X POST http://127.0.0.1:43123/api/hubspot/webhook \
  -H 'Content-Type: application/json' \
  -d '{"email":"newstudent@example.com","cohortSlug":"cohort-6"}'
```

Then sign up as `newstudent@example.com`. Cohort 6 should already be on the shelf.
