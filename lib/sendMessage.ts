import type { CharacterBundle } from './useSoulStore';

export type ChatContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: ChatContentItem[];
};

export type SendMessageInput = {
  text: string;
  images?: string[];
  history: ChatMessage[];
  bundle: CharacterBundle;
};

// sendMessage：多模态消息发送预留函数
// TODO: 替换为真实的 API Endpoint / SDK 调用
export async function sendMessage({ text, images = [], history, bundle }: SendMessageInput) {
  const userContent: ChatContentItem[] = [];
  if (text.trim()) {
    userContent.push({ type: 'text', text: text.trim() });
  }
  images.forEach((image) => {
    userContent.push({ type: 'image_url', image_url: { url: image } });
  });

  const payload = {
    messages: [
      {
        role: 'system',
        content: [{ type: 'text', text: JSON.stringify(bundle.characterCard) }]
      },
      {
        role: 'system',
        content: [{ type: 'text', text: JSON.stringify(bundle.lorebook) }]
      },
      ...history,
      { role: 'user', content: userContent }
    ]
  };

  // TODO: 预留真实 API 调用
  // const response = await fetch('/api/chat', { method: 'POST', body: JSON.stringify(payload) })
  // return await response.json()

  return {
    payload,
    reply: '已收到你的共创请求，我会根据记忆与设定生成回应。'
  };
}