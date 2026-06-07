import type { Config } from "@puckeditor/core";

type EmailBlockType =
  | "Heading"
  | "Text"
  | "Button"
  | "Image"
  | "Section"
  | "Container";

export type Align = "left" | "center" | "right";

export type HeadingProps = {
  id?: string;
  content: string;
  color: string;
  fontSize: number;
  padding: number;
  align: Align;
};

export type TextProps = {
  id?: string;
  content: string;
  color: string;
  fontSize: number;
  padding: number;
  align: Align;
};

export type ButtonProps = {
  id?: string;
  content: string;
  href: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  padding: number;
  align: Align;
};

export type ImageProps = {
  id?: string;
  src: string;
  alt: string;
  href: string;
  width: number;
  padding: number;
  align: Align;
};

export type SectionProps = {
  id?: string;
  content: string;
  backgroundColor: string;
  color: string;
  fontSize: number;
  padding: number;
  align: Align;
};

export type ContainerProps = {
  id?: string;
  backgroundColor: string;
  color: string;
  fontSize: number;
  padding: number;
  align: Align;
  content: string;
};

type EmailBlockByType = {
  Heading: HeadingProps;
  Text: TextProps;
  Button: ButtonProps;
  Image: ImageProps;
  Section: SectionProps;
  Container: ContainerProps;
};

export type EmailBlock = {
  [K in EmailBlockType]: {
    type: K;
    props: EmailBlockByType[K];
  };
}[EmailBlockType];

export type EmailBuilderData = {
  content: EmailBlock[];
};

const alignmentOptions = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
] as const;

export const puckConfig: Config = {
  categories: {
    typography: {
      title: "Typography",
      components: ["Heading", "Text"],
    },
    content: {
      title: "Content",
      components: ["Button", "Image"],
    },
    layout: {
      title: "Layout",
      components: ["Section", "Container"],
    },
  },
  components: {
    Heading: {
      label: "Heading",
      fields: {
        content: { type: "text", label: "Heading" },
        color: { type: "text", label: "Text Color" },
        fontSize: { type: "number", label: "Font Size" },
        padding: { type: "number", label: "Padding" },
        align: { type: "select", label: "Alignment", options: alignmentOptions },
      },
      defaultProps: {
        content: "Welcome aboard",
        color: "#111827",
        fontSize: 32,
        padding: 8,
        align: "left",
      },
      render: ({ content, color, fontSize, padding, align }) => (
        <h1
          style={{
            margin: 0,
            color,
            fontSize: `${fontSize}px`,
            lineHeight: 1.2,
            textAlign: align,
            padding: `${padding}px`,
          }}
        >
          {content}
        </h1>
      ),
    },
    Text: {
      label: "Text",
      fields: {
        content: { type: "textarea", label: "Body" },
        color: { type: "text", label: "Text Color" },
        fontSize: { type: "number", label: "Font Size" },
        padding: { type: "number", label: "Padding" },
        align: { type: "select", label: "Alignment", options: alignmentOptions },
      },
      defaultProps: {
        content: "Write your message here.",
        color: "#374151",
        fontSize: 16,
        padding: 8,
        align: "left",
      },
      render: ({ content, color, fontSize, padding, align }) => (
        <p
          style={{
            margin: 0,
            color,
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
            textAlign: align,
            padding: `${padding}px`,
            whiteSpace: "pre-line",
          }}
        >
          {content}
        </p>
      ),
    },
    Button: {
      label: "Button",
      fields: {
        content: { type: "text", label: "Label" },
        href: { type: "text", label: "URL" },
        backgroundColor: { type: "text", label: "Button Color" },
        textColor: { type: "text", label: "Text Color" },
        fontSize: { type: "number", label: "Font Size" },
        padding: { type: "number", label: "Padding" },
        align: { type: "select", label: "Alignment", options: alignmentOptions },
      },
      defaultProps: {
        content: "Get started",
        href: "https://example.com",
        backgroundColor: "#2563eb",
        textColor: "#ffffff",
        fontSize: 16,
        padding: 8,
        align: "left",
      },
      render: ({ content, href, backgroundColor, textColor, fontSize, padding, align }) => (
        <div style={{ textAlign: align, padding: `${padding}px` }}>
          <a
            href={href}
            style={{
              display: "inline-block",
              backgroundColor,
              color: textColor,
              borderRadius: "8px",
              textDecoration: "none",
              padding: "10px 18px",
              fontSize: `${fontSize}px`,
              fontWeight: 600,
            }}
          >
            {content}
          </a>
        </div>
      ),
    },
    Image: {
      label: "Image",
      fields: {
        src: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt Text" },
        href: { type: "text", label: "Link URL" },
        width: { type: "number", label: "Width" },
        padding: { type: "number", label: "Padding" },
        align: { type: "select", label: "Alignment", options: alignmentOptions },
      },
      defaultProps: {
        src: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200",
        alt: "Banner",
        href: "",
        width: 560,
        padding: 8,
        align: "center",
      },
      render: ({ src, alt, href, width, padding, align }) => {
        const image = (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{
              width: "100%",
              maxWidth: `${width}px`,
              borderRadius: "10px",
              display: "inline-block",
            }}
          />
        );

        return (
          <div style={{ textAlign: align, padding: `${padding}px` }}>
            {href ? (
              <a href={href} style={{ display: "inline-block" }}>
                {image}
              </a>
            ) : (
              image
            )}
          </div>
        );
      },
    },
    Section: {
      label: "Section",
      fields: {
        content: { type: "textarea", label: "Content" },
        backgroundColor: { type: "text", label: "Background" },
        color: { type: "text", label: "Text Color" },
        fontSize: { type: "number", label: "Font Size" },
        padding: { type: "number", label: "Padding" },
        align: { type: "select", label: "Alignment", options: alignmentOptions },
      },
      defaultProps: {
        content: "Add a highlighted section of text.",
        backgroundColor: "#f3f4f6",
        color: "#111827",
        fontSize: 16,
        padding: 16,
        align: "left",
      },
      render: ({ content, backgroundColor, color, fontSize, padding, align }) => (
        <section
          style={{
            margin: `${padding}px`,
            borderRadius: "12px",
            backgroundColor,
            color,
            padding: `${padding}px`,
            textAlign: align,
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {content}
        </section>
      ),
    },
    Container: {
      label: "Container",
      fields: {
        content: { type: "textarea", label: "Content" },
        backgroundColor: { type: "text", label: "Background" },
        color: { type: "text", label: "Text Color" },
        fontSize: { type: "number", label: "Font Size" },
        padding: { type: "number", label: "Padding" },
        align: { type: "select", label: "Alignment", options: alignmentOptions },
      },
      defaultProps: {
        content: "Use this as your email container body.",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        fontSize: 16,
        padding: 20,
        align: "left",
      },
      render: ({ content, backgroundColor, color, fontSize, padding, align }) => (
        <div
          style={{
            margin: `${padding}px`,
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            backgroundColor,
            color,
            padding: `${padding}px`,
            textAlign: align,
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {content}
        </div>
      ),
    },
  },
};
