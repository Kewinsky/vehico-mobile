import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { NoHeaderLayout } from "../../layouts";
import { AppNavbar } from "../../ui/components/AppNavbar";
import { useTheme } from "../../ui/ThemeProvider";

import {
  Host,
  Button,
  Text,
  VStack,
  TextField,
  Switch,
  Slider,
  Picker,
  CircularProgress,
  LinearProgress,
  Gauge,
  List,
  ContextMenu,
  Section,
  Divider,
  DateTimePicker,
  HStack,
  Spacer,
} from "@expo/ui/swift-ui";

type Props = NativeStackScreenProps<AppStackParamList, "Playground">;

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <RNText style={[styles.sectionLabel, { color: theme.colors.fg }]}>
      {label}
    </RNText>
  );
}

export function PlaygroundScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [segmentedIndex, setSegmentedIndex] = useState<number | null>(0);
  const [wheelIndex, setWheelIndex] = useState<number | null>(0);
  const [, setTextFieldValue] = useState("");
  const [progress] = useState(0.65);

  const segmentedOptions = ["One", "Two", "Three"];
  const wheelOptions = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

  return (
    <NoHeaderLayout>
      <AppNavbar
        title="Expo UI Playground"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Buttons */}
        <SectionLabel label="Buttons" />
        <Host matchContents style={styles.host}>
          <VStack spacing={12}>
            <Button variant="default" onPress={() => {}}>
              Default Button
            </Button>
            <Button variant="bordered" onPress={() => {}}>
              Bordered
            </Button>
            <Button variant="borderedProminent" onPress={() => {}}>
              Bordered Prominent
            </Button>
            <Button variant="plain" onPress={() => {}}>
              Plain
            </Button>
          </VStack>
        </Host>

        {/* Text */}
        <SectionLabel label="Text" />
        <Host matchContents style={styles.host}>
          <VStack spacing={4}>
            <Text>Hello from SwiftUI Text</Text>
            <Text>Secondary line</Text>
          </VStack>
        </Host>

        {/* TextField */}
        <SectionLabel label="TextField" />
        <Host matchContents style={styles.host}>
          <TextField
            placeholder="Type here..."
            defaultValue=""
            onChangeText={setTextFieldValue}
          />
        </Host>

        {/* Switch (Toggle & Checkbox) */}
        <SectionLabel label="Switch (Toggle & Checkbox)" />
        <Host matchContents style={styles.host}>
          <VStack spacing={12}>
            <Switch
              variant="switch"
              value={switchValue}
              label="Toggle"
              onValueChange={setSwitchValue}
            />
            <Switch
              variant="checkbox"
              value={checkboxValue}
              label="Checkbox"
              onValueChange={setCheckboxValue}
            />
          </VStack>
        </Host>

        {/* Slider */}
        <SectionLabel label="Slider" />
        <Host matchContents style={styles.host}>
          <VStack spacing={8}>
            <Text>Value: {(sliderValue * 100).toFixed(0)}%</Text>
            <Slider
              value={sliderValue}
              min={0}
              max={1}
              onValueChange={setSliderValue}
            />
          </VStack>
        </Host>

        {/* Picker — Segmented */}
        <SectionLabel label="Picker (Segmented)" />
        <Host matchContents style={styles.host}>
          <Picker
            options={segmentedOptions}
            selectedIndex={segmentedIndex}
            variant="segmented"
            onOptionSelected={(e) =>
              setSegmentedIndex(e.nativeEvent.index)
            }
          />
        </Host>

        {/* Picker — Wheel (iOS) */}
        {Platform.OS === "ios" && (
          <>
            <SectionLabel label="Picker (Wheel)" />
            <Host matchContents style={[styles.host, { minHeight: 120 }]}>
              <Picker
                options={wheelOptions}
                selectedIndex={wheelIndex}
                variant="wheel"
                onOptionSelected={(e) => setWheelIndex(e.nativeEvent.index)}
              />
            </Host>
          </>
        )}

        {/* Progress */}
        <SectionLabel label="Circular & Linear Progress" />
        <Host matchContents style={styles.host}>
          <VStack spacing={16}>
            <HStack spacing={12} alignment="center">
              <CircularProgress progress={progress} color={theme.colors.accent} />
              <Text>{(progress * 100).toFixed(0)}%</Text>
            </HStack>
            <LinearProgress progress={progress} color={theme.colors.accent} />
          </VStack>
        </Host>

        {/* Gauge (iOS) */}
        {Platform.OS === "ios" && (
          <>
            <SectionLabel label="Gauge" />
            <Host matchContents style={[styles.host, { minHeight: 80 }]}>
              <Gauge
                label="Capacity"
                type="linear"
                current={{ value: 0.7, label: "70%" }}
                min={{ value: 0 }}
                max={{ value: 1, label: "100%" }}
                color={theme.colors.accent}
              />
            </Host>
          </>
        )}

        {/* List */}
        <SectionLabel label="List" />
        <Host style={[styles.host, { height: 160 }]}>
          <List listStyle="insetGrouped" scrollEnabled={true}>
            <Text>List item 1</Text>
            <Text>List item 2</Text>
            <Text>List item 3</Text>
            <Text>List item 4</Text>
          </List>
        </Host>

        {/* Section */}
        <SectionLabel label="Section" />
        <Host style={[styles.host, { minHeight: 120 }]}>
          <Section title="Sample Section">
            <Text>Content inside a native Section</Text>
            <Spacer />
            <Button variant="bordered" onPress={() => {}}>
              Action
            </Button>
          </Section>
        </Host>

        {/* Context Menu */}
        <SectionLabel label="Context Menu" />
        <Host matchContents style={styles.host}>
          <ContextMenu activationMethod="longPress">
            <ContextMenu.Trigger>
              <Button variant="bordered" onPress={() => {}}>
                Long-press for menu
              </Button>
            </ContextMenu.Trigger>
            <ContextMenu.Items>
              <Button onPress={() => {}}>Copy</Button>
              <Button onPress={() => {}}>Share</Button>
              <Button role="destructive" onPress={() => {}}>
                Delete
              </Button>
            </ContextMenu.Items>
          </ContextMenu>
        </Host>

        {/* Divider */}
        <SectionLabel label="Divider" />
        <Host matchContents style={styles.host}>
          <VStack spacing={8}>
            <Text>Above</Text>
            <Divider />
            <Text>Below</Text>
          </VStack>
        </Host>

        {/* Date Time Picker (iOS) */}
        {Platform.OS === "ios" && (
          <>
            <SectionLabel label="DateTimePicker" />
            <Host matchContents style={[styles.host, { minHeight: 200 }]}>
              <DateTimePicker
                displayedComponents="date"
                onDateSelected={() => {}}
              />
            </Host>
          </>
        )}
      </ScrollView>
    </NoHeaderLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
    gap: 24,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  host: {
    minHeight: 44,
  },
});
