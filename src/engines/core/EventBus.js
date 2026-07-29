// src/engines/core/EventBus.js
// 引擎间通信总线：所有 Engine 通过这里解耦协作

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  off(event, handler) {
    const handlers = this.events.get(event);
    if (handlers) handlers.delete(handler);
  }

  emit(event, payload) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.warn(`[EventBus] 事件 ${event} 处理器出错:`, err);
        }
      });
    }
  }

  clear() {
    this.events.clear();
  }
}

export const bus = new EventBus();
