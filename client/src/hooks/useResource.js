import { useEffect, useState } from "react";
import axios from "axios";

// Callers memoize load with useCallback. Cancel obsolete requests on navigation.
export default function useResource(load) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    Promise.resolve().then(() => load(controller.signal)).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      },
      (error) => {
        if (!controller.signal.aborted && !axios.isCancel(error)) setState({ data: null, loading: false, error });
      }
    );
    return () => controller.abort();
  }, [load, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
