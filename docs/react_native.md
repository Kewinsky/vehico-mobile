# React Native

React Native is a framework for building native mobile applications using JavaScript and React. It brings React's declarative UI framework to iOS and Android platforms, allowing developers to write cross-platform mobile apps using a single codebase while maintaining native performance and platform-specific behavior. React Native renders to native platform primitives (UIView on iOS, android.view on Android), ensuring apps have authentic native look-and-feel rather than hybrid web views. The framework requires Node.js 14 or higher (recommended Node.js 16) and supports React 18.1.0, targeting iOS 12.4+ and Android 5.0 (API 21) or newer.

The framework provides a comprehensive set of core components (View, Text, Image, ScrollView, FlatList), platform APIs (Linking, Share, Alert), animation capabilities (Animated API), networking utilities (Fetch API), and device-specific features. React Native uses a JavaScript runtime to execute application logic while communicating with native modules through a bridge for performance-critical operations. The monorepo structure includes the core react-native package, build tools (Metro bundler 0.72.3, Babel presets), testing utilities (rn-tester), and platform-specific native code for iOS (Objective-C/Swift) and Android (Java/Kotlin).

## Core Components

### View Component

Basic container component supporting layout with flexbox, styling, touch handling, and accessibility features.

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const App = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text>Header</Text>
      </View>
      <View style={styles.content}>
        <Text>Main Content</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  content: {
    flex: 1,
    padding: 20,
  },
});

export default App;
```

### Text Component

Component for displaying text with platform-specific typography features and styling.

```javascript
import React from "react";
import { Text, StyleSheet, View } from "react-native";

const TextExample = () => {
  return (
    <View>
      <Text style={styles.title}>Welcome to React Native</Text>
      <Text style={styles.body}>
        This is a <Text style={styles.bold}>bold</Text> word and this is{" "}
        <Text style={styles.italic}>italic</Text>.
      </Text>
      <Text numberOfLines={2} ellipsizeMode="tail">
        This is a very long text that will be truncated after two lines with an
        ellipsis at the end to indicate there is more content.
      </Text>
      <Text selectable={true}>This text can be selected and copied</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
});
```

### Image Component

Component for displaying images from local files, network URLs, or base64 data with loading states and caching.

```javascript
import React, { useState, useEffect } from "react";
import { Image, View, StyleSheet, Text, ActivityIndicator } from "react-native";

const ImageExample = () => {
  const [imageSize, setImageSize] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get image dimensions before loading
    Image.getSize(
      "https://reactnative.dev/img/tiny_logo.png",
      (width, height) => {
        setImageSize({ width, height });
        console.log(`Image size: ${width}x${height}`);
      },
      (error) => {
        console.error("Failed to get image size:", error);
      }
    );

    // Prefetch image for better performance
    Image.prefetch("https://reactnative.dev/img/tiny_logo.png").then(
      (success) => {
        console.log("Image prefetched successfully");
      }
    );
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("./assets/local-image.png")}
        style={styles.localImage}
      />
      <Image
        source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
        style={styles.networkImage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        resizeMode="contain"
      />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {imageSize && (
        <Text>
          Image dimensions: {imageSize.width}x{imageSize.height}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  localImage: {
    width: 100,
    height: 100,
    margin: 10,
  },
  networkImage: {
    width: 200,
    height: 200,
    margin: 10,
  },
});
```

### FlatList Component

High-performance list component with built-in virtualization for rendering large datasets efficiently.

```javascript
import React, { useState } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";

const FlatListExample = () => {
  const [data, setData] = useState(
    Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      description: `Description for item ${i}`,
      selected: false,
    }))
  );
  const [refreshing, setRefreshing] = useState(false);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.item, item.selected && styles.itemSelected]}
      onPress={() => handlePress(item.id)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </TouchableOpacity>
  );

  const handlePress = (id) => {
    setData((prevData) =>
      prevData.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData((prevData) => [...prevData].reverse());
      setRefreshing(false);
    }, 1500);
  };

  const ItemSeparator = () => <View style={styles.separator} />;

  const ListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>My List Header</Text>
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      <Text>End of list</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text>No items to display</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      ListEmptyComponent={ListEmpty}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={() => console.log("Reached end of list")}
      onEndReachedThreshold={0.5}
      getItemLayout={(data, index) => ({
        length: 80,
        offset: 80 * index,
        index,
      })}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: "#f5f5f5",
  },
  item: {
    padding: 20,
    backgroundColor: "white",
    height: 80,
  },
  itemSelected: {
    backgroundColor: "#e3f2fd",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  header: {
    padding: 20,
    backgroundColor: "#2196f3",
  },
  headerText: {
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
});
```

### ScrollView Component

Wrapper component for scrollable content with support for horizontal/vertical scrolling and event handling.

```javascript
import React, { useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Button,
  Animated,
} from "react-native";

