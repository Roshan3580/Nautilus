import type { EmailBlock, EmailBuilderData } from "@/lib/puck-config";

const createBlockId = (type: string): string =>
  `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const hasBlockId = (props: EmailBlock["props"]): props is EmailBlock["props"] & { id: string } =>
  "id" in props && typeof props.id === "string" && props.id.length > 0;

export const ensureEmailDataIds = (data: EmailBuilderData): EmailBuilderData => ({
  content: data.content.map((block) => {
    if (hasBlockId(block.props)) {
      return block;
    }

    return {
      ...block,
      props: {
        ...block.props,
        id: createBlockId(block.type),
      },
    } as EmailBlock;
  }),
});
