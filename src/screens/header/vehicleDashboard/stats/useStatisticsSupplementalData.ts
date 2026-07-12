import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { listMileageAudit } from "../../../../services/mileage/mileageAuditRepo";
import { listWorkshops } from "../../../../services/workshops/workshopsRepo";
import type { MileageAudit, Workshop } from "../../../../types/domain";
import { toastError } from "../../../../ui/toast/toast";
import { getErrorMessage } from "../../../../utils/errorMessage";
import { withTimeout } from "../../../../utils/withTimeout";

type SupplementalData = {
  mileageAudit: MileageAudit[];
  workshopsById: Record<string, Workshop>;
};

const EMPTY_DATA: SupplementalData = {
  mileageAudit: [],
  workshopsById: {},
};

export function useStatisticsSupplementalData(vehicleId: string) {
  const { t } = useTranslation();
  const [data, setData] = useState<SupplementalData>(EMPTY_DATA);
  const loadInFlightRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    if (!vehicleId || loadInFlightRef.current) return;

    loadInFlightRef.current = true;
    try {
      const [auditResult, workshopsResult] = await withTimeout(
        Promise.allSettled([listMileageAudit(vehicleId), listWorkshops()]),
        15000,
        "useStatisticsSupplementalData.load",
      );

      setData((prev) => {
        const mileageAudit =
          auditResult.status === "fulfilled" ? auditResult.value : prev.mileageAudit;
        const workshopsById =
          workshopsResult.status === "fulfilled"
            ? workshopsResult.value.reduce<Record<string, Workshop>>(
                (acc, workshop) => {
                  acc[workshop.id] = workshop;
                  return acc;
                },
                {},
              )
            : prev.workshopsById;

        if (
          mileageAudit === prev.mileageAudit &&
          workshopsById === prev.workshopsById
        ) {
          return prev;
        }

        return { mileageAudit, workshopsById };
      });

      if (auditResult.status === "rejected") {
        console.error(
          "useStatisticsSupplementalData mileage audit failed:",
          auditResult.reason,
        );
      }
      if (workshopsResult.status === "rejected") {
        console.error(
          "useStatisticsSupplementalData workshops failed:",
          workshopsResult.reason,
        );
      }
      if (
        auditResult.status === "rejected" &&
        workshopsResult.status === "rejected"
      ) {
        toastError(tRef.current("common.error"));
      }
    } catch (error: unknown) {
      console.error("useStatisticsSupplementalData.load failed:", error);
      toastError(getErrorMessage(error, tRef.current("common.error")));
    } finally {
      loadInFlightRef.current = false;
    }
  }, [vehicleId]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      void loadRef.current();
    }, []),
  );

  return data;
}
