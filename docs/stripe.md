# @stripe/stripe-js

This package provides a secure way to load Stripe.js as a CommonJS or ES module while maintaining PCI compliance. The library wraps the Stripe.js script loading mechanism, ensuring that the script is always loaded directly from Stripe's CDN at `https://js.stripe.com` rather than being bundled with your application code. This approach is required for PCI compliance as Stripe.js must be loaded from Stripe's servers.

The package offers two import modes: a standard mode that immediately injects the Stripe.js script tag upon import, and a "pure" mode that defers script injection until `loadStripe` is called. It includes comprehensive TypeScript definitions for the entire Stripe.js API, supports advanced fraud detection configuration, and handles edge cases like server-side rendering by resolving to `null` in non-browser environments.

## API Documentation

### Loading Stripe.js with loadStripe

Loads the Stripe.js library from Stripe's CDN and initializes a Stripe instance with your publishable key. Returns a Promise that resolves to a Stripe object once the script is loaded, or null in server-side environments.

```javascript
import { loadStripe } from "@stripe/stripe-js";

// Basic usage with test key
const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

// With Connect account and locale
const stripeConnect = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx", {
  stripeAccount: "acct_1234567890",
  locale: "fr",
});

// Error handling
try {
  const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");
  if (!stripe) {
    console.error("Failed to load Stripe.js");
  }
} catch (error) {
  console.error("Error loading Stripe:", error);
}
```

### Creating Payment Elements

Creates and mounts Stripe Elements for collecting payment information. Elements are customizable UI components for securely collecting card details and other payment methods.

```javascript
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");
const elements = stripe.elements();

// Create a card element with custom styling
const cardElement = elements.create("card", {
  style: {
    base: {
      fontSize: "16px",
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
  hidePostalCode: false,
});

// Mount the element to a DOM node
cardElement.mount("#card-element");

// Listen for validation errors
cardElement.on("change", (event) => {
  const displayError = document.getElementById("card-errors");
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = "";
  }
});
```

### Creating Payment Methods

Creates a payment method from Element data or raw payment information. Payment methods can be attached to customers and reused for future payments.

```javascript
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");
const elements = stripe.elements();
const cardElement = elements.create("card");
cardElement.mount("#card-element");

// Create payment method from card element
document
  .getElementById("payment-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: {
        name: "John Doe",
        email: "john.doe@example.com",
        address: {
          line1: "123 Main St",
          city: "San Francisco",
          state: "CA",
          postal_code: "94111",
          country: "US",
        },
      },
    });

    if (error) {
      console.error("Error creating payment method:", error.message);
    } else {
      console.log("Payment method created:", paymentMethod.id);
      // Send paymentMethod.id to your server
    }
  });
```

### Confirming Payment Intents

Confirms a payment intent on the client side, triggering authentication flows when required. Handles 3D Secure and other redirect-based authentication methods automatically.

```javascript
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

// Assuming you received clientSecret from your server
const clientSecret = "pi_1234567890_secret_abcdefghijklmnop";

async function handlePayment(cardElement) {
  const { paymentIntent, error } = await stripe.confirmCardPayment(
    clientSecret,
    {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: "Jane Smith",
        },
      },
      return_url: "https://example.com/payment/complete",
      receipt_email: "jane.smith@example.com",
      setup_future_usage: "off_session",
    }
  );

  if (error) {
    console.error("Payment failed:", error.message);
    // Show error to customer
    return { success: false, error: error.message };
  }

  if (paymentIntent.status === "succeeded") {
    console.log("Payment successful!", paymentIntent.id);
    return { success: true, paymentIntentId: paymentIntent.id };
  }

  // Handle other statuses
  console.log("Payment status:", paymentIntent.status);
  return { success: false, status: paymentIntent.status };
}
```

### Loading Stripe.js without Side Effects (Pure Mode)

Defers script injection until `loadStripe` is called, providing more control over when the Stripe.js library loads. Useful for code-split applications or when you want to delay script loading.

```javascript
// Import from /pure to avoid immediate script injection
import { loadStripe } from "@stripe/stripe-js/pure";

// Stripe.js will NOT be loaded until this function is called
async function initializePayments() {
  const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");
  return stripe;
}

// Configure load parameters before loading
loadStripe.setLoadParameters({
  advancedFraudSignals: false, // Disable fraud detection if needed
});

// Later in your app, when you need Stripe
const stripe = await initializePayments();
```

### Configuring Advanced Fraud Detection

Controls whether Stripe.js collects advanced fraud detection signals. Must be configured before calling `loadStripe` when using the pure import.

