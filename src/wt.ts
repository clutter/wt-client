import { createProvider } from "./react";
import wt, { WTEventParams } from "./client";

const { WTProvider, useTrack, useWT } = createProvider(
  (params: WTEventParams) => wt.track(params)
);

export default wt;
export * from "./client";
export { WTProvider, useTrack, useWT, createProvider };
