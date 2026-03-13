import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface WebhookEvent {
  id: number;
  received_at: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string | object | null;
}

export type NewEvent = Omit<WebhookEvent, "id" | "received_at">;

export interface Storage {
  push(event: NewEvent): WebhookEvent;
  list(): WebhookEvent[];
  clear(): void;
}

class MemoryStorage implements Storage {
  private events: WebhookEvent[] = [];
  private seq = 0;

  constructor(private maxEvents: number) {}

  push(event: NewEvent): WebhookEvent {
    const full: WebhookEvent = {
      ...event,
      id: ++this.seq,
      received_at: new Date().toISOString(),
    };
    this.events.push(full);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    return full;
  }

  list(): WebhookEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
    this.seq = 0;
  }
}

class SqliteStorage implements Storage {
  private db: Database;
  private maxEvents: number;
  private insertStmt;
  private listStmt;
  private trimStmt;
  private clearStmt;

  constructor(maxEvents: number, dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.run("PRAGMA journal_mode=WAL");
    this.maxEvents = maxEvents;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        received_at TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        headers TEXT NOT NULL,
        query TEXT NOT NULL,
        body TEXT
      )
    `);

    this.insertStmt = this.db.prepare(
      "INSERT INTO events (received_at, method, path, headers, query, body) VALUES (?, ?, ?, ?, ?, ?)"
    );
    this.listStmt = this.db.prepare("SELECT * FROM events ORDER BY id ASC");
    this.trimStmt = this.db.prepare(
      "DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT ?)"
    );
    this.clearStmt = this.db.prepare("DELETE FROM events");
  }

  push(event: NewEvent): WebhookEvent {
    const received_at = new Date().toISOString();
    const result = this.insertStmt.run(
      received_at,
      event.method,
      event.path,
      JSON.stringify(event.headers),
      JSON.stringify(event.query),
      JSON.stringify(event.body)
    );
    const id = Number(result.lastInsertRowid);
    this.trimStmt.run(this.maxEvents);
    return { id, received_at, ...event };
  }

  list(): WebhookEvent[] {
    const rows = this.listStmt.all() as any[];
    return rows.map((row) => ({
      id: row.id,
      received_at: row.received_at,
      method: row.method,
      path: row.path,
      headers: JSON.parse(row.headers),
      query: JSON.parse(row.query),
      body: JSON.parse(row.body),
    }));
  }

  clear(): void {
    this.clearStmt.run();
  }
}

export function createStorage(opts: {
  type: "memory" | "sqlite";
  maxEvents: number;
  dbPath?: string;
}): Storage {
  if (opts.type === "sqlite") {
    return new SqliteStorage(opts.maxEvents, opts.dbPath || "data/events.db");
  }
  return new MemoryStorage(opts.maxEvents);
}
