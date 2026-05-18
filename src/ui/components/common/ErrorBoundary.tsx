import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { Button } from "./Button";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null; retryKey: number };

function ErrorView({ onRetry }: { onRetry: () => void }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        An unexpected error occurred. Please try again.
      </Text>
      <Button onPress={onRetry}>Try again</Button>
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.bg,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
      color: theme.colors.fg,
    },
    message: {
      fontSize: theme.typography.body,
      color: theme.colors.muted,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
  });

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
       
      console.error("ErrorBoundary caught:", error, errorInfo.componentStack);
    }
  }

  retry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorView onRetry={this.retry} />;
    }
    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
