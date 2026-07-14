export type ShuffleTextEasing = (progress: number) => number;
export type ShuffleTextAutoplayMode = "visible" | "eager";
export interface ShuffleTextCompleteEventDetail {
    text: string;
}
declare const HTMLElementConstructor: typeof HTMLElement;
/**
 * Standalone Custom Element that reveals text through a shuffle animation.
 */
export declare class ShuffleTextElement extends HTMLElementConstructor {
    static get observedAttributes(): string[];
    private _isConnected;
    private _isRunning;
    private _initialText;
    private _originalText;
    private _originalLength;
    private _timeCurrent;
    private _timeStart;
    private _randomIndex;
    private _requestAnimationFrameId;
    private _initTimeoutId;
    private _autoplayIntersectionObserver;
    private _hasAutoplayed;
    private _isVisible;
    private _resolveStart;
    private _assistiveTextElement;
    private _previousAriaHidden;
    private _isAccessibilityTextEnabled;
    private _onIntervalBound;
    private _onMouseEnterBound;
    onComplete: ((event: CustomEvent<ShuffleTextCompleteEventDetail>) => void) | null;
    easing: ShuffleTextEasing;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    get isRunning(): boolean;
    get text(): string;
    set text(value: string);
    get duration(): number;
    set duration(value: number);
    get sourceRandomCharacter(): string;
    set sourceRandomCharacter(value: string);
    get emptyCharacter(): string;
    set emptyCharacter(value: string);
    get autoplay(): boolean;
    set autoplay(value: boolean);
    get autoplayMode(): ShuffleTextAutoplayMode;
    set autoplayMode(value: ShuffleTextAutoplayMode);
    get replayOnHover(): boolean;
    set replayOnHover(value: boolean);
    get replayOnVisible(): boolean;
    set replayOnVisible(value: boolean);
    get respectReducedMotion(): boolean;
    set respectReducedMotion(value: boolean);
    get accessibility(): boolean;
    set accessibility(value: boolean);
    setText(text: string): void;
    private _setOriginalText;
    start(): Promise<void>;
    stop(): void;
    dispose(): void;
    private _scheduleInit;
    private _captureInitialText;
    private _onInterval;
    private _complete;
    private _enableAccessibilityText;
    private _disableAccessibilityText;
    private _syncHoverListener;
    private _syncAutoplay;
    private _handleAutoplayIntersection;
    private _startAutoplay;
    private _clearAutoplayObserver;
    private _shouldReduceMotion;
    private _now;
    private _clamp01;
}
export declare const defineShuffleTextElement: (tagName?: string) => void;
export {};
