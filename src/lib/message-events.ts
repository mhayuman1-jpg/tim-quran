import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var __messageEvents: EventEmitter | undefined;
}

export const messageEvents: EventEmitter =
  global.__messageEvents || (global.__messageEvents = new EventEmitter());

// Banyak koneksi SSE dapat terbuka bersamaan
messageEvents.setMaxListeners(0);

export function emitMessageUpdate(): void {
  messageEvents.emit('update');
}
