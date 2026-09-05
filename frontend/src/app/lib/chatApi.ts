import { getApiBase } from "./apiBase";

const apiBase = getApiBase();

export interface ChatThreadSummary {
  inquiryId: number;
  truckId: string;
  truckLabel: string;
  truckRefNo?: string;
  preview: string;
  lastMessageAt: string;
  unreadCount: number;
  role: "seller" | "buyer";
  buyerEmail: string | null;
}

export interface ChatThreadsResponse {
  totalUnread: number;
  threads: ChatThreadSummary[];
}

export interface ChatMessage {
  id: number;
  senderUserId: number;
  senderEmail: string;
  body: string;
  createdAt: string;
}

export interface InquiryContext {
  truckId: string;
  truckLabel: string;
  truckRefNo?: string;
  role: "seller" | "buyer";
}

async function authHeaders(getAccessToken: () => string | null): Promise<HeadersInit> {
  const token = getAccessToken();
  const h: HeadersInit = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchChatThreads(
  getAccessToken: () => string | null,
): Promise<ChatThreadsResponse> {
  const res = await fetch(`${apiBase}/me/chat-threads`, {
    headers: await authHeaders(getAccessToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ChatThreadsResponse;
}

export async function fetchInquiryContext(
  inquiryId: number,
  getAccessToken: () => string | null,
): Promise<InquiryContext> {
  const res = await fetch(`${apiBase}/me/inquiries/${inquiryId}/context`, {
    headers: await authHeaders(getAccessToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as InquiryContext;
}

export async function fetchInquiryMessages(
  inquiryId: number,
  getAccessToken: () => string | null,
): Promise<ChatMessage[]> {
  const res = await fetch(`${apiBase}/me/inquiries/${inquiryId}/messages`, {
    headers: await authHeaders(getAccessToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ChatMessage[];
}

export async function postInquiryMessage(
  inquiryId: number,
  body: string,
  getAccessToken: () => string | null,
): Promise<ChatMessage> {
  const res = await fetch(`${apiBase}/me/inquiries/${inquiryId}/messages`, {
    method: "POST",
    headers: {
      ...(await authHeaders(getAccessToken)),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ChatMessage;
}

export async function markInquiryRead(
  inquiryId: number,
  getAccessToken: () => string | null,
): Promise<void> {
  const res = await fetch(`${apiBase}/me/inquiries/${inquiryId}/read`, {
    method: "POST",
    headers: await authHeaders(getAccessToken),
  });
  if (!res.ok) throw new Error(await res.text());
}