const ScrollViewExample = () => {
  const scrollViewRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Button title="Scroll to Top" onPress={scrollToTop} />
        <Button title="Scroll to Bottom" onPress={scrollToBottom} />
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {Array.from({ length: 50 }, (_, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemText}>Item {i + 1}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  item: {
    padding: 20,
    backgroundColor: "#e0e0e0",
    marginBottom: 10,
    borderRadius: 5,
  },
  itemText: {
    fontSize: 16,
  },
});
```

### TextInput Component

Input component for text entry with platform-specific keyboard types, validation, and formatting.

```javascript
import React, { useState } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const TextInputExample = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry={true}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter your message"
          multiline={true}
          numberOfLines={4}
          maxLength={200}
        />
        <Text style={styles.counter}>{message.length}/200</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
  },
  counter: {
    textAlign: "right",
    color: "#666",
    marginTop: 5,
  },
});
```

### Pressable Component

Core press response component with flexible press feedback and gesture handling.

```javascript
import React, { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

const PressableExample = () => {
  const [pressCount, setPressCount] = useState(0);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => setPressCount((count) => count + 1)}
        onLongPress={() => setPressCount(0)}
        delayLongPress={1000}
        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
      >
        {({ pressed }) => (
          <Text style={styles.buttonText}>
            {pressed ? "Pressed!" : "Press Me"}
          </Text>
        )}
      </Pressable>
      <Text style={styles.counter}>Press count: {pressCount}</Text>
      <Text style={styles.hint}>Long press to reset</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#2196f3",
    padding: 20,
    borderRadius: 5,
    minWidth: 200,
    alignItems: "center",
  },
  buttonPressed: {
    backgroundColor: "#1976d2",
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  counter: {
    marginTop: 20,
    fontSize: 24,
  },
  hint: {
    marginTop: 10,
    color: "#666",
  },
});
```

### Modal Component

Component for presenting content above the current view with platform-specific animations.

```javascript
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, Button, Pressable } from "react-native";

const ModalExample = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState("slide");

  return (
    <View style={styles.container}>
      <Button title="Show Modal" onPress={() => setModalVisible(true)} />

      <Modal
        animationType={selectedAnimation}
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        onShow={() => console.log("Modal shown")}
        onDismiss={() => console.log("Modal dismissed")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modal Title</Text>
            <Text style={styles.modalText}>
              This is a modal window. It can display any content you need.
            </Text>

            <View style={styles.animationButtons}>
              <Pressable onPress={() => setSelectedAnimation("slide")}>
                <Text>Slide</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedAnimation("fade")}>
                <Text>Fade</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedAnimation("none")}>
                <Text>None</Text>
              </Pressable>
            </View>

            <Button
              title="Close Modal"
              onPress={() => setModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  animationButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
});
```

## Animation API

### Animated.timing

Create timing-based animations with configurable duration and easing functions.

```javascript
import React, { useState, useEffect } from "react";
import { Animated, View, Text, StyleSheet, Button } from "react-native";

