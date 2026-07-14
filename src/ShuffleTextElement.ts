export type ShuffleTextEasing = (progress: number) => number;
export type ShuffleTextAutoplayMode = "visible" | "eager";

export interface ShuffleTextCompleteEventDetail {
  text: string;
}

const DEFAULT_TAG_NAME = "shuffle-text";
const DEFAULT_RANDOM_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
const DEFAULT_EMPTY_CHARACTER = "-";
const DEFAULT_DURATION = 600;
const DEFAULT_AUTOPLAY_MODE: ShuffleTextAutoplayMode = "visible";
const defaultEasing: ShuffleTextEasing = (progress: number): number => progress;
const HTMLElementConstructor: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as typeof HTMLElement) : HTMLElement;

const booleanAttribute = (value: string | null, defaultValue: boolean): boolean => {
  if (value === null) {
    return defaultValue;
  }
  return value !== "false";
};

/**
 * Standalone Custom Element that reveals text through a shuffle animation.
 */
export class ShuffleTextElement extends HTMLElementConstructor {
  public static get observedAttributes(): string[] {
    return [
      "accessibility",
      "autoplay",
      "autoplay-mode",
      "duration",
      "empty-character",
      "random-characters",
      "replay-on-hover",
      "replay-on-visible",
      "respect-reduced-motion",
      "text",
    ];
  }

  private _isConnected: boolean = false;
  private _isRunning: boolean = false;
  private _initialText: string = "";
  private _originalText: string = "";
  private _originalLength: number = 0;
  private _timeCurrent: number = 0;
  private _timeStart: number = 0;
  private _randomIndex: number[] = [];
  private _requestAnimationFrameId: number = 0;
  private _initTimeoutId: number = 0;
  private _autoplayIntersectionObserver: IntersectionObserver | null = null;
  private _hasAutoplayed: boolean = false;
  private _isVisible: boolean = false;
  private _resolveStart: (() => void) | null = null;
  private _assistiveTextElement: HTMLSpanElement | null = null;
  private _previousAriaHidden: string | null = null;
  private _isAccessibilityTextEnabled: boolean = false;
  private _onIntervalBound: FrameRequestCallback = this._onInterval.bind(this);
  private _onMouseEnterBound: EventListener = (): void => {
    this.start();
  };

  public onComplete: ((event: CustomEvent<ShuffleTextCompleteEventDetail>) => void) | null = null;
  public easing: ShuffleTextEasing = defaultEasing;

  public connectedCallback(): void {
    this._isConnected = true;
    this._scheduleInit();
  }

  public disconnectedCallback(): void {
    this.removeEventListener("mouseenter", this._onMouseEnterBound);
    window.clearTimeout(this._initTimeoutId);
    this._initTimeoutId = 0;
    this.dispose();
    this._isConnected = false;
  }

  public attributeChangedCallback(name: string): void {
    if (!this._isConnected) {
      return;
    }

    this._syncHoverListener();
    if (name === "autoplay" || name === "autoplay-mode" || name === "replay-on-visible") {
      this._syncAutoplay();
    }
    this._setOriginalText(this.text);

    if (!this._isRunning) {
      this.textContent = this.text;
    }
  }

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public get text(): string {
    return this.getAttribute("text") ?? this._initialText;
  }

  public set text(value: string) {
    this.setAttribute("text", value);
  }

  public get duration(): number {
    const value = Number(this.getAttribute("duration"));
    return Number.isFinite(value) ? value : DEFAULT_DURATION;
  }

  public set duration(value: number) {
    this.setAttribute("duration", String(value));
  }

  public get sourceRandomCharacter(): string {
    return this.getAttribute("random-characters") ?? DEFAULT_RANDOM_CHARACTERS;
  }

  public set sourceRandomCharacter(value: string) {
    this.setAttribute("random-characters", value);
  }

  public get emptyCharacter(): string {
    return this.getAttribute("empty-character") ?? DEFAULT_EMPTY_CHARACTER;
  }

  public set emptyCharacter(value: string) {
    this.setAttribute("empty-character", value);
  }

  public get autoplay(): boolean {
    return this.hasAttribute("autoplay");
  }

  public set autoplay(value: boolean) {
    this.toggleAttribute("autoplay", value);
  }

  public get autoplayMode(): ShuffleTextAutoplayMode {
    return this.getAttribute("autoplay-mode") === "eager" ? "eager" : DEFAULT_AUTOPLAY_MODE;
  }

