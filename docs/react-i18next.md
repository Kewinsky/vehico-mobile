# react-i18next

## Introduction

react-i18next is a powerful internationalization framework for React applications built on top of the i18next ecosystem. It provides a comprehensive solution for managing translations in React apps, supporting both functional components with hooks and class-based components with higher-order components. The library seamlessly integrates with React's component lifecycle and context system to deliver dynamic language switching, lazy-loading of translations, and server-side rendering support.

The library follows React best practices by leveraging hooks like useTranslation for functional components, providing Trans components for complex JSX translations with embedded components, and supporting Suspense for asynchronous translation loading. It works across different React environments including web applications, React Native mobile apps, and server-side rendered frameworks like Next.js. With built-in TypeScript support, namespace management, and integration with translation management services, react-i18next offers a complete solution for building multilingual applications.

## APIs and Key Functions

### useTranslation Hook

React hook for accessing translation functions and i18n instance in functional components. Returns a tuple with the translation function, i18n instance, and ready state.

```javascript
import React from "react";
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t, i18n, ready } = useTranslation("common", {
    keyPrefix: "welcome",
    useSuspense: false,
  });

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  if (!ready) {
    return <div>Loading translations...</div>;
  }

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("message", { name: "John", count: 5 })}</p>
      <p>Current language: {i18n.language}</p>
      <button onClick={() => changeLanguage("de")}>Deutsch</button>
      <button onClick={() => changeLanguage("en")}>English</button>
    </div>
  );
}
```

### Trans Component

Component for rendering translations with embedded React components and HTML elements, preserving JSX structure in translations.

```javascript
import React from "react";
import { Trans } from "react-i18next";
import { Link } from "react-router-dom";

function WelcomeMessage() {
  const userName = "Alice";
  const messageCount = 3;

  return (
    <div>
      <Trans
        i18nKey="userMessagesUnread"
        count={messageCount}
        values={{ name: userName, count: messageCount }}
        defaults="Hello <strong>{{name}}</strong>, you have {{count}} unread message. <link>Go to messages</link>."
        components={{
          strong: <strong title="User name" />,
          link: <Link to="/messages" />,
        }}
      />
    </div>
  );
}

// Translation file (en/translation.json):
// {
//   "userMessagesUnread": "Hello <strong>{{name}}</strong>, you have {{count}} unread message.",
//   "userMessagesUnread_plural": "Hello <strong>{{name}}</strong>, you have {{count}} unread messages."
// }
```

### initReactI18next Plugin

i18next plugin that initializes react-i18next integration, must be passed to i18next's use() method during initialization.

```javascript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: true,
    defaultNS: "translation",
    ns: ["translation", "common", "errors"],
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["querystring", "cookie", "localStorage", "navigator"],
      caches: ["localStorage", "cookie"],
    },
  });

export default i18n;
```

### I18nextProvider Component

React Context Provider for making i18n instance available throughout the component tree, enabling access to translations without prop drilling.

```javascript
import React from "react";
import ReactDOM from "react-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import App from "./App";

ReactDOM.render(
  <I18nextProvider i18n={i18n} defaultNS="translation">
    <App />
  </I18nextProvider>,
  document.getElementById("root")
);

// Child component can now use useTranslation without passing i18n
function ChildComponent() {
  const { t } = useTranslation();
  return <div>{t("key")}</div>;
}
```

### withTranslation HOC

Higher-order component for adding translation functionality to class-based components, injecting t, i18n, and tReady props.

```javascript
import React, { Component } from "react";
import { withTranslation } from "react-i18next";

class LegacyComponent extends Component {
  componentDidMount() {
    console.log("Current language:", this.props.i18n.language);
  }

  handleLanguageChange = (lng) => {
    this.props.i18n.changeLanguage(lng);
  };

  render() {
    const { t, tReady } = this.props;

    if (!tReady) {
      return <div>Loading...</div>;
    }

    return (
      <div>
        <h1>{t("title")}</h1>
        <p>{t("description", { count: 5 })}</p>
        <button onClick={() => this.handleLanguageChange("fr")}>
          {t("switchToFrench")}
        </button>
      </div>
    );
  }
}

export default withTranslation("common", {
  keyPrefix: "settings",
  withRef: true,
})(LegacyComponent);
```

### Translation Render Prop Component

Component using render props pattern for accessing translation functions, useful for dynamic rendering scenarios.

```javascript
import React from "react";
import { Translation } from "react-i18next";

function DynamicContent() {
  return (
    <Translation ns={["common", "errors"]}>
      {(t, { i18n, lng }, ready) => {
        if (!ready) return <p>Loading...</p>;

        const items = ["apple", "banana", "orange"];

        return (
          <div>
            <h2>{t("common:fruits.title")}</h2>
            <ul>
              {items.map((item) => (
                <li key={item}>{t(`common:fruits.${item}`)}</li>
              ))}
            </ul>
            <p>
              {t("common:currentLanguage")}: {lng}
            </p>
            <button onClick={() => i18n.changeLanguage("es")}>
              {t("common:switchLanguage")}
            </button>
          </div>
        );
      }}
    </Translation>
  );
}
```

### IcuTrans Component

Component for rendering ICU MessageFormat translations with complex pluralization, selects, and nested component support.

```javascript
import React from "react";
import { IcuTrans } from "react-i18next";

function IcuExample() {
  const userCount = 42;
  const gender = "female";

  return (
    <div>
      <IcuTrans
        i18nKey="complexMessage"
        defaultTranslation="Welcome <0>{gender, select, male {Mr.} female {Ms.} other {}} {name}</0>! You have <1>{count, plural, =0 {no messages} one {# message} other {# messages}}</1>."
        content={[
          { type: "strong", props: {} },
          { type: "span", props: { className: "badge" } },
        ]}
        values={{
          name: "Sarah",
          gender: gender,
          count: userCount,
        }}
        ns="common"
      />
    </div>
  );
}

// Translation file (en/common.json):
// {
//   "complexMessage": "Welcome <0>{gender, select, male {Mr.} female {Ms.} other {}} {name}</0>! You have <1>{count, plural, =0 {no messages} one {# message} other {# messages}}</1>."
// }
```

