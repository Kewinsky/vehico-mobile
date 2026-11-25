import type { Workshop } from "../../../types/domain";
import type { SearchBarProps } from "../common/SearchBar.types";

export type WorkshopsListProps = {
  workshops: Workshop[];
  search: SearchBarProps;
  onPress: (workshop: Workshop) => void;
  onDelete: (workshop: Workshop) => void;
};
