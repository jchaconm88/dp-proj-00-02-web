import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

interface LoadingContextValue {
  /** Señala que una operación de carga comenzó. */
  start: () => void;
  /** Señala que una operación de carga terminó. */
  stop: () => void;
  /** true si alguna operación está en curso. */
  loading: boolean;
}

const LoadingContext = createContext<LoadingContextValue>({
  start: () => {},
  stop: () => {},
  loading: false,
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  // Contador de operaciones en curso (permite llamadas anidadas/concurrentes)
  const countRef = useRef(0);
  const [loading, setLoading] = useState(false);

  const start = useCallback(() => {
    countRef.current += 1;
    setLoading(true);
  }, []);

  const stop = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) setLoading(false);
  }, []);

  const value = useMemo(() => ({ start, stop, loading }), [start, stop, loading]);

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

/** Hook para reportar carga de datos desde cualquier componente. */
export function useGlobalLoading() {
  return useContext(LoadingContext);
}
