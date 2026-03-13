# PBXware Event Catcher

A simple tool that catches webhook events from PBXware Event Publisher and shows them in a real-time dashboard. You can run it on your own server to see exactly what events PBXware is sending.

## Getting Started

1. Download the right file for your system from the [Releases](../../releases/latest) page:

   | Your system | Download this file |
   |---|---|
   | Linux (most servers) | `pbxware-event-catcher-linux-x64` |
   | Linux (older CPU / "Illegal instruction" error) | `pbxware-event-catcher-linux-x64-baseline` |
   | Linux on ARM (Raspberry Pi, etc.) | `pbxware-event-catcher-linux-arm64` |
   | Mac (Intel) | `pbxware-event-catcher-darwin-x64` |
   | Mac (Apple Silicon / M1–M4) | `pbxware-event-catcher-darwin-arm64` |
   | Windows | `pbxware-event-catcher-windows-x64.exe` |

2. Open a terminal and run it:

   **Linux / Mac:**
   ```bash
   chmod +x pbxware-event-catcher-linux-x64
   ./pbxware-event-catcher-linux-x64
   ```

   **Windows** — double-click the `.exe` file, or run in Command Prompt:
   ```
   pbxware-event-catcher-windows-x64.exe
   ```

3. Open `http://localhost:3000` in your browser — you'll see the dashboard.

4. In PBXware, configure Event Publisher to send events to:
   ```
   http://your-server-ip:3000/events
   ```

That's it! Events will appear in the dashboard in real time.

## Optional Settings

You can configure the tool using environment variables. Set them before the command:

**Linux / Mac:**
```bash
PASSWORD=secret STORAGE=sqlite ./pbxware-event-catcher-linux-x64
```

**Windows (Command Prompt):**
```
set PASSWORD=secret
set STORAGE=sqlite
pbxware-event-catcher-windows-x64.exe
```

| Setting | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `STORAGE` | `memory` | Set to `sqlite` to keep events after restart |
| `DB_PATH` | `data/events.db` | Where to store the database file (only with `sqlite`) |
| `PASSWORD` | *(none)* | Set a password to protect the dashboard |
| `MAX_EVENTS` | `200` | How many events to keep |
| `MAX_BODY_BYTES` | `524288` | Maximum size of incoming webhooks (512 KB) |

### Password Protection

If you set a `PASSWORD`, the dashboard will show a login screen. In PBXware Event Publisher, set the Auth section to:

- **Auth Type**: Bearer Token
- **Token**: your password

---

## Advanced: Other Ways to Run

### From source (requires [Bun](https://bun.sh))

```bash
bun run src/index.ts
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

Edit `docker-compose.yml` to configure settings.

### Compile from Source

```bash
bun build src/index.ts --compile --outfile pbxware-event-catcher
```

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Dashboard |
| `/events` | GET | List stored events as JSON |
| `/events` | POST/PUT/PATCH | Receive webhook events |
| `/events` | DELETE | Clear all events |
| `/stream` | GET | Real-time event stream (SSE) |
