# PBXware Event Catcher

Self-hosted webhook event catcher for [PBXware](https://www.bicom.com/pbxware/) Event Publisher. Captures incoming webhook events and displays them in a real-time dashboard.

## Features

- Real-time event dashboard with Server-Sent Events (SSE)
- Catches POST, PUT, and PATCH webhook payloads
- Optional SQLite persistence (events survive restarts)
- Optional password authentication
- Zero dependencies — runs on [Bun](https://bun.sh) with built-in SQLite

## Quick Start

### Bun (recommended)

```bash
bun run src/index.ts
```

### Compiled Binary

```bash
bun build src/index.ts --compile --outfile pbxware-event-catcher
./pbxware-event-catcher
```

### Docker

```bash
docker build -t pbxware-event-catcher .
docker run -p 3000:3000 pbxware-event-catcher
```

### Docker Compose

```bash
docker compose up
```

Edit `docker-compose.yml` to configure environment variables.

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `STORAGE` | `memory` | `memory` or `sqlite` |
| `DB_PATH` | `data/events.db` | SQLite database path (when `STORAGE=sqlite`) |
| `PASSWORD` | *(empty)* | If set, enables authentication |
| `MAX_EVENTS` | `200` | Maximum stored events |
| `MAX_BODY_BYTES` | `524288` | Maximum request body size (512 KB) |

Example with all options:

```bash
PASSWORD=secret STORAGE=sqlite bun run src/index.ts
```

## Usage

### Dashboard

Open `http://localhost:3000` in your browser to view the real-time event dashboard.

### PBXware Configuration

Configure PBXware Event Publisher to send events to:

```
http://your-server:3000/events
```

If authentication is enabled, add the header:

```
Authorization: Bearer your-password
```

### API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Dashboard UI |
| `/events` | GET | List stored events (JSON) |
| `/events` | POST/PUT/PATCH | Receive webhook events |
| `/events` | DELETE | Clear all events |
| `/stream` | GET | SSE real-time event stream |

### Authentication

When `PASSWORD` is set:

- **Dashboard**: shows a login form, authenticates via cookie
- **API**: requires `Authorization: Bearer <password>` header
- **Logout**: `GET /logout` clears the session

When `PASSWORD` is not set, everything is open.
