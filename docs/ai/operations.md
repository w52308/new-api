# Operations Guide

## Generate secrets

Create `.env` from `.env.example` and never commit it. Use hexadecimal secrets so Compose-built MySQL URLs remain URI-safe:

```sh
cp .env.example .env
openssl rand -hex 48   # SESSION_SECRET
openssl rand -hex 48   # API_KEY_HMAC_KEY
openssl rand -base64 32 # KEY_ENCRYPTION_KEYS value after "1:"
openssl rand -hex 32   # MYSQL_PASSWORD
openssl rand -hex 32   # MYSQL_ROOT_PASSWORD
```

Add `MYSQL_DATABASE=feixiao`, `MYSQL_USER=feixiao`, and the generated `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` to `.env`. Set `APP_ENV=production`, `DEROUTER_ACCOUNT_KEY`, and the remaining generated secrets. Restrict the file with `chmod 600 .env`. Do not hand-build a URL with arbitrary unescaped passwords; use the documented hexadecimal password or a correctly percent-encoded DSN.

## First startup and migrations

Compose includes a one-shot `migrate` service. API and worker wait for it to complete successfully:

```sh
docker compose up -d mysql redis
docker compose run --rm migrate
docker compose up -d api worker web nginx
docker compose ps
curl --fail http://127.0.0.1:${HTTP_PORT:-80}/health/live
curl --fail http://127.0.0.1:${HTTP_PORT:-80}/health/ready
```

A fresh `docker compose up -d --build` also runs migrations through `service_completed_successfully` dependencies. Prometheus should scrape `http://api:8080/metrics` on the internal Compose network; public Nginx does not expose `/metrics`.

## Trusted proxy and authentication rate limits

The Compose network is fixed at `172.30.0.0/24`; Nginx uses `172.30.0.10`, and the API receives `TRUSTED_PROXY_CIDRS=172.30.0.10/32`. Nginx replaces incoming `X-Forwarded-For` and `X-Real-IP` values with the TCP peer address before proxying. This keeps login and email-OTP challenge rate-limit buckets separated by the real edge client instead of grouping every request under the Nginx container address, while preventing clients from rotating forged forwarding headers.

Direct API deployments must leave `TRUSTED_PROXY_CIDRS` empty unless a reverse proxy is actually present. For a different proxy topology, assign stable internal proxy addresses and configure only their exact CIDRs. `APP_ENV=production` rejects `0.0.0.0/0` and `::/0`. If a load balancer is added in front of Nginx, configure Nginx real-IP handling to trust only that load balancer before depending on per-client rate limits; do not merely pass through an unvalidated forwarding chain.

For a non-Compose database, construct a percent-encoded `DATABASE_URL` and run:

```sh
migrate -path db/migrations -database "$DATABASE_URL" up
migrate -path db/migrations -database "$DATABASE_URL" version
```

## Upgrade

```sh
docker compose exec -T mysql /opt/feixiao/backup-mysql.sh "${MYSQL_DATABASE:-feixiao}"
git pull --ff-only
docker compose build --pull api worker web
docker compose run --rm migrate
docker compose up -d --remove-orphans api worker web nginx
docker compose ps
docker compose logs --tail=100 api worker migrate nginx
```

Check readiness and recent structured error-level startup logs after every upgrade.

## Backup MySQL

Backups use `mysqldump` SQL format and UTC filenames such as `feixiao-20260802T091500Z.sql`. The script writes a temporary SQL dump, validates its `Dump completed` marker, and atomically renames it only after validation succeeds.

```sh
docker compose exec -T mysql /opt/feixiao/backup-mysql.sh "${MYSQL_DATABASE:-feixiao}"
docker compose cp mysql:/backups/feixiao-20260802T091500Z.sql ./backups/
```

Keep encrypted copies outside the Docker host and periodically restore a backup into a disposable database.

## Restore MySQL

Restores are destructive. Stop application traffic, select the database explicitly, and verify the archive and connection before restoring:

```sh
docker compose stop api worker nginx
docker compose cp ./backups/feixiao-20260802T091500Z.sql mysql:/backups/restore.sql
docker compose exec -T mysql /opt/feixiao/restore-mysql.sh "${MYSQL_DATABASE:-feixiao}" /backups/restore.sql
docker compose start api worker nginx
curl --fail http://127.0.0.1:${HTTP_PORT:-80}/health/ready
```

The restore script validates the `Dump completed` marker and `SELECT 1` before piping the SQL dump into `mysql`.

## Queue durability validation

Worker tasks use Asynq's pending, active, scheduled, retry, and archived Redis state. Each task gets a deterministic hashed Asynq TaskID derived from its task-specific identity, so equivalent tasks conflict while the existing task record is pending, active, retrying, or retained until completion/removal. A task-specific Unique option remains a secondary collision defense; it is not the lifecycle guarantee. API /metrics refreshes queue depth from the Asynq Inspector before rendering and fails open if Redis inspection is unavailable.

The portable Go suite validates task type and payload encoding, uniqueness options, handler registration, queue-depth accounting, and worker lifecycle without a live Redis service. It does not exercise process-kill recovery against live Redis; validate that behavior in staging before release by interrupting a worker during a retryable task and confirming the task resumes after restart.

## Troubleshooting

- **Migration service fails:** run `docker compose logs migrate mysql`; correct the migration or credentials before starting API and worker.
- **Readiness returns 503:** run `docker compose ps`, `docker compose logs mysql redis api`, `docker compose exec mysql mysqladmin ping`, and `docker compose exec redis redis-cli ping`.
- **SSE disconnects:** confirm requests use `/v1/`; verify Nginx buffering is disabled and `proxy_read_timeout` is `3600s`; correlate API logs using `request_id`.
- **REVIEW_REQUIRED increases:** inspect reconciliation records and upstream errors before retrying; do not manually alter wallet ledger rows.
- **Wallet authorization failures increase:** verify reseller balance, model policy, request limits, and clock synchronization without logging API keys or prompts.
- **Queue depth increases:** inspect worker logs and Redis health. The worker handles bounded task retries internally; repeated container restarts indicate an infrastructure failure rather than a job retry strategy.
