import { z } from "zod";

export const CHAT_REQUEST_LIMITS = {
  maxMessages: 50,
  maxMessageIdLength: 128,
  maxTextPartsPerMessage: 12,
  maxTextPartLength: 4_000,
  maxTotalTextLength: 12_000,
  maxModelIdLength: 120,
} as const;

const chatMessageMetadataSchema = z
  .object({
    excludeFromModel: z.boolean().optional(),
    abortNotice: z.boolean().optional(),
    aborted: z.boolean().optional(),
  })
  .strict();

const providerMetadataSchema = z.record(
  z.string(),
  z.record(z.string(), z.json()),
);

const textPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength),
    state: z.enum(["streaming", "done"]).optional(),
    providerMetadata: providerMetadataSchema.optional(),
  })
  .strict();

const reasoningPartSchema = z
  .object({
    type: z.literal("reasoning"),
    text: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength),
    state: z.enum(["streaming", "done"]).optional(),
    providerMetadata: providerMetadataSchema.optional(),
  })
  .strict();

const sourceUrlPartSchema = z
  .object({
    type: z.literal("source-url"),
    sourceId: z.string().max(CHAT_REQUEST_LIMITS.maxMessageIdLength),
    url: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength),
    title: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength).optional(),
    providerMetadata: providerMetadataSchema.optional(),
  })
  .strict();

const sourceDocumentPartSchema = z
  .object({
    type: z.literal("source-document"),
    sourceId: z.string().max(CHAT_REQUEST_LIMITS.maxMessageIdLength),
    mediaType: z.string().max(255),
    title: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength),
    filename: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength).optional(),
    providerMetadata: providerMetadataSchema.optional(),
  })
  .strict();

const filePartSchema = z
  .object({
    type: z.literal("file"),
    mediaType: z.string().max(255),
    filename: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength).optional(),
    url: z.string().max(CHAT_REQUEST_LIMITS.maxTextPartLength),
    providerMetadata: providerMetadataSchema.optional(),
  })
  .strict();

const stepStartPartSchema = z
  .object({
    type: z.literal("step-start"),
  })
  .strict();

const textBearingPartSchema = z.union([textPartSchema, reasoningPartSchema]);

const messagePartSchema = z.union([
  textPartSchema,
  reasoningPartSchema,
  sourceUrlPartSchema,
  sourceDocumentPartSchema,
  filePartSchema,
  stepStartPartSchema,
]);

type MessagePart = z.infer<typeof messagePartSchema>;
type TextBearingPart = z.infer<typeof textBearingPartSchema>;

function isTextBearingPart(part: MessagePart): part is TextBearingPart {
  return part.type === "text" || part.type === "reasoning";
}

const messageSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(CHAT_REQUEST_LIMITS.maxMessageIdLength),
    role: z.enum(["system", "user", "assistant"]),
    metadata: chatMessageMetadataSchema.optional(),
    parts: z
      .array(messagePartSchema)
      .min(1)
      .max(CHAT_REQUEST_LIMITS.maxTextPartsPerMessage),
  })
  .strict()
  .superRefine((message, ctx) => {
    if (!message.parts.some((part) => part.type === "text")) {
      ctx.addIssue({
        code: "custom",
        path: ["parts"],
        message: "Message must contain at least one text part.",
      });
    }
  });

const modelSchema = z
  .string()
  .min(1)
  .max(CHAT_REQUEST_LIMITS.maxModelIdLength)
  .optional();

const aiSdkTriggerSchema = z
  .enum(["submit-message", "regenerate-message"])
  .optional();

const optionalTransportIdSchema = z
  .string()
  .min(1)
  .max(CHAT_REQUEST_LIMITS.maxMessageIdLength)
  .optional();

function totalTextLength(messages: Array<z.infer<typeof messageSchema>>) {
  return messages.reduce(
    (messageTotal, message) =>
      messageTotal +
      message.parts.reduce(
        (partTotal, part) =>
          isTextBearingPart(part)
            ? partTotal + part.text.length
            : partTotal,
        0,
      ),
    0,
  );
}

function validateTotalTextLength(
  value: { messages: Array<z.infer<typeof messageSchema>> },
  ctx: z.RefinementCtx,
) {
  if (totalTextLength(value.messages) > CHAT_REQUEST_LIMITS.maxTotalTextLength) {
    ctx.addIssue({
      code: "custom",
      path: ["messages"],
      message: `Total message text must be at most ${CHAT_REQUEST_LIMITS.maxTotalTextLength} characters.`,
    });
  }
}

export const chatRequestSchema = z
  .object({
    id: optionalTransportIdSchema,
    messages: z
      .array(messageSchema)
      .min(1)
      .max(CHAT_REQUEST_LIMITS.maxMessages),
    messageId: optionalTransportIdSchema,
    model: modelSchema,
    trigger: aiSdkTriggerSchema,
  })
  .strict()
  .superRefine(validateTotalTextLength);

export const suggestionsRequestSchema = z
  .object({
    messages: z
      .array(messageSchema)
      .min(1)
      .max(CHAT_REQUEST_LIMITS.maxMessages),
    chatModel: modelSchema,
    model: modelSchema,
  })
  .strict()
  .superRefine(validateTotalTextLength);

export function parseChatRequestBody(body: unknown) {
  return chatRequestSchema.safeParse(body);
}

export function parseSuggestionsRequestBody(body: unknown) {
  return suggestionsRequestSchema.safeParse(body);
}