  public set autoplayMode(value: ShuffleTextAutoplayMode) {
    this.setAttribute("autoplay-mode", value);
  }

  public get replayOnHover(): boolean {
    return this.hasAttribute("replay-on-hover");
  }

  public set replayOnHover(value: boolean) {
    this.toggleAttribute("replay-on-hover", value);
  }

  public get replayOnVisible(): boolean {
    return this.hasAttribute("replay-on-visible");
  }

  public set replayOnVisible(value: boolean) {
    this.toggleAttribute("replay-on-visible", value);
  }

  public get respectReducedMotion(): boolean {
    return booleanAttribute(this.getAttribute("respect-reduced-motion"), true);
  }

  public set respectReducedMotion(value: boolean) {
    this.setAttribute("respect-reduced-motion", String(value));
  }

  public get accessibility(): boolean {
    return booleanAttribute(this.getAttribute("accessibility"), true);
  }

  public set accessibility(value: boolean) {
    this.setAttribute("accessibility", String(value));
  }

  public setText(text: string): void {
    this.text = text;
  }

  private _setOriginalText(text: string): void {
    this._originalText = text;
    this._originalLength = text.length;
  }

  public start(): Promise<void> {
    this.stop();
    this._captureInitialText();
    this._setOriginalText(this.text);

    if (this._shouldReduceMotion()) {
      this.textContent = this._originalText;
      this._complete();
      return Promise.resolve();
    }

    this._randomIndex = [];
    let str = "";
    for (let i = 0; i < this._originalLength; i++) {
      const rate = i / this._originalLength;
      this._randomIndex[i] = Math.random() * (1 - rate) + rate;
      str += this.emptyCharacter;
    }

    this._timeStart = this._now();
    this._isRunning = true;
    this._enableAccessibilityText();
    this.textContent = str;
    this._requestAnimationFrameId = requestAnimationFrame(this._onIntervalBound);

    return new Promise<void>((resolve: () => void): void => {
      this._resolveStart = resolve;
    });
  }

  public stop(): void {
    if (!this._isRunning && this._requestAnimationFrameId === 0) {
      return;
    }

    this._isRunning = false;
    cancelAnimationFrame(this._requestAnimationFrameId);
    this._requestAnimationFrameId = 0;
    this._disableAccessibilityText();
    this._resolveStart?.();
    this._resolveStart = null;
  }

  public dispose(): void {
    this.removeEventListener("mouseenter", this._onMouseEnterBound);
    window.clearTimeout(this._initTimeoutId);
    this._initTimeoutId = 0;
    this._clearAutoplayObserver();
    cancelAnimationFrame(this._requestAnimationFrameId);
    this._isRunning = false;
    this._hasAutoplayed = false;
    this._isVisible = false;
    this._timeCurrent = 0;
    this._timeStart = 0;
    this._randomIndex = [];
    this._requestAnimationFrameId = 0;
    this._disableAccessibilityText();
    this._resolveStart?.();
    this._resolveStart = null;
  }

  private _scheduleInit(): void {
    window.clearTimeout(this._initTimeoutId);
    this._initTimeoutId = window.setTimeout((): void => {
      if (!this._isConnected) {
        return;
      }

      this._initTimeoutId = 0;
      this._captureInitialText();
      this._setOriginalText(this.text);
      this._syncHoverListener();
      this._syncAutoplay();

      if (!this.autoplay) {
        this.textContent = this.text;
      }
    }, 0);
  }

  private _captureInitialText(): void {
    if (this.hasAttribute("text")) {
      this._initialText = this.getAttribute("text") ?? "";
      return;
    }

    if (this._initialText === "") {
      this._initialText = this.textContent ?? "";
    }
  }

  private _onInterval(): void {
    this._timeCurrent = this._now() - this._timeStart;
    const linearPercent = this.duration <= 0 ? 1 : this._timeCurrent / this.duration;
    const percent = this._clamp01(this.easing(this._clamp01(linearPercent)));

    let str = "";
    for (let i = 0; i < this._originalLength; i++) {
      if (percent >= this._randomIndex[i]) {
        str += this._originalText.charAt(i);
      } else if (percent < this._randomIndex[i] / 3) {
        str += this.emptyCharacter;
      } else {
        str += this.sourceRandomCharacter.charAt(
          Math.floor(Math.random() * this.sourceRandomCharacter.length),
        );
      }
    }

    if (linearPercent >= 1) {
      str = this._originalText;
      this._isRunning = false;
    }

    this.textContent = str;

    if (this._isRunning) {
      this._requestAnimationFrameId = requestAnimationFrame(this._onIntervalBound);
    } else {
      this._requestAnimationFrameId = 0;
      this._disableAccessibilityText();
      this._complete();
      this._resolveStart?.();
      this._resolveStart = null;
    }
  }

