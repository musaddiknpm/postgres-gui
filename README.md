# PostgreSQL GUI
By [musaddiknpm](https://github.com/musaddiknpm)

A lightweight, self-hosted web GUI for managing PostgreSQL databases. Browse tables, execute SQL queries, and backup/restore your data — all from a clean browser interface.

![Node.js](https://img.shields.io/badge/Node.js-20.6+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **Dashboard** — Clean, responsive full-screen grid view of all your database tables
- **SQL Editor & Table Viewer** — Dedicated workspaces for writing custom queries and viewing spreadsheet-like data without clutter
- **VS Code-Style Autocomplete** — Write SQL quickly with real-time, context-aware autocomplete that suggests your database's actual table names
- **Interactive Data Grid** — Navigate massive datasets seamlessly using a highly optimized virtualized scroll grid with native `sticky` headers
- **Cell Viewer Modal** — Click any table cell to inspect full un-truncated data and copy large text or JSON payloads with a single click
- **Backup** — Download full database or single-table `.sql` or `.dump` archives
- **Restore** — Upload `.sql` or `.dump` files to restore data
- **Authentication** — Password-protected access with JWT tokens

## Prerequisites

- [Node.js](https://nodejs.org/) 20.6+
- [PostgreSQL](https://www.postgresql.org/) 12+ (with `pg_dump` and `psql` in your PATH)

## Setup

```bash
git clone https://github.com/musaddiknpm/postgres-gui.git
cd postgres-gui

npm install

cp .env.example .env

npm start
```

Then open [http://localhost:12000](http://localhost:12000) in your browser.

### Using Docker

You can also run the application using Docker. This automatically includes the necessary `psql` and `pg_dump` binaries.

```bash
docker build -t postgres-gui .

docker run -d -p 12000:12000 --env-file .env --name pg-gui postgres-gui
```

## Configuration

All configuration is done via environment variables in `.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `12000` | Server port |
| `HOST` | No | `127.0.0.1` | IP to bind the server to (use `0.0.0.0` for external access) |
| `ADMIN_PASSWORD` | **Yes** | — | Password to access the GUI. You can provide a plain-text password, and the server will automatically securely hash it and rewrite your `.env` file on startup. |
| `READONLY_PASSWORD` | No | — | Password for read-only access. Also auto-hashed on startup. Users logging in with this password will only be able to execute SELECT queries and cannot backup/restore data. |
| `JWT_SECRET` | No | Random | Secret key for JWT tokens. Auto-generated on startup by default. |
| `DATABASE_URL` | No | — | Full connection string (takes priority over individual fields) |
| `PGHOST` | No | `localhost` | PostgreSQL host |
| `PGPORT` | No | `5432` | PostgreSQL port |
| `PGUSER` | No | OS username | PostgreSQL user |
| `PGDATABASE` | No | `postgres` | Database name |
| `SSL_KEY_PATH` | No | — | Path to SSL private key (e.g. `./ssl/privkey.pem`) |
| `SSL_CERT_PATH` | No | — | Path to SSL certificate (e.g. `./ssl/fullchain.pem`) |
| `TRUST_PROXY` | No | `false` | Set to `true` if deploying behind a trusted reverse proxy (e.g., Nginx, ALB) so rate limiters can correctly identify client IPs. |

### Connecting to PostgreSQL

You have two ways to configure your database connection in the `.env` file:

**Option 1: Individual Parameters (Best for Local/Direct Connections)**
```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_db_password
PGDATABASE=postgres
```

**Option 2: Connection String (Best for Remote/Managed Databases like Neon, Supabase, AWS RDS)**
```env
DATABASE_URL=postgres://user:password@remote.host.com:5432/dbname?sslmode=require
```
*(Note: If `DATABASE_URL` is set, it takes priority and the individual `PG*` variables are ignored).*

## Security Features

This tool implements several security best practices out-of-the-box:
- **Rate Limiting**: Login endpoints are protected against brute-force attacks (max 5 attempts per 15 minutes). Resource-intensive endpoints like database queries and backup/restore operations are also rate-limited to prevent abuse.
- **Native Security Headers**: Custom middleware adds HTTP headers that protect against common web vulnerabilities (XSS, clickjacking, etc) without external dependencies.
- **CSRF Protection**: All state-modifying API endpoints require a custom `X-Requested-With` header, preventing Cross-Site Request Forgery by utilizing browser-enforced CORS policies.
- **Scrypt Hashing**: Passwords are mathematically hashed using Node.js native `crypto.scryptSync`, never stored or compared in plain text.
- **Strict JWT**: Authentication tokens are HTTP-only, secure (in production), and strictly scoped by role.
- **Role-Based Access Control**: Granular control via read-only profiles. Read-only queries are strictly enforced at the database layer using `BEGIN READ ONLY` transactions to absolutely prevent any data modification.

## SSL & Reverse Proxy Setup

You can secure the GUI using the built-in Node.js HTTPS server, or by placing it behind a reverse proxy like Nginx or Apache.

### Option A: Built-in Node.js HTTPS (SSL Directory)
If you have your own SSL certificates (e.g. inside an `ssl/` folder), simply provide their absolute or relative paths in your `.env` file:
```env
SSL_KEY_PATH=./ssl/privkey.pem
SSL_CERT_PATH=./ssl/fullchain.pem
```
The server will automatically detect these and start an `https://` server instead of HTTP.

### Option B: Nginx Reverse Proxy
If using Nginx, leave the Node.js server running on HTTP (binding to `127.0.0.1`), and use Nginx to handle SSL and proxy the requests. Make sure to set `TRUST_PROXY=true` in your `.env` file to correctly pass client IPs to the rate limiter:
```nginx
server {
    listen 443 ssl;
    server_name db.yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:12000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option C: Apache Reverse Proxy
For Apache, enable `mod_proxy` and `mod_proxy_http`, set `TRUST_PROXY=true` in your `.env`, then configure your VirtualHost:
```apache
<VirtualHost *:443>
    ServerName db.yourdomain.com

    SSLEngine on
    SSLCertificateFile /path/to/fullchain.pem
    SSLCertificateKeyFile /path/to/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:12000/
    ProxyPassReverse / http://127.0.0.1:12000/
</VirtualHost>
```

## Project Structure

```
server.js
src/
  config.js
  app.js
  auth/AuthService.js
  db/QueryExecutor.js
  db/BackupRestore.js
  middleware/authenticate.js
  middleware/errorHandler.js
  routes/auth.js
  routes/database.js
public/
  index.html
  js/
    app.js
    api-client.js
    query-editor.js
    table-browser.js
    backup-restore.js
tests/
  auth-service.test.js
  app.test.js
```

## Limitations

As a lightweight developer tool, this GUI has a few known limitations by design:
- **Foreign Keys & Reverting**: The "Safe Mode Revert" feature drops the table before restoring it to prevent duplicate key errors. However, if the table is referenced by a Foreign Key from another table, PostgreSQL will reject the `DROP` command to protect the relationship, causing the revert to fail.
- **Large Databases**: Backups and restores run synchronously within the HTTP request. If you attempt to dump/restore massive databases (e.g. multi-gigabyte), your browser or Node.js may time out the connection. For large databases, it is recommended to use the `.dump` custom binary format, which is compressed.
- **Query Limits**: Unbounded queries (`SELECT * FROM giant_table`) will pull all rows into Node's memory. It is expected that developers write their own `LIMIT` clauses to avoid crashing the server.
- **Local Focus**: The server binds to `127.0.0.1` by default. To expose it over a network, set the `HOST` environment variable explicitly (e.g., `HOST=0.0.0.0`).

## Testing

```bash
npm test
```

Tests use [Vitest](https://vitest.dev/) and [Supertest](https://github.com/ladjs/supertest). Auth and route tests run without a live database.

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit and push
6. Open a Pull Request

## License

MIT
