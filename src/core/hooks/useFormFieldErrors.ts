import { useCallback, useEffect, useState } from "react";

export function useFormFieldErrors(canSave: boolean) {
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  useEffect(() => {
    if (showFieldErrors && canSave) setShowFieldErrors(false);
  }, [showFieldErrors, canSave]);

  const fieldError = useCallback(
    (invalid: boolean) => showFieldErrors && invalid,
    [showFieldErrors],
  );

  const validateBeforeSave = useCallback(() => {
    if (canSave) return true;
    setShowFieldErrors(true);
    return false;
  }, [canSave]);

  const resetFieldErrors = useCallback(() => setShowFieldErrors(false), []);

  return { fieldError, validateBeforeSave, resetFieldErrors };
}