  private _complete(): void {
    const event = new CustomEvent<ShuffleTextCompleteEventDetail>("shuffle-text-complete", {
      detail: {
        text: this._originalText,
      },
    });
    this.onComplete?.(event);
    this.dispatchEvent(event);
  }

  private _enableAccessibilityText(): void {
    if (!this.accessibility) {
      return;
    }

    this._disableAccessibilityText();
    this._previousAriaHidden = this.getAttribute("aria-hidden");
    this.setAttribute("aria-hidden", "true");

    const span = document.createElement("span");
    span.textContent = this._originalText;
    span.style.position = "absolute";
    span.style.width = "1px";
    span.style.height = "1px";
    span.style.padding = "0";
    span.style.margin = "-1px";
    span.style.overflow = "hidden";
    span.style.clip = "rect(0, 0, 0, 0)";
    span.style.whiteSpace = "nowrap";
    span.style.border = "0";
    this.insertAdjacentElement("afterend", span);
    this._assistiveTextElement = span;
    this._isAccessibilityTextEnabled = true;
  }

  private _disableAccessibilityText(): void {
    if (!this._isAccessibilityTextEnabled) {
      return;
    }

    if (this._previousAriaHidden === null) {
      this.removeAttribute("aria-hidden");
    } else {
      this.setAttribute("aria-hidden", this._previousAriaHidden);
    }

    this._assistiveTextElement?.remove();
    this._assistiveTextElement = null;
    this._previousAriaHidden = null;
    this._isAccessibilityTextEnabled = false;
  }

  private _syncHoverListener(): void {
    this.removeEventListener("mouseenter", this._onMouseEnterBound);
    if (this.replayOnHover) {
      this.addEventListener("mouseenter", this._onMouseEnterBound);
    }
  }

  private _syncAutoplay(): void {
    this._clearAutoplayObserver();

    if (!this.autoplay && !this.replayOnVisible) {
      this._hasAutoplayed = false;
      this._isVisible = false;
      return;
    }

    if (this._hasAutoplayed && !this.replayOnVisible) {
      return;
    }

    if ((this.autoplayMode === "eager" && this.autoplay && !this.replayOnVisible) || typeof IntersectionObserver === "undefined") {
      this._startAutoplay();
      return;
    }

    this._autoplayIntersectionObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]): void => {
      entries.forEach((entry: IntersectionObserverEntry): void => {
        this._handleAutoplayIntersection(entry.isIntersecting);
      });
    });
    this._autoplayIntersectionObserver.observe(this);
  }

  private _handleAutoplayIntersection(isIntersecting: boolean): void {
    if (!isIntersecting) {
      this._isVisible = false;
      return;
    }

    if (this._isVisible) {
      return;
    }

    this._isVisible = true;
    this._startAutoplay(this.replayOnVisible);
  }

  private _startAutoplay(keepObserver: boolean = false): void {
    if ((!this.autoplay && !this.replayOnVisible) || (this._hasAutoplayed && !keepObserver)) {
      if (!keepObserver) {
        this._clearAutoplayObserver();
      }
      return;
    }

    this._hasAutoplayed = true;
    if (!keepObserver) {
      this._clearAutoplayObserver();
    }
    void this.start();
  }

  private _clearAutoplayObserver(): void {
    this._autoplayIntersectionObserver?.disconnect();
    this._autoplayIntersectionObserver = null;
  }

  private _shouldReduceMotion(): boolean {
    return (
      this.respectReducedMotion &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  private _now(): number {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }

    return Date.now();
  }

  private _clamp01(value: number): number {
    if (value < 0) {
      return 0;
    }
    if (value > 1) {
      return 1;
    }
    return value;
  }
}

export const defineShuffleTextElement = (tagName: string = DEFAULT_TAG_NAME): void => {
  if (typeof customElements !== "undefined" && !customElements.get(tagName)) {
    const elementConstructor =
      tagName === DEFAULT_TAG_NAME
        ? ShuffleTextElement
        : class CustomShuffleTextElement extends ShuffleTextElement {};
    customElements.define(tagName, elementConstructor);
  }
};

defineShuffleTextElement();
