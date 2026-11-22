"use strict";

// DEFAULT_SETTINGS — Batch 1 (Settings + Secrets backend).
//
// Every value below equals the site's CURRENT live value, so a fresh
// deployment that has never opened the admin Settings screens behaves
// and looks exactly as it does today. Sources (aurainteriors-web
// unless noted):
//   identity.storeName / seo.defaultTitle — index.html <title>
//     "Aura Interiors – Redefine Your Space" (tagline = the part after
//     the store name); logoUrl — src/layouts/customer/Navbar.jsx +
//     Footer.jsx ("/logo-aura-interiors.webp"); faviconUrl —
//     index.html ("/favicon.png").
//   theme — src/styles/index.css: --color-brand #F27318,
//     --color-brand-hover #D9620E, body font "DM Sans"; navy #1E2C4A
//     is index.html's theme-color (the splash/brand navy).
//   contact — src/pages/info/ContactPage.jsx: support@aurainteriors.live,
//     +977 9866291003, "Hattiban, Lalitpur, Nepal". Socials: Footer.jsx
//     renders Facebook/Instagram/YouTube/Pinterest icons linking to
//     "#" — no real URLs exist today, so all social URLs default to "".
//   seo.metaDescription / ogImage — index.html meta tags.
//   homepage.sections — src/pages/HomePage.jsx renders Hero,
//     TrustBanner, ShopByCategory, FeaturedPieces, Testimonials.
//   commerce — src/utils/formatCurrency.js: NPR, fixed "en-NP" locale;
//     freeShippingThreshold 5000 — src/layouts/customer/TopBar.jsx
//     ("Free delivery on orders above {formatNPR(5000)}").
//   chat — the support chat + AI assistant ship enabled today
//     (routes/chat.routes.js, services/chatV2).
//   notifications.supportEmail — ContactPage (server .env.example
//     SUPPORT_EMAIL is a yourdomain placeholder, not a live value).
//   integrations — .env.example + services/chatV2/config/chatConfig.js:
//     chat providers are groq/mistral/openrouter IN THAT ORDER
//     (loadChatConfig), with the models/baseUrls in PROVIDER_DEFAULTS;
//     gemini is NOT a chat provider today (its key only feeds the
//     embedding fallback in services/ingestionService.js), so it ships
//     disabled here; openai/anthropic do not exist yet (disabled,
//     canonical base URLs). embeddings — .env.example
//     EMBEDDING_MODEL_NAME nvidia/llama-3.2-nv-embed-qa-4; qdrant.url —
//     .env.example QDRANT_URL. Identifier fields whose .env.example
//     values are placeholders ("your_cloud_name", "your_google_client_id",
//     eSewa's public EPAYTEST sandbox merchant) default to "" — shipping
//     a placeholder/test identifier as a "current value" would be wrong.

