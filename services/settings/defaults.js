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
    logoUrl: "/logo-aura-interiors.webp",
    logoDarkUrl: "",
    faviconUrl: "/favicon.png",
  },
  theme: {
    primaryColor: "#F27318",
    primaryHoverColor: "#D9620E",
    navyColor: "#1E2C4A",
    fontFamily: "DM Sans",
  },
  contact: {
    email: "support@aurainteriors.live",
    phone: "+977 9866291003",
    address: "Hattiban, Lalitpur, Nepal",
    hours: "",
    mapUrl: "",
    socials: {
      facebook: "",
      instagram: "",
      youtube: "",
      pinterest: "",
      tiktok: "",
      whatsapp: "",
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
  },
  homepage: {
    sections: {
      hero: true,
      trustBanner: true,
      shopByCategory: true,
      featuredPieces: true,
      testimonials: true,
    },
    announcementsEnabled: true,
    newsletterEnabled: true,
  },
  commerce: {
    currency: "NPR",
    locale: "en-NP",
    freeShippingThreshold: 5000,
  },
  chat: {
    enabled: true,
    aiAssistantEnabled: true,
    welcomeMessage: "",
  },
  notifications: {
    emailFromName: "Aura Interiors",
    emailFrom: "",
    supportEmail: "support@aurainteriors.live",
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