const FadeInView = ({ children }) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>
  );
};

const AnimatedExample = () => {
  const [position] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const [rotation] = useState(() => new Animated.Value(0));

  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(position, {
        toValue: 200,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.5,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animation
      position.setValue(0);
      scale.setValue(1);
      rotation.setValue(0);
    });
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <FadeInView>
        <View style={styles.content}>
          <Text style={styles.text}>FadeInView</Text>
        </View>
      </FadeInView>

      <Animated.View
        style={[
          styles.box,
          {
            transform: [
              { translateX: position },
              { scale: scale },
              { rotate: spin },
            ],
          },
        ]}
      />

      <Button title="Start Animation" onPress={startAnimation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    backgroundColor: "deepskyblue",
    borderWidth: 1,
    borderColor: "dodgerblue",
    padding: 20,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    color: "white",
    fontSize: 20,
  },
  box: {
    width: 50,
    height: 50,
    backgroundColor: "#2196f3",
    marginTop: 20,
  },
});
```

### Animated.spring

Create spring-based physics animations with natural motion.

```javascript
import React, { useState } from "react";
import { Animated, View, StyleSheet, Pressable } from "react-native";

const SpringExample = () => {
  const [springValue] = useState(() => new Animated.Value(1));

  const startSpring = () => {
    springValue.setValue(0.3);
    Animated.spring(springValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={startSpring}>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [{ scale: springValue }],
            },
          ]}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: "#4caf50",
    borderRadius: 10,
  },
});
```

### Animated.sequence and Animated.parallel

Compose multiple animations to run sequentially or simultaneously.

```javascript
import React, { useRef } from "react";
import { Animated, View, StyleSheet, Button } from "react-native";

const ComposedAnimations = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startSequence = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(moveAnim, {
        toValue: 100,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 2,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset
      fadeAnim.setValue(0);
      moveAnim.setValue(0);
      scaleAnim.setValue(1);
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            opacity: fadeAnim,
            transform: [{ translateY: moveAnim }, { scale: scaleAnim }],
          },
        ]}
      />
      <Button title="Start Sequence" onPress={startSequence} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: "#ff5722",
    marginBottom: 50,
  },
});
```

## Platform APIs

### Alert API

Display native alert dialogs with customizable buttons and callbacks.

```javascript
import React from "react";
import { Alert, View, Button, StyleSheet } from "react-native";

const AlertExample = () => {
  const showSimpleAlert = () => {
    Alert.alert("Alert Title", "This is the alert message");
  };

  const showAlertWithButtons = () => {
    Alert.alert(
      "Action Required!",
      "Your subscription has expired!",
      [
        { text: "Ignore", onPress: () => console.log("Ignore Pressed") },
        { text: "Renew", onPress: () => console.log("Renew Pressed") },
      ],
      { cancelable: true }
    );
  };

  const showAlertWithStyles = () => {
    Alert.alert("Unsaved Changes!", "Do you want to save your changes?", [
      {
        text: "Cancel",
        onPress: () => console.log("Cancel Pressed"),
        style: "cancel",
      },
      { text: "No", onPress: () => console.log("No Pressed") },
      {
        text: "Yes",
        onPress: () => console.log("Yes Pressed"),
        style: "destructive",
      },
    ]);
  };

  const showPrompt = () => {
    // iOS only
    Alert.prompt(
      "Type a value",
      "Enter some text",
      (text) => console.log("Entered:", text),
      "plain-text",
      "Default value"
    );
  };

  return (
    <View style={styles.container}>
      <Button title="Simple Alert" onPress={showSimpleAlert} />
      <Button title="Alert with Buttons" onPress={showAlertWithButtons} />
      <Button title="Alert with Styles" onPress={showAlertWithStyles} />
      <Button title="Prompt (iOS)" onPress={showPrompt} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
});
```

### Linking API

Open URLs, handle deep links, and interact with external applications.

```javascript
import React, { useEffect, useState } from "react";
import { Linking, View, Button, Text, StyleSheet, Alert } from "react-native";