### withSSR HOC

Higher-order component for server-side rendering support, enabling initial translation loading on the server.

```javascript
import React, { Component } from "react";
import { withSSR } from "react-i18next";

class MyPage extends Component {
  static async getInitialProps(ctx) {
    // Custom page logic
    const data = await fetchData();
    return { data };
  }

  render() {
    return (
      <div>
        <h1>{this.props.t("title")}</h1>
        <p>{this.props.data.content}</p>
      </div>
    );
  }
}

// Wrap component with SSR support
export default withSSR()(MyPage);

// On the server, translations are loaded and passed to client:
// {
//   initialI18nStore: {
//     en: { translation: {...}, common: {...} },
//     de: { translation: {...}, common: {...} }
//   },
//   initialLanguage: 'en'
// }
```

### useSSR Hook

Hook for hydrating server-side rendered translations on the client, preventing translation mismatches.

```javascript
import React from "react";
import { useSSR, useTranslation } from "react-i18next";

function ServerRenderedComponent({ initialI18nStore, initialLanguage }) {
  useSSR(initialI18nStore, initialLanguage);
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("serverRendered.title")}</h1>
      <p>{t("serverRendered.description")}</p>
    </div>
  );
}

// Example with Next.js
export async function getServerSideProps({ locale }) {
  return {
    props: {
      initialI18nStore: {
        [locale]: {
          translation: await import(`../locales/${locale}/translation.json`),
        },
      },
      initialLanguage: locale,
    },
  };
}

export default ServerRenderedComponent;
```

### ICU Macro Functions

Babel macro functions for compile-time ICU MessageFormat transformations, providing type-safe pluralization and formatting.

```javascript
import { Trans } from "react-i18next/icu.macro";
import { plural, select, date, time, number } from "react-i18next/icu.macro";

function MacroExample() {
  const count = 5;
  const gender = "female";
  const currentDate = new Date();
  const price = 1234.56;

  return (
    <div>
      {/* Plural macro */}
      <Trans i18nKey="items">
        {plural`You have ${count} ${count === 1 ? "item" : "items"}`}
      </Trans>

      {/* Select macro */}
      <p>
        {select`${gender} ${
          gender === "male" ? "He" : gender === "female" ? "She" : "They"
        } completed the task`}
      </p>

      {/* Date/Time/Number formatting */}
      <p>Date: {date`${currentDate}`}</p>
      <p>Time: {time`${currentDate}`}</p>
      <p>Price: {number`${price}`}</p>

      {/* Component-based pluralization */}
      <Plural
        i18nKey="messages.count"
        count={count}
        zero="No messages"
        one="One message"
        other={`${count} messages`}
      />
    </div>
  );
}
```

### Complete Application Setup

Full example showing initialization, provider setup, and usage across different component types with proper error handling.

```javascript
// i18n.js - Configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    defaultNS: 'translation',
    ns: ['translation', 'common'],
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i']
    }
  });

export default i18n;

// App.js - Root component
import React, { Suspense } from 'react';
import { I18nextProvider, useTranslation, Trans } from 'react-i18next';
import i18n from './i18n';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div>
      {['en', 'de', 'fr', 'es'].map(lng => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          disabled={i18n.language === lng}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Content() {
  const { t, ready } = useTranslation(['translation', 'common'], {
    useSuspense: false
  });

  if (!ready) return <div>Loading translations...</div>;

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <Trans
        i18nKey="welcome.description"
        values={{ appName: 'MyApp' }}
        components={{
          bold: <strong />,
          link: <a href="/docs" />
        }}
      />
      <p>{t('common:status.online')}</p>
    </div>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<div>Loading...</div>}>
        <LanguageSwitcher />
        <Content />
      </Suspense>
    </I18nextProvider>
  );
}

export default App;

// Translation files:
// locales/en/translation.json
// {
//   "welcome": {
//     "title": "Welcome to our application",
//     "description": "Start using <bold>{{appName}}</bold> today! <link>Read documentation</link>"
//   }
// }

// locales/en/common.json
// {
//   "status": {
//     "online": "System is online",
//     "offline": "System is offline"
//   }
// }
```

## Summary and Integration Patterns

react-i18next is designed for comprehensive internationalization in React applications, supporting common use cases like user-facing web applications with dynamic language switching, mobile apps built with React Native, server-side rendered applications using Next.js or similar frameworks, and content management systems with multilingual support. The library handles complex scenarios including lazy-loading translations to reduce initial bundle size, pluralization rules across different languages, context-based translations for gender or formality, and integration with translation management platforms like locize. It provides robust error handling with fallback languages, loading states, and missing translation detection during development.

Integration patterns follow React conventions: use the I18nextProvider at the application root to make i18n available via context, leverage useTranslation hook in functional components for simple key-value translations, utilize Trans component when translations contain React components or HTML structure, and apply withTranslation HOC for legacy class components. For server-side rendering, combine withSSR and useSSR to ensure translations are hydrated correctly. The library supports namespace organization for large applications, allowing feature-specific translation files that load on demand. TypeScript users benefit from full type safety with namespace and key autocomplete, while the ICU macro enables compile-time optimization for complex message formats. Configuration is flexible through i18next's plugin system, supporting various backends (HTTP, local storage, bundled JSON), language detection strategies (browser, cookie, path), and custom interpolation or formatting functions.
