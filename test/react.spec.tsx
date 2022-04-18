import React, { useEffect, useRef, useState } from "react";
import { act, render } from "@testing-library/react";

import { createProvider } from "../src/react";
import { WTEventParams } from "../src/client";

type TestParams = WTEventParams & { name?: "Friedrich" | "Albert" | "Baruch" };
const track = jest.fn<any, [TestParams]>();

let validate = (params: any) => true;

const { WTProvider, useTrack, useWT } = createProvider(track, {
  validateEvent: (params) => validate(params),
});

const Track: React.FC<{
  callParams?: WTEventParams;
  hookParams?: WTEventParams;
}> = ({ callParams = {}, hookParams = {} }) => {
  const track = useTrack(hookParams);
  track(callParams);
  return null;
};

const muteConsoleErrors = (execute: () => any) => {
  // React logs errors in addition to throwing
  const consoleErrorFn = jest
    .spyOn(console, "error")
    .mockImplementation(() => jest.fn());
  execute();
  consoleErrorFn.mockRestore();
};

describe("WTProvider + Context", () => {
  const receiveContext = jest.fn<any, any>();
  const ExposeContextValue: React.FC = () => {
    const value = useWT();
    receiveContext(value);
    return null;
  };

  it("passes provided params", () => {
    render(
      <WTProvider params={{ name: "Albert" }}>
        <ExposeContextValue />
      </WTProvider>
    );

    expect(receiveContext).toBeCalledWith({
      track: expect.anything(),
      params: { name: "Albert" },
    });
  });

  it("supports overriding params", () => {
    render(
      <WTProvider params={{ name: "Albert" }}>
        <WTProvider params={{ name: "Friedrich" }}>
          <ExposeContextValue />
        </WTProvider>
      </WTProvider>
    );

    expect(receiveContext).toBeCalledWith({
      track: expect.anything(),
      params: { name: "Friedrich" },
    });
  });

  it("supports merging params", () => {
    render(
      <WTProvider params={{ pageName: "home" }}>
        <WTProvider params={{ name: "Albert" }}>
          <WTProvider params={{ container: "inner" }}>
            <ExposeContextValue />
          </WTProvider>
        </WTProvider>
      </WTProvider>
    );

    expect(receiveContext).toBeCalledWith({
      track: expect.anything(),
      params: { pageName: "home", name: "Albert", container: "inner" },
    });
  });

  it("does not throw when context is accessed without a provider", () => {
    const Fixture = () => {
      useWT();
      return null;
    };
    expect(() => render(<Fixture />)).not.toThrow();
  });

  it("throws when attempting to track without a provider", () => {
    muteConsoleErrors(() => {
      const Fixture = () => {
        const { track } = useWT();
        track();
        return null;
      };
      expect(() => render(<Fixture />)).toThrow();
    });
  });
});

describe("useWT", () => {
  it("exposes params", () => {
    let params;
    const Fixture = () => {
      params = useWT().params;
      return null;
    };
    render(<Fixture />);
    expect(params).toEqual({});
  });

  it("exposes a track function", () => {
    let track;
    const Fixture = () => {
      track = useWT().track;
      return null;
    };
    render(<Fixture />);
    expect(track).toBeInstanceOf(Function);
  });
});

describe("useTrack", () => {
  it("calls the track function with context params", () => {
    render(
      <WTProvider params={{ name: "Friedrich" }}>
        <Track />
      </WTProvider>
    );
    expect(track).toHaveBeenCalledWith({ name: "Friedrich" });
  });

  it("overrides context params with values passed to the hook", () => {
    render(
      <WTProvider params={{ name: "Friedrich" }}>
        <Track hookParams={{ name: "Albert" }} />
      </WTProvider>
    );
    expect(track).toHaveBeenCalledWith({ name: "Albert" });
  });

  it("overrides hook params with values passed to the track function", () => {
    render(
      <WTProvider params={{ name: "Friedrich" }}>
        <Track
          hookParams={{ name: "Albert" }}
          callParams={{ name: "Baruch" }}
        />
      </WTProvider>
    );
    expect(track).toHaveBeenCalledWith({ name: "Baruch" });
  });

  it("returns a stable function", async () => {
    const TrackOnRender = () => {
      const track = useTrack();
      const [count, setState] = useState(0);

      useEffect(() => {
        track({ position: count });
      }, [track]);

      return (
        <>
          <button onClick={() => setState((s) => s + 1)}>Render</button>
        </>
      );
    };

    const x = render(
      <WTProvider params={{}}>
        <TrackOnRender />
      </WTProvider>
    );

    const trigger = await x.findByRole("button");
    act(() => trigger.click());

    expect(track).toBeCalledTimes(1);
  });
});

describe("validating events", () => {
  it("does not track events when validate returns false", () => {
    validate = () => false;

    render(
      <WTProvider params={{ name: "Friedrich" }}>
        <Track />
      </WTProvider>
    );

    expect(track).not.toHaveBeenCalled();
  });

  it("allows throwing errors from validate", () => {
    muteConsoleErrors(() => {
      validate = () => {
        throw new Error("Params are not valid!");
      };

      expect(() =>
        render(
          <WTProvider params={{ name: "Friedrich" }}>
            <Track />
          </WTProvider>
        )
      ).toThrowError("Params are not valid!");
    });
  });
});