const LinkingExample = () => {
  const [initialUrl, setInitialUrl] = useState(null);

  useEffect(() => {
    // Get initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        setInitialUrl(url);
        console.log("App opened with URL:", url);
      }
    });

    // Listen for URL events while app is running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("Received URL:", url);
      Alert.alert("Deep Link Received", url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const openURL = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", `Don't know how to open URL: ${url}`);
    }
  };

  const openSettings = async () => {
    await Linking.openSettings();
  };

  const sendIntent = async () => {
    // Android only
    try {
      await Linking.sendIntent("android.intent.action.POWER_USAGE_SUMMARY");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      {initialUrl && (
        <Text style={styles.initialUrl}>Initial URL: {initialUrl}</Text>
      )}
      <Button
        title="Open Website"
        onPress={() => openURL("https://reactnative.dev")}
      />
      <Button title="Open Phone" onPress={() => openURL("tel:+1234567890")} />
      <Button
        title="Open Email"
        onPress={() => openURL("mailto:test@example.com")}
      />
      <Button
        title="Open Maps"
        onPress={() => openURL("geo:37.484847,-122.148386")}
      />
      <Button title="Open Settings" onPress={openSettings} />
      <Button title="Send Intent (Android)" onPress={sendIntent} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  initialUrl: {
    marginBottom: 20,
    fontSize: 14,
    color: "#666",
  },
});
```

### Share API

Share content with other apps using the native share sheet.

```javascript
import React, { useState } from "react";
import { Share, View, Button, Text, StyleSheet, Alert } from "react-native";

const ShareExample = () => {
  const [shareResult, setShareResult] = useState("");

  const shareMessage = async () => {
    try {
      const result = await Share.share({
        message: "Check out React Native! https://reactnative.dev",
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          setShareResult(`Shared via ${result.activityType}`);
        } else {
          setShareResult("Content shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        setShareResult("Share dismissed");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const shareWithOptions = async () => {
    try {
      await Share.share(
        {
          title: "React Native",
          message:
            "React Native combines the best parts of native development with React",
          url: "https://reactnative.dev",
        },
        {
          subject: "Check out React Native",
          dialogTitle: "Share React Native",
          excludedActivityTypes: ["com.apple.UIKit.activity.PostToTwitter"],
          tintColor: "blue",
        }
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Share Message" onPress={shareMessage} />
      <Button title="Share with Options" onPress={shareWithOptions} />
      {shareResult ? (
        <Text style={styles.result}>Result: {shareResult}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  result: {
    marginTop: 20,
    fontSize: 16,
    color: "#4caf50",
  },
});
```

### Platform API

Detect platform-specific information and write platform-conditional code.

```javascript
import React from "react";
import { Platform, View, Text, StyleSheet } from "react-native";

const PlatformExample = () => {
  const platformInfo = {
    OS: Platform.OS,
    Version: Platform.Version,
    isTV: Platform.isTV,
    isPad: Platform.isPad,
    isMacCatalyst: Platform.isMacCatalyst,
  };

  const platformStyles = Platform.select({
    ios: {
      backgroundColor: "#007AFF",
      padding: 20,
    },
    android: {
      backgroundColor: "#3DDC84",
      padding: 20,
    },
    default: {
      backgroundColor: "#333",
      padding: 20,
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.box, platformStyles]}>
        <Text style={styles.text}>Running on {Platform.OS}</Text>
        <Text style={styles.text}>Version: {Platform.Version}</Text>
      </View>

      {Platform.OS === "ios" && (
        <Text style={styles.info}>This is only visible on iOS</Text>
      )}

      {Platform.OS === "android" && (
        <Text style={styles.info}>This is only visible on Android</Text>
      )}

      <Text style={styles.info}>{JSON.stringify(platformInfo, null, 2)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  box: {
    borderRadius: 10,
    marginBottom: 20,
  },
  text: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
  },
  info: {
    fontSize: 14,
    marginTop: 10,
  },
});
```

### Dimensions API

Get device screen dimensions and respond to orientation changes.

```javascript
import React, { useState, useEffect } from "react";
import { Dimensions, View, Text, StyleSheet, ScaledSize } from "react-native";

const DimensionsExample = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const [orientation, setOrientation] = useState(
    dimensions.width > dimensions.height ? "landscape" : "portrait"
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window, screen }) => {
        setDimensions(window);
        setOrientation(window.width > window.height ? "landscape" : "portrait");
        console.log("Window dimensions:", window);
        console.log("Screen dimensions:", screen);
      }
    );

    return () => subscription?.remove();
  }, []);

  const screenDimensions = Dimensions.get("screen");

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.title}>Window Dimensions</Text>
        <Text>Width: {dimensions.width}</Text>
        <Text>Height: {dimensions.height}</Text>
        <Text>Scale: {dimensions.scale}</Text>
        <Text>Font Scale: {dimensions.fontScale}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.title}>Screen Dimensions</Text>
        <Text>Width: {screenDimensions.width}</Text>
        <Text>Height: {screenDimensions.height}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.title}>Orientation</Text>
        <Text style={styles.orientationText}>{orientation}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  infoBox: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  orientationText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2196f3",
  },
});
```

## Networking

### Fetch API

Make HTTP requests to REST APIs with full support for headers, methods, and body content.

```javascript
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

