import type { EmailBuilderData } from "@/lib/puck-config";

export type Template = {
  id: string;
  name: string;
  subject: string;
  data: EmailBuilderData;
};

export const starterTemplates: Template[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to Nautilus",
    data: {
      content: [
        {
          type: "Heading",
          props: {
            id: "welcome-heading",
            content: "Welcome to Nautilus",
            color: "#111827",
            fontSize: 34,
            padding: 8,
            align: "left",
          },
        },
        {
          type: "Text",
          props: {
            id: "welcome-text",
            content:
              "Hi there,\n\nWe're excited to have you. Nautilus helps teams craft beautiful, high-converting campaigns in minutes.",
            color: "#374151",
            fontSize: 16,
            padding: 8,
            align: "left",
          },
        },
        {
          type: "Button",
          props: {
            id: "welcome-button",
            content: "Launch your first campaign",
            href: "https://example.com/start",
            backgroundColor: "#2563eb",
            textColor: "#ffffff",
            fontSize: 16,
            padding: 8,
            align: "left",
          },
        },
      ],
    },
  },
  {
    id: "newsletter",
    name: "Newsletter",
    subject: "This week at Nautilus",
    data: {
      content: [
        {
          type: "Heading",
          props: {
            id: "newsletter-heading",
            content: "Weekly Product Update",
            color: "#0f172a",
            fontSize: 30,
            padding: 8,
            align: "left",
          },
        },
        {
          type: "Image",
          props: {
            id: "newsletter-image",
            src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
            alt: "Product dashboard",
            href: "https://example.com/features",
            width: 560,
            padding: 8,
            align: "center",
          },
        },
        {
          type: "Section",
          props: {
            id: "newsletter-section",
            content:
              "- Faster load times\n- New drag-and-drop widgets\n- Better analytics for campaign results",
            backgroundColor: "#eff6ff",
            color: "#1e3a8a",
            fontSize: 16,
            padding: 14,
            align: "left",
          },
        },
        {
          type: "Button",
          props: {
            id: "newsletter-button",
            content: "Read full changelog",
            href: "https://example.com/changelog",
            backgroundColor: "#1d4ed8",
            textColor: "#ffffff",
            fontSize: 16,
            padding: 8,
            align: "left",
          },
        },
      ],
    },
  },
  {
    id: "promo",
    name: "Promo",
    subject: "Limited-time offer",
    data: {
      content: [
        {
          type: "Container",
          props: {
            id: "promo-container",
            content: "Use code NAUTILUS25 for 25% off your annual plan.",
            backgroundColor: "#fff7ed",
            color: "#9a3412",
            fontSize: 18,
            padding: 20,
            align: "center",
          },
        },
        {
          type: "Heading",
          props: {
            id: "promo-heading",
            content: "Summer Promotion",
            color: "#7c2d12",
            fontSize: 32,
            padding: 8,
            align: "center",
          },
        },
        {
          type: "Text",
          props: {
            id: "promo-text",
            content:
              "Upgrade today and unlock premium automation, advanced segmentation, and campaign insights.",
            color: "#7c2d12",
            fontSize: 17,
            padding: 8,
            align: "center",
          },
        },
        {
          type: "Button",
          props: {
            id: "promo-button",
            content: "Claim offer",
            href: "https://example.com/upgrade",
            backgroundColor: "#ea580c",
            textColor: "#ffffff",
            fontSize: 17,
            padding: 8,
            align: "center",
          },
        },
      ],
    },
  },
];

export const defaultTemplate = starterTemplates[0];
