# API

The platform exposes a deliberately small OpenAI-compatible surface.

## Authentication

Send a platform API key using the Bearer scheme:

```http
Authorization: Bearer <platform-api-key>
```

Keys are scoped to one subaccount. A missing or invalid key returns `401`; an inactive model or insufficient reseller balance is rejected before any derouter request. Zero balance returns `402` with code `insufficient_balance`.

## `GET /v1/models`

Returns enabled model policies in an OpenAI-compatible list. The response contains model identifiers and capability metadata exposed by the deployment. This route requires Bearer authentication.

## `POST /v1/chat/completions`

Accepts the OpenAI chat-completions request body. `model` is required; `stream` selects buffered JSON or SSE output. The gateway performs API-key authentication, model-policy validation, reseller balance preauthorization, and then forwards the request to derouter.

Successful buffered responses return `200` and the upstream JSON body. The platform adds `X-Request-ID`, a UUID identifying the platform request. Use that ID when correlating usage, support tickets, and reconciliation records; it is not the derouter external usage-log ID.

### Streaming semantics

For `stream: true`, the response is `text/event-stream` and the gateway forwards chunks without proxy buffering. The first upstream SSE chunk is readable as soon as it arrives. Clients may disconnect at any time. The gateway records the request as `PENDING_RECONCILIATION` and marks `client_disconnected`; the worker later matches the derouter usage log and settles the wallet charge. A settled record is `SETTLED` at the request layer and `CONSUMED` at the upstream-log layer.

## Errors

Errors use this schema:

```json
{
  "error": {
    "message": "human-readable explanation",
    "type": "invalid_request_error",
    "code": "invalid_request",
    "request_id": "uuid"
  }
}
```

`request_id` is the platform request ID. Common statuses are `400` invalid input, `401` authentication failure, `402` insufficient balance, `404` unsupported resource, `413` request too large, `429` rate limit, and `502`/`504` upstream failures. Clients should log the request ID but avoid logging prompts, responses, or secrets.

## Privacy

Prompts and response bodies are not persisted by the platform. Stored records are limited to request metadata, token counts when available, pricing amounts, status, IDs, latency, audit data, and redacted usage summaries needed for reconciliation and billing. Upstream providers may apply their own retention policies; configure and review those policies separately.
