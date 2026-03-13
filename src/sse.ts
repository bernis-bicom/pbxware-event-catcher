import type { WebhookEvent } from "./storage";

const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController): void {
  clients.add(controller);
}

export function removeClient(
  controller: ReadableStreamDefaultController
): void {
  clients.delete(controller);
}

export function broadcast(event: WebhookEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try {
      client.enqueue(data);
    } catch {
      clients.delete(client);
    }
  }
}

setInterval(() => {
  for (const client of clients) {
    try {
      client.enqueue(":\n\n");
    } catch {
      clients.delete(client);
    }
  }
}, 5000);