const DEFAULT_SETTINGS = {
  identity: {
    storeName: "Aura Interiors",
    tagline: "Redefine Your Space",
    // Batch 3a: support email also surfaced on the Identity admin tab;
    // same current value as notifications.supportEmail / ContactPage.
    supportEmail: "support@aurainteriors.live",
    logoUrl: "/logo-aura-interiors.webp",
    logoDarkUrl: "",
    faviconUrl: "/favicon.png",
  },
  theme: {
    primaryColor: "#F27318",
    primaryHoverColor: "#D9620E",
    navyColor: "#1E2C4A",
    fontFamily: "DM Sans",
    // Batch 3a: storefront buttons render rounded-lg today
    // (Hero.jsx), so the current-look token is "rounded".
    buttonRadius: "rounded",
    // Batch 3d: backgroundColor is the page background the site
    // ships today — index.html's inline `html { background:
    // #f3f4f6; }`. headerStyle "light" is the current white navbar.
    // darkMode off, roundedCards/showShadows on = current look, so
    // every Batch 3d addition is a no-op until an admin changes it.
    // customCss "" = no admin stylesheet injected.
    backgroundColor: "#f3f4f6",
    headerStyle: "light",
    darkMode: false,
    roundedCards: true,
    showShadows: true,
    customCss: "",
  },
  contact: {
    email: "support@aurainteriors.live",
    phone: "+977 9866291003",
    address: "Hattiban, Lalitpur, Nepal",
    hours: "",
    // Batch 3d: structured per-day hours for the Contact & Social
    // tab. The store publishes NO opening hours today (contact.hours
    // is ""), so every day defaults to closed with no range — the
    // admin composes contact.hours from these rows only once they
    // open at least one day. Nothing was invented here.
    businessHours: [
      { day: "Monday", open: false, hours: "" },
      { day: "Tuesday", open: false, hours: "" },
      { day: "Wednesday", open: false, hours: "" },
      { day: "Thursday", open: false, hours: "" },
      { day: "Friday", open: false, hours: "" },
      { day: "Saturday", open: false, hours: "" },
      { day: "Sunday", open: false, hours: "" },
    ],
    mapUrl: "",
    socials: {
      facebook: "",
      instagram: "",
      youtube: "",
      pinterest: "",
      tiktok: "",
      whatsapp: "",
      // Batch 3a: no X/LinkedIn links exist on the site today either.
      twitter: "",
      linkedin: "",
    },
  },
  seo: {
    siteUrl: "https://www.aurainteriors.live",
    defaultTitle: "Aura Interiors – Redefine Your Space",
    metaDescription:
      "Aura Interiors – Discover handcrafted furniture and home décor that transforms your living space. Shop sofas, beds, dining sets, wardrobes and more.",
    ogImage: "https://www.aurainteriors.live/promo-ad-banner.webp",
    twitterCard: "summary_large_image",
    googleAnalyticsId: "",
    metaPixelId: "",
    tiktokPixelId: "",
    searchConsoleVerification: "",
    // Batch 3a: no Google Maps embed/key is used anywhere today.
    googleMapsKey: "",
    // Batch 3d: SEO feature gates. Every flag defaults to the
    // site's CURRENT behaviour: product JSON-LD, breadcrumb JSON-LD,
    // Open Graph and Twitter cards are all emitted by the runtime
    // head (src/seo/seo.js applyHead) today, meta fallbacks are
    // auto-filled, and pages are indexable. canonicalUrl "" = the
    // per-page canonical applyHead has always written;
    // defaultLanguage "en-NP" is the store's locale (commerce.locale)
    // — the value the effects layer applies to <html lang>;
    // noindexPages [] = no route is force-noindexed by settings.
    features: {
      productSchema: true,
      breadcrumbs: true,
      openGraph: true,
      twitterCards: true,
      autoGenerateMeta: true,
    },
    canonicalUrl: "",
    defaultLanguage: "en-NP",
    indexingEnabled: true,
    noindexPages: [],
  },
  homepage: {
    sections: {
      hero: true,
      trustBanner: true,
      shopByCategory: true,
      featuredPieces: true,
      testimonials: true,
    },
    // Batch 3a: current render order in src/pages/HomePage.jsx.
    sectionsOrder: [
      "hero",
      "trustBanner",
      "shopByCategory",
      "featuredPieces",
      "testimonials",
    ],
    // Batch 3a: the `slides` array in src/components/sections/Hero.jsx,
    // verbatim (headline = heading + highlight; buttonLink =
    // shopCategoryUrl(slug) as rendered). Hero.jsx's bento layout
    // renders slides 1–2 plus the promo card below; slide 3 exists in
    // the data but is not rendered today, so its buttonLink (never
    // rendered) is "". imageUrl values are the web repo's source
    // asset paths (the imports at the top of Hero.jsx) — Batch 3b
    // maps them to built asset URLs.
    heroSlides: [
      {
        imageUrl:
          "src/assets/images/hero/hero-furniture-living-room-1200w.webp",
        headline: "Furniture That Fits You",
        subtext:
          "Discover our handpicked collection of timeless sofas and accent chairs — thoughtfully designed to bring warmth, character, and lasting comfort into every corner of your home.",
        buttonText: "Explore Now",
        buttonLink: "/shop?categories=living-room",
        enabled: true,
      },
      {
        imageUrl: "src/assets/images/hero/hero-bedroom-comfort-1200w.webp",
        headline: "Sleep in Pure Comfort",
        subtext:
          "Our premium king-size beds and orthopedic mattresses are engineered with adaptive support layers — so every night feels like your best one yet.",
        buttonText: "Shop Beds",
        buttonLink: "/shop?categories=bedroom",
        enabled: true,
      },
      {
        imageUrl: "src/assets/images/hero/hero-workspace-office-1200w.webp",
        headline: "Work From Anywhere",
        subtext:
          "From height-adjustable desks to cable-managed bookshelves, our workspace collection is built for deep focus, long hours, and a setup that actually inspires you.",
        buttonText: "View Office",
        buttonLink: "",
        enabled: true,
      },
    ],
    // Batch 3a: the hardcoded bottom-right bento card in Hero.jsx
    // (its price pair Rs. 24,999 → Rs. 19,999 is not part of this
    // shape and stays in the component until Batch 3b).
    promoBanner: {
      imageUrl: "src/assets/images/hero/hero-decor-dining-room-1200w.webp",
      headline: "Calmora Bed Frame",
      subtext:
        "Handcrafted solid sheesham wood frame with a plush upholstered headboard",
      buttonText: "Shop Sale",
      buttonLink: "/shop?categories=bedroom",
      enabled: true,
    },
    announcementsEnabled: true,
    newsletterEnabled: true,
  },
  // Batch 3a: public content pages. The FAQ rows are
  // src/data/faqData.js flattened in order (the page groups them by
  // category; this shape is the flat {question, answer} list).
  // about / privacyPolicy / terms / shippingReturns default to "":
  // NO such pages or copy exist in the web repo today — the footer
  // links /about, /privacy, /terms, /shipping and /returns point at
  // routes that do not exist (they render the 404 page), so there is
  // no current copy to extract and none was invented.
  pages: {
    about: "",
    privacyPolicy: "",
    terms: "",
    shippingReturns: "",
    faq: [
      {
        question: "How do I place an order?",
        answer:
          "To place an order, browse our shop, select your desired items, and add them to your cart. Once you're ready, click on the cart icon and proceed to checkout. Follow the prompts to enter your shipping and payment information.",
      },
      {
        question: "Can I modify my order after it's placed?",
        answer:
          "We process orders quickly to ensure timely delivery. If you need to change or cancel your order, please contact our support team within 1 hour of placement. After this window, we may not be able to make changes.",
      },
      {
        question: "Do you offer financing options?",
        answer:
          "Yes, we partner with several financing providers to offer flexible payment plans. You can view available options during the checkout process.",
      },
      {
        question: "What are your shipping rates?",
        answer:
          "Shipping rates vary based on the item size and your location. Small items typically ship for a flat rate, while white-glove delivery for large furniture is calculated at checkout.",
      },
      {
        question: "How long will it take to receive my order?",
        answer:
          "Standard shipping takes 5-7 business days for in-stock items. Custom or larger furniture pieces may take 4-8 weeks. You can track your order status in the 'Track Order' section of our website.",
      },
      {
        question: "Do you deliver outside Nepal?",
        answer:
          "We currently deliver within Nepal, including the Kathmandu Valley and major cities across the country. We are not yet able to deliver internationally.",
      },
      {
        question: "What is your return policy?",
        answer:
          "We offer a 30-day return policy for most items in their original condition. Custom-made pieces aren't eligible for return unless they arrive damaged or defective.",
      },
      {
        question: "How do I start a return?",
        answer:
          "To initiate a return, log into your account, go to your 'Order History', and select the item you wish to return. You will receive a return label and instructions via email.",
      },
      {
        question: "How does the AR 'View in Room' feature work?",
        answer:
          "Simply browse a product on your mobile device and tap the 'View in AR' button. Our application uses your phone's camera to place a digital 3D model of the furniture in your space at actual scale.",
      },
      {
        question: "Which devices support AR features?",
        answer:
          "Most modern iOS (iPhone 6s and later) and Android devices with ARCore support are compatible. Ensure your browser is up to date for the best experience.",
      },
    ],
  },
  commerce: {
    currency: "NPR",
    // Batch 4: the symbol the ONE formatter (web formatCurrency.js,
    // Intl "en-NP" + NPR) actually renders today is the code itself —
    // format(1235) === "NPR 1,235" — so the honest default symbol is
    // "NPR", shown before the amount, with en-NP grouping (the
    // numberFormat locale) and the bare-date pattern the central
    // formatDate renders today (Intl en-NP default = M/D/YYYY) in the
    // store's timezone.
    currencySymbol: "NPR",
    symbolPosition: "before",
    numberFormat: "en-NP",
    dateFormat: "M/D/YYYY",
    timezone: "Asia/Kathmandu",
    locale: "en-NP",
    freeShippingThreshold: 5000,
    // Batch 4: shipping is FREE today — calculateOrderTotals in
    // controllers/order.controller.js hardcodes shippingCost = 0
    // ("Free shipping") and no zone/rate concept exists. The zones
    // below are the new capability with every rate 0, so the fee
    // computed at defaults is still exactly 0 for every address.
    // Zone matching (services/commerceTotals.service.js): a
    // Kathmandu Valley address (city Kathmandu/Lalitpur/Bhaktapur or
    // state Bagmati) uses the "Kathmandu Valley" zone when enabled;
    // a non-Nepal country uses "International" when enabled; every
    // other address uses defaultZone.
    shipping: {
      enabled: true,
      deliveryEstimateText: "",
      zones: [
        { name: "Kathmandu Valley", rate: 0, enabled: true },
        { name: "Other Nepal", rate: 0, enabled: true },
        { name: "International", rate: 0, enabled: false },
      ],
      defaultZone: "Other Nepal",
    },
    // Batch 4: NO VAT/tax exists in pricing today (tax is hardcoded
    // 0 in calculateOrderTotals), so vatEnabled defaults OFF — the
    // 13% rate (Nepal's standard VAT) is only the stored value an
    // admin sees when they switch it on.
    tax: {
      vatEnabled: false,
      vatRate: 13,
    },
    orders: {
      // "" = today's orderId format untouched (the order model's
      // pre-save hook: "AU" + base36 timestamp + CSPRNG suffix).
      orderPrefix: "",
      // The admin product list hardcodes the low-stock cut-off at
      // stock < 10 today (ProductListPage.jsx: count, filter, badge).
      lowStockThreshold: 10,
      // 0 = no minimum — order creation rejects nothing today.
      minimumOrderAmount: 0,
    },
  },
  chat: {
    enabled: true,
    aiAssistantEnabled: true,
    welcomeMessage: "",
    // Batch 4: the widget has no offline state today (it always
    // renders), so the offline message starts empty — it is only
    // shown if an admin disables live chat AND writes a message.
    // businessHours "" = the chat window subtitle keeps its current
    // text ("Expert help for your home").
    offlineMessage: "",
    businessHours: "",
  },
  notifications: {
    emailFromName: "Aura Interiors",
    emailFrom: "",
    supportEmail: "support@aurainteriors.live",
    // Batch 4: editable transactional email templates. Each is
    // {subject, heading, body}; the HTML shell/branding stays in
    // services/email.service.js and these fields feed it at send
    // time (settings first, these defaults as the fallback — so the
    // rendered emails are IDENTICAL until an admin edits one).
    // Subjects are verbatim from email.service.js; bodies are the
    // current message text distilled into the heading/body fields.
    // Placeholders: {store_name}, {customer_name}, {order_id},
    // {total}, {tracking_info}.
    templates: {
      orderConfirmation: {
        subject: "Your Aura Interiors Order Has Been Confirmed! 🎉",
        heading: "Your Aura Interiors Order Has Been Confirmed! 🎉",
        body: "Hi {customer_name},\n\nThank you for shopping with {store_name}.\n\nWe've received your order and are preparing it for processing.",
      },
      // NOTE: no shipping-notification email is sent anywhere today
      // (order status changes do not email the customer), so there
      // is no current copy to distill — this default is new copy in
      // the same voice, stored + test-sendable only until a shipping
      // sender exists.
      shippingNotification: {
        subject: "Your {store_name} order has been shipped",
        heading: "Your order is on its way",
        body: "Hi {customer_name},\n\nGood news — your order {order_id} has been shipped and is on its way to you.\n\n{tracking_info}",
      },
      accountWelcome: {
        subject: "Welcome to {store_name}",
        heading: "Welcome, {customer_name}!",
        body: "Your account is ready. Explore our curated collections of premium luxury furniture and use our AR visualizer to see pieces inside your space before you buy.",
      },
      magicLink: {
        subject: "Your sign-in link for {store_name}",
        heading: "Sign in to {store_name}",
        body: "Hi {customer_name} — click the button below to sign in. This link is secure and expires in 15 minutes.",
      },
      // NOTE: no low-stock alert sender exists today either — this
      // template is stored + test-sendable, wired when an alert
      // sender is built.
      lowStockAlert: {
        subject: "Low stock alert from {store_name}",
        heading: "Low stock alert",
        body: "One or more products have fallen below the low-stock threshold. Please review your inventory in the admin Products page.",
      },
    },
  },
  maintenance: {
    enabled: false,
    message: "",
  },
  integrations: {
    ai: {
      fallbackOrder: ["groq", "mistral", "openrouter"],
      providers: {
        groq: {
          enabled: true,
          model: "openai/gpt-oss-120b",
          baseUrl: "https://api.groq.com/openai/v1",
        },
        mistral: {
          enabled: true,
          model: "mistral-small-latest",
          baseUrl: "https://api.mistral.ai/v1",
        },
        openrouter: {
          enabled: true,
          model: "meta-llama/llama-3.3-70b-instruct",
          baseUrl: "https://openrouter.ai/api/v1",
        },
        gemini: {
          enabled: false,
          model: "",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        },
        openai: {
          enabled: false,
          model: "",
          baseUrl: "https://api.openai.com/v1",
        },
        anthropic: {
          enabled: false,
          model: "",
          baseUrl: "https://api.anthropic.com/v1",
        },
      },
      featureProviders: {
        chat: "",
        insights: "",
        productDescriptions: "",
        knowledgeBase: "",
      },
      chat: {
        temperature: 0.2,
        maxTokens: 700,
      },
    },
    embeddings: {
      provider: "nvidia",
      model: "nvidia/llama-3.2-nv-embed-qa-4",
    },
    qdrant: {
      url: "http://localhost:6333",
    },
    cloudinary: {
      cloudName: "",
      apiKey: "",
    },
    google: {
      clientId: "",
    },
    brevo: {
      baseUrl: "https://api.brevo.com/v3",
    },
    esewa: {
      merchantId: "",
      environment: "sandbox",
    },
    khalti: {
      publicKey: "",
    },
    sms: {
      provider: "",
      senderId: "",
    },
    push: {
      senderId: "",
    },
  },
};

const SECTIONS = Object.keys(DEFAULT_SETTINGS);

module.exports = { DEFAULT_SETTINGS, SECTIONS };
