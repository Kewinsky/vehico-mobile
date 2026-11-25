import { useTranslation } from "react-i18next";

import { ContentHeader } from "../layout/ContentHeader";
import { SearchBar } from "../common/SearchBar";
import { EmptyState } from "../common/EmptyState";
import { CustomFlatList } from "./CustomFlatList";
import { WorkshopItem } from "./WorkshopItem";
import type { WorkshopsListProps } from "./WorkshopsList.types";

export function WorkshopsList({
  workshops,
  search,
  onPress,
  onDelete,
}: WorkshopsListProps) {
  const { t } = useTranslation();

  return (
    <CustomFlatList
      contentInsetAdjustmentBehavior="automatic"
      data={workshops}
      listHeaderComponent={
        <>
          <ContentHeader title={t("workshops.title")} />
          <SearchBar {...search} />
        </>
      }
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <WorkshopItem
          workshop={item}
          callLabel={t("workshops.call")}
          navigateLabel={t("workshops.navigate")}
          deleteLabel={t("common.delete")}
          onDelete={() => onDelete(item)}
          onPress={() => onPress(item)}
        />
      )}
      ListEmptyComponent={<EmptyState body={t("workshops.noWorkshops")} />}
    />
  );
}
