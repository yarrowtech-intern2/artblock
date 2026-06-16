const RETRY_FLAG = "artblock:route-chunk-reload";

const isChunkLoadError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return [
    "Failed to fetch dynamically imported module",
    "Importing a module script failed",
    "error loading dynamically imported module",
    "Failed to fetch"
  ].some((fragment) => error.message.includes(fragment));
};

const tryRecoverChunkLoad = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const hasRetried = window.sessionStorage.getItem(RETRY_FLAG) === "1";

  if (hasRetried) {
    window.sessionStorage.removeItem(RETRY_FLAG);
    return false;
  }

  window.sessionStorage.setItem(RETRY_FLAG, "1");
  window.location.reload();
  return true;
};

export const lazyRoute = <TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  importer: () => Promise<TModule>,
  exportName: TKey
) => {
  return async () => {
    try {
      const module = await importer();

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(RETRY_FLAG);
      }

      return {
        Component: module[exportName] as TModule[TKey]
      };
    } catch (error) {
      if (isChunkLoadError(error) && tryRecoverChunkLoad()) {
        return new Promise<never>(() => undefined);
      }

      throw error;
    }
  };
};
