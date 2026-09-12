import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleChat">;

export function VehicleChatScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <HeaderContentScreen
      onBack={() => navigation.goBack()}
      title={t("vehicleChat.title")}
      subtitle={t("vehicleChat.subtitle")}
    >
      <EmptyState
        title={t("vehicleChat.emptyTitle")}
        body={t("vehicleChat.emptyBody")}
      />
    </HeaderContentScreen>
  );
}