```javascript
import { loadStripe } from "@stripe/stripe-js/pure";

// Disable advanced fraud detection signals
loadStripe.setLoadParameters({ advancedFraudSignals: false });

// This will load Stripe.js without advanced fraud detection
const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

// Note: Attempting to change parameters after loading will throw an error
try {
  loadStripe.setLoadParameters({ advancedFraudSignals: true });
} catch (error) {
  console.error(error.message);
  // Error: "You cannot change load parameters after calling loadStripe"
}
```

### Creating Payment Request Buttons (Apple Pay, Google Pay)

Creates payment request buttons for digital wallets like Apple Pay and Google Pay. Automatically detects available payment methods in the user's browser.

```javascript
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

const paymentRequest = stripe.paymentRequest({
  country: "US",
  currency: "usd",
  total: {
    label: "Demo Total",
    amount: 1999, // $19.99
  },
  requestPayerName: true,
  requestPayerEmail: true,
});

// Check if payment method is available
const result = await paymentRequest.canMakePayment();
if (result) {
  console.log("Available payment methods:", result);

  const elements = stripe.elements();
  const prButton = elements.create("paymentRequestButton", {
    paymentRequest: paymentRequest,
  });

  // Mount button if payment method available
  prButton.mount("#payment-request-button");

  paymentRequest.on("paymentmethod", async (ev) => {
    // Send payment method to server and confirm payment
    const { error: confirmError } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: ev.paymentMethod.id },
      { handleActions: false }
    );

    if (confirmError) {
      ev.complete("fail");
    } else {
      ev.complete("success");
      // Payment succeeded, show confirmation
    }
  });
} else {
  console.log("No payment methods available");
}
```

### Server-Side Rendering Support

Handles server-side environments gracefully by returning null when there's no browser environment. Prevents errors in Next.js, Nuxt, and other SSR frameworks.

```javascript
// This code works in both server and client environments
import { loadStripe } from "@stripe/stripe-js";

async function getStripeInstance() {
  const stripe = await loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

  if (!stripe) {
    // Running on server - stripe will be null
    console.log("Stripe.js not available (server environment)");
    return null;
  }

  // Running in browser - stripe is available
  return stripe;
}

// In a React component with Next.js
export default function CheckoutForm() {
  const [stripe, setStripe] = React.useState(null);

  React.useEffect(() => {
    // Only runs on client side
    loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx").then(setStripe);
  }, []);

  if (!stripe) {
    return <div>Loading...</div>;
  }

  return <div>Stripe loaded</div>;
}
```

### TypeScript Integration

Provides full TypeScript definitions for Stripe.js API with comprehensive type safety for all payment methods, elements, and API responses.

```typescript
import {
  loadStripe,
  Stripe,
  StripeCardElement,
  PaymentIntent,
  StripeError,
} from "@stripe/stripe-js";

async function processPayment(): Promise<PaymentIntent | null> {
  const stripe: Stripe | null = await loadStripe(
    "pk_test_TYooMQauvdEDq54NiTphI7jx"
  );

  if (!stripe) {
    return null;
  }

  const elements = stripe.elements();
  const cardElement: StripeCardElement = elements.create("card", {
    style: {
      base: {
        fontSize: "16px",
      },
    },
  });

  cardElement.mount("#card-element");

  const {
    paymentIntent,
    error,
  }: {
    paymentIntent?: PaymentIntent;
    error?: StripeError;
  } = await stripe.confirmCardPayment("pi_secret_123", {
    payment_method: {
      card: cardElement,
    },
  });

  if (error) {
    console.error(`Payment failed: ${error.message} (${error.code})`);
    return null;
  }

  return paymentIntent || null;
}
```

## Summary

The `@stripe/stripe-js` package is essential for integrating Stripe payments into web applications while maintaining PCI compliance. It handles the complexity of loading Stripe.js securely from Stripe's CDN, provides TypeScript definitions for type-safe development, and offers flexibility through both immediate and deferred loading modes. The library seamlessly integrates with modern JavaScript frameworks and supports server-side rendering environments.

Primary use cases include building checkout flows with card payments, implementing digital wallet payments (Apple Pay, Google Pay), creating subscription billing interfaces, and building marketplaces with Stripe Connect. Integration patterns vary from simple one-time payments using Payment Intents to complex flows involving saved payment methods, 3D Secure authentication, and recurring billing. The library's TypeScript support ensures developers catch errors at compile time, while its automatic handling of authentication redirects and webhook-based confirmation patterns simplifies the payment flow implementation.
