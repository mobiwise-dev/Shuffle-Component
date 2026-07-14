//#region src/ShuffleTextElement.ts
const DEFAULT_TAG_NAME = "shuffle-text";
const DEFAULT_RANDOM_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
const DEFAULT_EMPTY_CHARACTER = "-";
const DEFAULT_DURATION = 600;
const DEFAULT_AUTOPLAY_MODE = "visible";
const defaultEasing = (progress) => progress;
const HTMLElementConstructor = typeof HTMLElement === "undefined" ? class {} : HTMLElement;
const booleanAttribute = (value, defaultValue) => {
	if (value === null) return defaultValue;
	return value !== "false";
};
/**
* Standalone Custom Element that reveals text through a shuffle animation.
*/
var ShuffleTextElement = class extends HTMLElementConstructor {
	constructor(..._args) {
		super(..._args);
		this._isConnected = false;
		this._isRunning = false;
		this._initialText = "";
		this._originalText = "";
		this._originalLength = 0;
		this._timeCurrent = 0;
		this._timeStart = 0;
		this._randomIndex = [];
		this._requestAnimationFrameId = 0;
		this._initTimeoutId = 0;
		this._autoplayIntersectionObserver = null;
		this._hasAutoplayed = false;
		this._isVisible = false;
		this._resolveStart = null;
		this._assistiveTextElement = null;
		this._previousAriaHidden = null;
		this._isAccessibilityTextEnabled = false;
		this._onIntervalBound = this._onInterval.bind(this);
		this._onMouseEnterBound = () => {
			this.start();
		};
		this.onComplete = null;
		this.easing = defaultEasing;
	}
	static get observedAttributes() {
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
			"text"
		];
	}
	connectedCallback() {
		this._isConnected = true;
		this._scheduleInit();
	}
	disconnectedCallback() {
		this.removeEventListener("mouseenter", this._onMouseEnterBound);
		window.clearTimeout(this._initTimeoutId);
		this._initTimeoutId = 0;
		this.dispose();
		this._isConnected = false;
	}
	attributeChangedCallback(name) {
		if (!this._isConnected) return;
		this._syncHoverListener();
		if (name === "autoplay" || name === "autoplay-mode" || name === "replay-on-visible") this._syncAutoplay();
		this._setOriginalText(this.text);
		if (!this._isRunning) this.textContent = this.text;
	}
	get isRunning() {
		return this._isRunning;
	}
	get text() {
		return this.getAttribute("text") ?? this._initialText;
	}
	set text(value) {
		this.setAttribute("text", value);
	}
	get duration() {
		const value = Number(this.getAttribute("duration"));
		return Number.isFinite(value) ? value : DEFAULT_DURATION;
	}
	set duration(value) {
		this.setAttribute("duration", String(value));
	}
	get sourceRandomCharacter() {
		return this.getAttribute("random-characters") ?? DEFAULT_RANDOM_CHARACTERS;
	}
	set sourceRandomCharacter(value) {
		this.setAttribute("random-characters", value);
	}
	get emptyCharacter() {
		return this.getAttribute("empty-character") ?? DEFAULT_EMPTY_CHARACTER;
	}
	set emptyCharacter(value) {
		this.setAttribute("empty-character", value);
	}
	get autoplay() {
		return this.hasAttribute("autoplay");
	}
	set autoplay(value) {
		this.toggleAttribute("autoplay", value);
	}
	get autoplayMode() {
		return this.getAttribute("autoplay-mode") === "eager" ? "eager" : DEFAULT_AUTOPLAY_MODE;
	}
	set autoplayMode(value) {
		this.setAttribute("autoplay-mode", value);
	}
	get replayOnHover() {
		return this.hasAttribute("replay-on-hover");
	}
	set replayOnHover(value) {
		this.toggleAttribute("replay-on-hover", value);
	}
	get replayOnVisible() {
		return this.hasAttribute("replay-on-visible");
	}
	set replayOnVisible(value) {
		this.toggleAttribute("replay-on-visible", value);
	}
	get respectReducedMotion() {
		return booleanAttribute(this.getAttribute("respect-reduced-motion"), true);
	}
	set respectReducedMotion(value) {
		this.setAttribute("respect-reduced-motion", String(value));
	}
	get accessibility() {
		return booleanAttribute(this.getAttribute("accessibility"), true);
	}
	set accessibility(value) {
		this.setAttribute("accessibility", String(value));
	}
	setText(text) {
		this.text = text;
	}
	_setOriginalText(text) {
		this._originalText = text;
		this._originalLength = text.length;
	}
	start() {
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
		return new Promise((resolve) => {
			this._resolveStart = resolve;
		});
	}
	stop() {
		if (!this._isRunning && this._requestAnimationFrameId === 0) return;
		this._isRunning = false;
		cancelAnimationFrame(this._requestAnimationFrameId);
		this._requestAnimationFrameId = 0;
		this._disableAccessibilityText();
		this._resolveStart?.();
		this._resolveStart = null;
	}
	dispose() {
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
	_scheduleInit() {
		window.clearTimeout(this._initTimeoutId);
		this._initTimeoutId = window.setTimeout(() => {
			if (!this._isConnected) return;
			this._initTimeoutId = 0;
			this._captureInitialText();
			this._setOriginalText(this.text);
			this._syncHoverListener();
			this._syncAutoplay();
			if (!this.autoplay) this.textContent = this.text;
		}, 0);
	}
	_captureInitialText() {
		if (this.hasAttribute("text")) {
			this._initialText = this.getAttribute("text") ?? "";
			return;
		}
		if (this._initialText === "") this._initialText = this.textContent ?? "";
	}
	_onInterval() {
		this._timeCurrent = this._now() - this._timeStart;
		const linearPercent = this.duration <= 0 ? 1 : this._timeCurrent / this.duration;
		const percent = this._clamp01(this.easing(this._clamp01(linearPercent)));
		let str = "";
		for (let i = 0; i < this._originalLength; i++) if (percent >= this._randomIndex[i]) str += this._originalText.charAt(i);
		else if (percent < this._randomIndex[i] / 3) str += this.emptyCharacter;
		else str += this.sourceRandomCharacter.charAt(Math.floor(Math.random() * this.sourceRandomCharacter.length));
		if (linearPercent >= 1) {
			str = this._originalText;
			this._isRunning = false;
		}
		this.textContent = str;
		if (this._isRunning) this._requestAnimationFrameId = requestAnimationFrame(this._onIntervalBound);
		else {
			this._requestAnimationFrameId = 0;
			this._disableAccessibilityText();
			this._complete();
			this._resolveStart?.();
			this._resolveStart = null;
		}
	}
	_complete() {
		const event = new CustomEvent("shuffle-text-complete", { detail: { text: this._originalText } });
		this.onComplete?.(event);
		this.dispatchEvent(event);
	}
	_enableAccessibilityText() {
		if (!this.accessibility) return;
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
	_disableAccessibilityText() {
		if (!this._isAccessibilityTextEnabled) return;
		if (this._previousAriaHidden === null) this.removeAttribute("aria-hidden");
		else this.setAttribute("aria-hidden", this._previousAriaHidden);
		this._assistiveTextElement?.remove();
		this._assistiveTextElement = null;
		this._previousAriaHidden = null;
		this._isAccessibilityTextEnabled = false;
	}
	_syncHoverListener() {
		this.removeEventListener("mouseenter", this._onMouseEnterBound);
		if (this.replayOnHover) this.addEventListener("mouseenter", this._onMouseEnterBound);
	}
	_syncAutoplay() {
		this._clearAutoplayObserver();
		if (!this.autoplay && !this.replayOnVisible) {
			this._hasAutoplayed = false;
			this._isVisible = false;
			return;
		}
		if (this._hasAutoplayed && !this.replayOnVisible) return;
		if (this.autoplayMode === "eager" && this.autoplay && !this.replayOnVisible || typeof IntersectionObserver === "undefined") {
			this._startAutoplay();
			return;
		}
		this._autoplayIntersectionObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				this._handleAutoplayIntersection(entry.isIntersecting);
			});
		});
		this._autoplayIntersectionObserver.observe(this);
	}
	_handleAutoplayIntersection(isIntersecting) {
		if (!isIntersecting) {
			this._isVisible = false;
			return;
		}
		if (this._isVisible) return;
		this._isVisible = true;
		this._startAutoplay(this.replayOnVisible);
	}
	_startAutoplay(keepObserver = false) {
		if (!this.autoplay && !this.replayOnVisible || this._hasAutoplayed && !keepObserver) {
			if (!keepObserver) this._clearAutoplayObserver();
			return;
		}
		this._hasAutoplayed = true;
		if (!keepObserver) this._clearAutoplayObserver();
		this.start();
	}
	_clearAutoplayObserver() {
		this._autoplayIntersectionObserver?.disconnect();
		this._autoplayIntersectionObserver = null;
	}
	_shouldReduceMotion() {
		return this.respectReducedMotion && typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}
	_now() {
		if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
		return Date.now();
	}
	_clamp01(value) {
		if (value < 0) return 0;
		if (value > 1) return 1;
		return value;
	}
};
const defineShuffleTextElement = (tagName = DEFAULT_TAG_NAME) => {
	if (typeof customElements !== "undefined" && !customElements.get(tagName)) {
		const elementConstructor = tagName === DEFAULT_TAG_NAME ? ShuffleTextElement : class CustomShuffleTextElement extends ShuffleTextElement {};
		customElements.define(tagName, elementConstructor);
	}
};
defineShuffleTextElement();
//#endregion
export { ShuffleTextElement, defineShuffleTextElement };
