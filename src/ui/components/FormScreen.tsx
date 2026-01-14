import type { PropsWithChildren, ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeProvider';

export function FormScreen({
  children,
  padding = true,
  header,
}: PropsWithChildren<{ padding?: boolean; header?: ReactNode }>) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {header}
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
          style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + (header ? 52 : 0)}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: padding ? theme.spacing.md : 0,
            paddingBottom: insets.bottom + theme.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
    </View>
  );
}

