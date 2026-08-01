import React, { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { ENV } from "../../../config/env";
import { useTheme } from "../../ThemeProvider";

type TurnstileMessage =
  | { type: "token"; token: string }
  | { type: "expire" }
  | { type: "error"; code?: string }
  | { type: "height"; height: number };

type Props = {
  /** Bump to remount the widget and clear the previous token. */
  resetKey: number;
  onTokenChange: (token: string | null) => void;
};

function originFromWebAppUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Local / tunnel origins are not in the Turnstile hostname allowlist.
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".local")
    ) {
      return "https://www.vericar.pl";
    }
    return parsed.origin;
  } catch {
    return "https://www.vericar.pl";
  }
}

function buildHtml(siteKey: string, theme: "light" | "dark"): string {
  // Keep markup minimal – Auth emails/templates guidance also applies to captcha pages.
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1"
    />
    <script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      async
      defer
    ></script>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: hidden;
      }
      #widget {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 65px;
      }
    </style>
  </head>
  <body>
    <div id="widget"></div>
    <script>
      function post(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
      function boot() {
        if (!window.turnstile) {
          setTimeout(boot, 50);
          return;
        }
        turnstile.render("#widget", {
          sitekey: ${JSON.stringify(siteKey)},
          theme: ${JSON.stringify(theme)},
          size: "flexible",
          callback: function (token) {
            post({ type: "token", token: token });
          },
          "expired-callback": function () {
            post({ type: "expire" });
          },
          "error-callback": function (code) {
            post({ type: "error", code: code });
          },
        });
      }
      boot();
    </script>
  </body>
</html>`;
}

/**
 * Cloudflare Turnstile via WebView (required for native apps).
 * Pass the resulting token to Supabase Auth as `options.captchaToken`.
 */
export function TurnstileCaptcha({ resetKey, onTokenChange }: Props) {
  const { mode } = useTheme();
  const siteKey = ENV.TURNSTILE_SITE_KEY;
  const baseUrl = useMemo(
    () => originFromWebAppUrl(ENV.WEB_APP_URL),
    [],
  );
  const html = useMemo(
    () => (siteKey ? buildHtml(siteKey, mode === "dark" ? "dark" : "light") : ""),
    [siteKey, mode],
  );

  if (!siteKey) return null;

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as TurnstileMessage;
      if (data.type === "token") {
        onTokenChange(data.token);
        return;
      }
      if (data.type === "expire" || data.type === "error") {
        onTokenChange(null);
      }
    } catch {
      // Ignore malformed messages from the WebView.
    }
  };

  return (
    <View style={styles.wrap}>
      <WebView
        key={resetKey}
        originWhitelist={["*"]}
        source={{ html, baseUrl }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={styles.webview}
        // Avoid custom UA – Turnstile relies on consistent browser signals.
        {...(Platform.OS === "android"
          ? { androidLayerType: "hardware" as const }
          : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minHeight: 72,
    overflow: "hidden",
    borderRadius: 8,
  },
  webview: {
    width: "100%",
    height: 72,
    backgroundColor: "transparent",
  },
});
