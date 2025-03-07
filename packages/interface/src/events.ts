import { setMaxListeners as nodeSetMaxListeners } from 'events'

export interface EventCallback<EventType> { (evt: EventType): void }
export interface EventObject<EventType> { handleEvent: EventCallback<EventType> }
export type EventHandler<EventType> = EventCallback<EventType> | EventObject<EventType>

interface Listener {
  once: boolean
  callback: any
}

/**
 * Adds types to the EventTarget class. Hopefully this won't be necessary forever.
 *
 * https://github.com/microsoft/TypeScript/issues/28357
 * https://github.com/microsoft/TypeScript/issues/43477
 * https://github.com/microsoft/TypeScript/issues/299
 * etc
 */
export interface TypedEventTarget <EventMap extends Record<string, any>> extends EventTarget {
  addEventListener<K extends keyof EventMap>(type: K, listener: EventHandler<EventMap[K]> | null, options?: boolean | AddEventListenerOptions): void

  listenerCount (type: string): number

  removeEventListener<K extends keyof EventMap>(type: K, listener?: EventHandler<EventMap[K]> | null, options?: boolean | EventListenerOptions): void

  removeEventListener (type: string, listener?: EventHandler<Event>, options?: boolean | EventListenerOptions): void

  safeDispatchEvent<Detail>(type: keyof EventMap, detail: CustomEventInit<Detail>): boolean
}

/**
 * An implementation of a typed event target
 * etc
 */
export class TypedEventEmitter<EventMap extends Record<string, any>> extends EventTarget implements TypedEventTarget<EventMap> {
  #listeners = new Map<any, Listener[]>()

  listenerCount (type: string): number {
    const listeners = this.#listeners.get(type)

    if (listeners == null) {
      return 0
    }

    return listeners.length
  }

  addEventListener<K extends keyof EventMap>(type: K, listener: EventHandler<EventMap[K]> | null, options?: boolean | AddEventListenerOptions): void
  addEventListener (type: string, listener: EventHandler<Event>, options?: boolean | AddEventListenerOptions): void {
    super.addEventListener(type, listener, options)

    let list = this.#listeners.get(type)

    if (list == null) {
      list = []
      this.#listeners.set(type, list)
    }

    list.push({
      callback: listener,
      once: (options !== true && options !== false && options?.once) ?? false
    })
  }

  removeEventListener<K extends keyof EventMap>(type: K, listener?: EventHandler<EventMap[K]> | null, options?: boolean | EventListenerOptions): void
  removeEventListener (type: string, listener?: EventHandler<Event>, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type.toString(), listener ?? null, options)

    let list = this.#listeners.get(type)

    if (list == null) {
      return
    }

    list = list.filter(({ callback }) => callback !== listener)
    this.#listeners.set(type, list)
  }

  dispatchEvent (event: Event): boolean {
    const result = super.dispatchEvent(event)

    let list = this.#listeners.get(event.type)

    if (list == null) {
      return result
    }

    list = list.filter(({ once }) => !once)
    this.#listeners.set(event.type, list)

    return result
  }

  safeDispatchEvent<Detail>(type: keyof EventMap, detail: CustomEventInit<Detail>): boolean {
    return this.dispatchEvent(new CustomEvent<Detail>(type as string, detail))
  }
}

/**
 * CustomEvent is a standard event but it's not supported by node.
 *
 * Remove this when https://github.com/nodejs/node/issues/40678 is closed.
 *
 * Ref: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
 */
class CustomEventPolyfill<T = any> extends Event {
  /** Returns any custom data event was created with. Typically used for synthetic events. */
  public detail: T

  constructor (message: string, data?: EventInit & { detail: T }) {
    super(message, data)
    // @ts-expect-error could be undefined
    this.detail = data?.detail
  }
}

export const CustomEvent = globalThis.CustomEvent ?? CustomEventPolyfill

// TODO: remove this in v1
export { TypedEventEmitter as EventEmitter }

// create a setMaxListeners that doesn't break browser usage
export const setMaxListeners: typeof nodeSetMaxListeners = (n, ...eventTargets) => {
  try {
    nodeSetMaxListeners(n, ...eventTargets)
  } catch {
    // swallow error, gulp
  }
}
