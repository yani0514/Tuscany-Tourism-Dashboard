import { useEffect, useState, useRef } from "react";

export default function useAPI(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    fetcher()
      .then((d) => mounted.current && setData(d))
      .catch((e) => mounted.current && setError(e))
      .finally(() => mounted.current && setLoading(false));

    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh: () => fetcher().then(setData).catch(setError) };
}
