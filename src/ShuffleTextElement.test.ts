// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineShuffleTextElement, ShuffleTextElement } from "./ShuffleTextElement";

const nextTask = (): Promise<void> =>
  new Promise((resolve: () => void): void => {
    window.setTimeout(resolve, 0);
  });

const createElement = (): ShuffleTextElement =>
  document.createElement("shuffle-text") as ShuffleTextElement;

beforeEach((): void => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });

  const requestAnimationFrameMock = (callback: FrameRequestCallback): number =>
    window.setTimeout((): void => {
      callback(performance.now());
    }, 0);
  const cancelAnimationFrameMock = (id: number): void => {
    window.clearTimeout(id);
  };

  vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);
});

describe("ShuffleTextElement", (): void => {
  it("registers the default and custom tags", (): void => {
    expect(customElements.get("shuffle-text")).toBe(ShuffleTextElement);

    defineShuffleTextElement("custom-shuffle-text");

    const customElement = document.createElement("custom-shuffle-text");

    expect(customElement).toBeInstanceOf(ShuffleTextElement);
  });

  it("uses light DOM text as the initial text", async (): Promise<void> => {
    const element = createElement();
    element.textContent = "Interface ready";

    document.body.append(element);
    await nextTask();

    expect(element.text).toBe("Interface ready");
    expect(element.textContent).toBe("Interface ready");
  });

  it("updates the public text through setText", async (): Promise<void> => {
    const element = createElement();
    document.body.append(element);
    await nextTask();

    element.setText("New text");

    expect(element.getAttribute("text")).toBe("New text");
    expect(element.text).toBe("New text");
    expect(element.textContent).toBe("New text");
  });

  it("resolves start and dispatches a complete event", async (): Promise<void> => {
    const element = createElement();
    element.setAttribute("text", "Done");
    element.duration = 0;
    document.body.append(element);
    await nextTask();

    const completeHandler = vi.fn();
    element.addEventListener("shuffle-text-complete", completeHandler);

    await element.start();

    expect(element.textContent).toBe("Done");
    expect(element.isRunning).toBe(false);
    expect(completeHandler).toHaveBeenCalledTimes(1);
    expect(completeHandler.mock.calls[0]?.[0]).toMatchObject({
      detail: {
        text: "Done",
      },
    });
  });

  it("skips animation when reduced motion is preferred", async (): Promise<void> => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const element = createElement();
    element.setAttribute("text", "Stable");
    element.duration = 1000;
    document.body.append(element);
    await nextTask();

    await element.start();

    expect(element.textContent).toBe("Stable");
    expect(element.isRunning).toBe(false);
  });

  it("starts autoplay when it enters the viewport by default", async (): Promise<void> => {
    let intersectionCallback: IntersectionObserverCallback | null = null;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const intersectionObserverMock = vi.fn(function (
      this: IntersectionObserver,
      callback: IntersectionObserverCallback,
    ): IntersectionObserver {
      intersectionCallback = callback;
      return {
        observe,
        disconnect,
        root: null,
        rootMargin: "0px",
        thresholds: [0],
        takeRecords: vi.fn().mockReturnValue([]),
        unobserve: vi.fn(),
      };
    });
    vi.stubGlobal("IntersectionObserver", intersectionObserverMock);

    const element = createElement();
    element.setAttribute("text", "Auto");
    element.duration = 0;
    element.autoplay = true;

    const completeHandler = vi.fn();
    element.addEventListener("shuffle-text-complete", completeHandler);

    document.body.append(element);
    await nextTask();

    expect(intersectionObserverMock).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(element);
    expect(completeHandler).not.toHaveBeenCalled();

    const completePromise = new Promise<CustomEvent>(
      (resolve: (event: CustomEvent) => void): void => {
        element.addEventListener("shuffle-text-complete", (event: Event): void => {
          resolve(event as CustomEvent);
        });
      },
    );

    intersectionCallback?.(
      [
        {
          isIntersecting: true,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );

    await expect(completePromise).resolves.toMatchObject({
      detail: {
        text: "Auto",
      },
    });
    expect(disconnect).toHaveBeenCalled();
  });

  it("can autoplay eagerly for load-time reveals", async (): Promise<void> => {
    const element = createElement();
    element.setAttribute("text", "Eager");
    element.duration = 0;
    element.autoplay = true;
    element.autoplayMode = "eager";

    const completePromise = new Promise<CustomEvent>(
      (resolve: (event: CustomEvent) => void): void => {
        element.addEventListener("shuffle-text-complete", (event: Event): void => {
          resolve(event as CustomEvent);
        });
      },
    );

    document.body.append(element);

    await expect(completePromise).resolves.toMatchObject({
      detail: {
        text: "Eager",
      },
    });
  });

  it("can replay every time it re-enters the viewport", async (): Promise<void> => {
    let intersectionCallback: IntersectionObserverCallback | null = null;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (this: IntersectionObserver, callback: IntersectionObserverCallback): IntersectionObserver {
        intersectionCallback = callback;
        return {
          observe,
          disconnect,
          root: null,
          rootMargin: "0px",
          thresholds: [0],
          takeRecords: vi.fn().mockReturnValue([]),
          unobserve: vi.fn(),
        };
      }),
    );

    const element = createElement();
    element.setAttribute("text", "Again");
    element.duration = 0;
    element.replayOnVisible = true;
    const completeHandler = vi.fn();
    element.addEventListener("shuffle-text-complete", completeHandler);

    document.body.append(element);
    await nextTask();

    expect(observe).toHaveBeenCalledWith(element);

    intersectionCallback?.(
      [
        {
          isIntersecting: true,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
    await nextTask();

    intersectionCallback?.(
      [
        {
          isIntersecting: false,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
    intersectionCallback?.(
      [
        {
          isIntersecting: true,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
    await nextTask();

    expect(completeHandler).toHaveBeenCalledTimes(2);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("cleans animation and accessibility state on dispose", async (): Promise<void> => {
    const element = createElement();
    element.setAttribute("text", "Disposable");
    element.duration = 1000;
    document.body.append(element);
    await nextTask();

    const startPromise = element.start();

    expect(element.isRunning).toBe(true);
    expect(element.getAttribute("aria-hidden")).toBe("true");
    expect(element.nextElementSibling?.textContent).toBe("Disposable");

    element.dispose();
    await startPromise;

    expect(element.isRunning).toBe(false);
    expect(element.hasAttribute("aria-hidden")).toBe(false);
    expect(element.nextElementSibling).toBe(null);
  });
});
