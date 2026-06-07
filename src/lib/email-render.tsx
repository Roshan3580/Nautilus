import {
  Body,
  Button as EmailButton,
  Container as EmailContainer,
  Head,
  Heading as EmailHeading,
  Html,
  Img,
  Preview,
  Section as EmailSection,
  Text as EmailText,
} from "@react-email/components";
import { render } from "@react-email/render";
import type { CSSProperties, ReactElement } from "react";

import type {
  ButtonProps,
  ContainerProps,
  EmailBlock,
  EmailBuilderData,
  HeadingProps,
  ImageProps,
  SectionProps,
  TextProps,
} from "@/lib/puck-config";

const headingStyle = (props: HeadingProps): CSSProperties => ({
  margin: 0,
  color: props.color,
  fontSize: `${props.fontSize}px`,
  lineHeight: "1.2",
  textAlign: props.align,
  padding: `${props.padding}px`,
});

const textStyle = (props: TextProps): CSSProperties => ({
  margin: 0,
  color: props.color,
  fontSize: `${props.fontSize}px`,
  lineHeight: "1.6",
  textAlign: props.align,
  padding: `${props.padding}px`,
  whiteSpace: "pre-line",
});

const buttonWrapperStyle = (props: ButtonProps): CSSProperties => ({
  textAlign: props.align,
  padding: `${props.padding}px`,
});

const buttonStyle = (props: ButtonProps): CSSProperties => ({
  backgroundColor: props.backgroundColor,
  color: props.textColor,
  borderRadius: "8px",
  textDecoration: "none",
  padding: "10px 18px",
  fontWeight: 600,
  fontSize: `${props.fontSize}px`,
  display: "inline-block",
});

const imageWrapperStyle = (props: ImageProps): CSSProperties => ({
  textAlign: props.align,
  padding: `${props.padding}px`,
});

const imageStyle = (props: ImageProps): CSSProperties => ({
  width: "100%",
  maxWidth: `${props.width}px`,
  borderRadius: "10px",
  display: "inline-block",
});

const sectionStyle = (props: SectionProps): CSSProperties => ({
  margin: `${props.padding}px`,
  borderRadius: "12px",
  backgroundColor: props.backgroundColor,
  color: props.color,
  padding: `${props.padding}px`,
  textAlign: props.align,
  fontSize: `${props.fontSize}px`,
  lineHeight: "1.6",
  whiteSpace: "pre-line",
});

const containerStyle = (props: ContainerProps): CSSProperties => ({
  margin: `${props.padding}px`,
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  backgroundColor: props.backgroundColor,
  color: props.color,
  padding: `${props.padding}px`,
  textAlign: props.align,
  fontSize: `${props.fontSize}px`,
  lineHeight: "1.6",
  whiteSpace: "pre-line",
});

const renderBlock = (block: EmailBlock): ReactElement => {
  switch (block.type) {
    case "Heading":
      return (
        <EmailHeading as="h1" style={headingStyle(block.props)}>
          {block.props.content}
        </EmailHeading>
      );
    case "Text":
      return <EmailText style={textStyle(block.props)}>{block.props.content}</EmailText>;
    case "Button":
      return (
        <EmailSection style={buttonWrapperStyle(block.props)}>
          <EmailButton href={block.props.href} style={buttonStyle(block.props)}>
            {block.props.content}
          </EmailButton>
        </EmailSection>
      );
    case "Image":
      return (
        <EmailSection style={imageWrapperStyle(block.props)}>
          {block.props.href ? (
            <a href={block.props.href} style={{ display: "inline-block" }}>
              <Img src={block.props.src} alt={block.props.alt} style={imageStyle(block.props)} />
            </a>
          ) : (
            <Img src={block.props.src} alt={block.props.alt} style={imageStyle(block.props)} />
          )}
        </EmailSection>
      );
    case "Section":
      return <EmailSection style={sectionStyle(block.props)}>{block.props.content}</EmailSection>;
    case "Container":
      return (
        <EmailContainer style={containerStyle(block.props)}>{block.props.content}</EmailContainer>
      );
  }
};

export const EmailDocument = ({ data, subject }: { data: EmailBuilderData; subject: string }) => (
  <Html>
    <Head />
    <Preview>{subject || "Nautilus Email"}</Preview>
    <Body style={{ margin: 0, padding: "20px 0", backgroundColor: "#f8fafc" }}>
      <EmailContainer
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          overflow: "hidden",
          padding: "20px",
        }}
      >
        {data.content.map((block, index) => (
          <div key={`${block.type}-${index}`}>
            {renderBlock(block)}
          </div>
        ))}
      </EmailContainer>
    </Body>
  </Html>
);

export const renderEmailHtml = async (data: EmailBuilderData, subject: string): Promise<string> =>
  render(<EmailDocument data={data} subject={subject} />);
