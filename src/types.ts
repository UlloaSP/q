/** A destination or a group of destinations. IDs must be unique across the tree. */
export interface QItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  /** Single character. Defaults to the next free key in the left-hand cluster. */
  readonly hotkey?: string;
  readonly href?: string;
  readonly disabled?: boolean;
  readonly children?: readonly QItem[];
  readonly data?: unknown;
}

export interface QState {
  readonly isOpen: boolean;
  readonly path: readonly string[];
  /** The group being explored, or null at the root. */
  readonly parent: QItem | null;
  readonly items: readonly QItem[];
  readonly activeId: string | null;
  readonly canGoBack: boolean;
}

export interface QNavigation {
  readonly item: QItem;
  readonly path: readonly string[];
}

export interface QCoreOptions {
  readonly items: readonly QItem[];
  readonly onNavigate?: (navigation: QNavigation) => void;
}

export interface QController {
  getState(): QState;
  subscribe(listener: (state: QState) => void): () => void;
  /** Always opens at the root, so a key sequence means the same thing every time. */
  open(): void;
  close(): void;
  toggle(): void;
  highlight(id: string | null): void;
  select(id: string): void;
  back(): void;
  setItems(items: readonly QItem[]): void;
}

export interface QRenderContext {
  readonly state: QState;
  readonly controller: QController;
}

export interface QOptions extends QCoreOptions {
  /** Defaults to document.body. Create the wheel only in the browser. */
  readonly target?: HTMLElement;
  readonly triggerKey?: string;
  /** Goes up one level. Backspace always works too. Defaults to Space. */
  readonly backKey?: string;
  /** Releasing the trigger faster than this, with nothing picked, keeps the wheel open. */
  readonly tapThreshold?: number;
  /** How long the pointer rests on a group before it opens. */
  readonly expandDelay?: number;
  readonly backDelay?: number;
  /** Pointer travel required after a level change, preventing cascades. */
  readonly hoverMoveThreshold?: number;
  /** Corner button that opens the wheel for pointer and touch. Defaults to true. */
  readonly trigger?: boolean;
  readonly label?: string;
  readonly className?: string;
  /** Replace a slot's content, preserving its keyboard and pointer behavior. */
  readonly renderItem?: (item: QItem, context: QRenderContext) => Node;
  readonly renderCenter?: (item: QItem | null, context: QRenderContext) => Node;
}

export interface QInstance extends QController {
  readonly element: HTMLDialogElement;
  /** Removes the DOM, timers, subscriptions, and document listeners. */
  destroy(): void;
}
