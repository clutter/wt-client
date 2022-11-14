import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { WTEventParams } from './client';

type ContextValue<Params = Record<string, any>> = {
  params: React.RefObject<Partial<Params>>;
  track: (overrides?: Partial<Params>) => void;
};

type Options<Params> = {
  validateEvent?: (params: Partial<Params>) => boolean;
};

export const createProvider = <
  Params extends Record<string | number, any> = WTEventParams
>(
  track: (params: Params) => void,
  { validateEvent }: Options<Params> = {}
) => {
  const WTContext = React.createContext<ContextValue<Params>>({
    params: { current: {} },
    track: () => {
      throw new Error('No WTProvider found');
    },
  });

  const WTProvider: React.FC<{
    children: React.ReactNode;
    params?: Partial<Params>;
  }> = ({ params = {}, children }) => {
    const paramRef = useRef(params);
    const { params: parentParams } = useContext(WTContext);

    paramRef.current = { ...parentParams.current, ...params };

    const localTrack = useCallback((overrides?: Partial<Params>) => {
      const trackedParams = {
        ...paramRef.current,
        ...overrides,
      };
      if (!validateEvent || validateEvent(trackedParams)) {
        track(trackedParams as Params);
      }
    }, []);

    const contextValue = useMemo(
      () => ({
        track: localTrack,
        params: paramRef,
      }),
      [localTrack]
    );

    return (
      <WTContext.Provider value={contextValue}>{children}</WTContext.Provider>
    );
  };

  const useTrack = (defaultParams: Partial<Params> = {}) => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { track } = useContext(WTContext);
    const paramsRef = useRef(defaultParams);

    useEffect(() => {
      paramsRef.current = defaultParams;
    });

    return useCallback(
      (params: Partial<Params>) => track({ ...paramsRef.current, ...params }),
      [track]
    );
  };

  const useWT = () => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { track, params } = useContext(WTContext);

    return {
      track,
      params: params.current,
    };
  };

  return { WTProvider, useWT, useTrack };
};
