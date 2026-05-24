import { useEffect, useRef, useState } from "react";

/**
 * Calls `fetcher(query)` after `delayMs` of input quiet time. Earlier in-flight
 * requests are abandoned (their results discarded, not actually cancelled
 * because the existing http client doesn't accept an AbortSignal). Queries
 * shorter than `minLen` clear the state and skip the fetch.
 */
export function useDebouncedAutocomplete<T>(
    query: string,
    fetcher: (q: string) => Promise<T>,
    delayMs = 300,
    minLen = 2,
): { data: T | null; loading: boolean; error: Error | null } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const requestIdRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (query.length < minLen) {
            setData(null);
            setLoading(false);
            setError(null);
            return;
        }

        const myRequestId = ++requestIdRef.current;
        timerRef.current = setTimeout(() => {
            setLoading(true);
            setError(null);
            fetcher(query)
                .then(r => {
                    if (myRequestId === requestIdRef.current) setData(r);
                })
                .catch(e => {
                    if (myRequestId === requestIdRef.current) setError(e);
                })
                .finally(() => {
                    if (myRequestId === requestIdRef.current) setLoading(false);
                });
        }, delayMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [query, delayMs, minLen, fetcher]);

    return { data, loading, error };
}
