import type { CharacterBundle } from './useSoulStore';

// sendCharacterSetup：将角色设定发送给后端/大模型
// TODO: 在此文件中填写真实 API Endpoint 与鉴权逻辑
export async function sendCharacterSetup(bundle: CharacterBundle) {
  const payload = {
    systemPrompt: bundle.systemPrompt,
    characterCard: bundle.characterCard,
    lorebook: bundle.lorebook
  };

  // TODO: 替换成真实 API 地址与鉴权 Header
  const response = await fetch('/api/character/setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to send character setup');
  }

  return response.json();
}