// Tiny pub-sub used when a header button (rendered by the Tabs layout)
// needs to trigger something inside a specific screen's own state — e.g.
// the Products screen's metrics glossary modal. Keeping this generic (not
// Products-specific) so it can be reused for the same pattern elsewhere
// without pulling screen-specific logic into _layout.tsx.
type Listener = () => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, listener: Listener): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return () => {
      this.listeners[event] = (this.listeners[event] || []).filter((l) => l !== listener);
    };
  }

  emit(event: string) {
    (this.listeners[event] || []).forEach((l) => l());
  }
}

export const eventBus = new EventBus();
