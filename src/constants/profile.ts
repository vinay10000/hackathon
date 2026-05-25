export type ProfileAvatarOption = {
  id: string;
  imageUri: string;
  accent: string;
  glow: string;
};

export const PROFILE_AVATARS: ProfileAvatarOption[] = [
  { id: 'mason', imageUri: 'https://i.pravatar.cc/160?img=12', accent: '#7c3aed', glow: '#a78bfa' },
  { id: 'nina', imageUri: 'https://i.pravatar.cc/160?img=32', accent: '#16a34a', glow: '#4ade80' },
  { id: 'leo', imageUri: 'https://i.pravatar.cc/160?img=15', accent: '#2563eb', glow: '#60a5fa' },
  { id: 'zoe', imageUri: 'https://i.pravatar.cc/160?img=47', accent: '#f97316', glow: '#fb923c' },
  { id: 'kai', imageUri: 'https://i.pravatar.cc/160?img=60', accent: '#0f766e', glow: '#2dd4bf' },
];

export function getProfileAvatar(avatarId?: string) {
  return PROFILE_AVATARS.find((item) => item.id === avatarId) ?? PROFILE_AVATARS[0];
}
