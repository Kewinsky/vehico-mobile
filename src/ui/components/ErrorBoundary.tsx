import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null; retryKey: number };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
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
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. Please try again.
          </Text>
          <Button onPress={this.retry}>Try again</Button>
        </View>
      );
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  message: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
});
