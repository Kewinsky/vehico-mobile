/**
 * Races a promise against a timeout so a single hanging network call
 * (e.g. a stalled request) can never leave the UI stuck in a loading
 * state forever.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          label ? `Timed out after ${ms}ms: ${label}` : `Timed out after ${ms}ms`,
        ),
      );
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