const FetchExample = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      setData(json.slice(0, 10));
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const postData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "New Post",
            body: "This is a new post",
            userId: 1,
          }),
        }
      );

      const json = await response.json();
      console.log("Created post:", json);
      alert(`Post created with ID: ${json.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.buttons}>
        <Button title="Fetch Data" onPress={fetchData} disabled={loading} />
        <Button title="Post Data" onPress={postData} disabled={loading} />
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text style={styles.error}>Error: {error}</Text>}

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  item: {
    padding: 15,
    backgroundColor: "#f9f9f9",
    marginBottom: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  body: {
    fontSize: 14,
    color: "#666",
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
});
```

## Styling

### StyleSheet API

Create optimized stylesheets with type checking and performance benefits.

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const StyleSheetExample = () => {
  const dynamicStyle = StyleSheet.create({
    box: {
      backgroundColor: "#2196f3",
      padding: 20,
    },
  });

  const flattenedStyles = StyleSheet.flatten([
    styles.baseText,
    styles.boldText,
    { color: "red" },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.text}>Basic Box</Text>
      </View>

      <View style={[styles.box, styles.shadowBox]}>
        <Text style={styles.text}>Box with Shadow</Text>
      </View>

      <View style={[styles.box, dynamicStyle.box]}>
        <Text style={[styles.text, styles.boldText]}>Combined Styles</Text>
      </View>

      <Text style={flattenedStyles}>Flattened Styles</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  box: {
    backgroundColor: "#4caf50",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  shadowBox: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  baseText: {
    fontSize: 16,
  },
  boldText: {
    fontWeight: "bold",
  },
});
```

### Flexbox Layout

Use flexbox for responsive layouts that adapt to different screen sizes.

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const FlexboxExample = () => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.box, styles.box1]}>
          <Text style={styles.text}>Flex: 1</Text>
        </View>
        <View style={[styles.box, styles.box2]}>
          <Text style={styles.text}>Flex: 2</Text>
        </View>
        <View style={[styles.box, styles.box3]}>
          <Text style={styles.text}>Flex: 1</Text>
        </View>
      </View>

      <View style={styles.column}>
        <View style={[styles.box, styles.box4]}>
          <Text style={styles.text}>flexGrow: 1</Text>
        </View>
        <View style={[styles.box, styles.box5]}>
          <Text style={styles.text}>flexGrow: 2</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  row: {
    flexDirection: "row",
    height: 100,
    marginBottom: 20,
  },
  column: {
    flexDirection: "column",
    flex: 1,
  },
  box: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  box1: {
    flex: 1,
    backgroundColor: "#ff6b6b",
  },
  box2: {
    flex: 2,
    backgroundColor: "#4ecdc4",
  },
  box3: {
    flex: 1,
    backgroundColor: "#ffe66d",
  },
  box4: {
    flexGrow: 1,
    backgroundColor: "#a8e6cf",
  },
  box5: {
    flexGrow: 2,
    backgroundColor: "#ffd3b6",
  },
  text: {
    color: "white",
    fontWeight: "bold",
  },
});
```

## Application Lifecycle

### AppRegistry

Register and run React Native applications with native platforms.

```javascript
import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

// Register the main application component
AppRegistry.registerComponent(appName, () => App);

// Register a headless task (Android)
AppRegistry.registerHeadlessTask("BackgroundTask", () =>
  require("./BackgroundTask")
);

// Advanced: manually run application
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById("root"),
  initialProps: {},
});
```

### AppState API

Monitor application state changes between active, background, and inactive states.

```javascript
import React, { useEffect, useState, useRef } from "react";
import { AppState, View, Text, StyleSheet } from "react-native";

const AppStateExample = () => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [history, setHistory] = useState([]);
  const appStateRef = useRef(appState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appStateRef.current !== nextAppState) {
        const timestamp = new Date().toLocaleTimeString();
        setHistory((prev) => [
          ...prev,
          `${timestamp}: ${appStateRef.current} → ${nextAppState}`,
        ]);
      }

      appStateRef.current = nextAppState;
      setAppState(nextAppState);
      console.log("AppState changed to:", nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current App State</Text>
      <Text style={styles.state}>{appState}</Text>

      <Text style={styles.title}>State History</Text>
      {history.map((item, index) => (
        <Text key={index} style={styles.historyItem}>
          {item}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  state: {
    fontSize: 24,
    color: "#2196f3",
    fontWeight: "bold",
  },
  historyItem: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
  },
});
```

## Summary

React Native provides a comprehensive framework for building production-ready mobile applications using JavaScript and React 18.1.0. The main use cases include: (1) Cross-platform mobile app development where a single codebase targets both iOS 12.4+ and Android 5.0 (API 21)+ while maintaining native performance and platform-specific UI patterns; (2) Rapid prototyping and iteration with hot reloading for instant feedback during development; (3) Large-scale applications requiring performant list rendering through FlatList virtualization, complex animations via the Animated API, and native module integration for platform-specific features; (4) Apps requiring rich networking capabilities, local storage, device API access (camera, geolocation, notifications), and deep linking support. The component-based architecture, declarative UI patterns from React, and extensive ecosystem of third-party libraries make React Native suitable for projects ranging from simple MVPs to complex enterprise applications used by billions of users.

Integration patterns follow standard React 18 practices with hooks for state management (useState, useEffect, useRef) and context for global state. Platform-specific code can be conditionally rendered using Platform.OS checks or Platform.select() for styling differences. The StyleSheet API provides performance-optimized styling with flexbox layouts for responsive designs. Native modules written in Objective-C/Swift (iOS) or Java/Kotlin (Android) can be bridged to JavaScript for accessing platform-specific APIs not provided by React Native core. The Metro bundler 0.72.3 handles JavaScript packaging with support for ES6+ syntax via Babel, while the new architecture (Fabric renderer and TurboModules) enables synchronous native calls and improved performance. Development workflow leverages the React Native CLI or Expo for project scaffolding, requires Node.js 14 or higher (recommended Node.js 16), and supports debugging with Chrome DevTools or React DevTools, and testing with Jest for unit tests and Detox for end-to-end testing.
