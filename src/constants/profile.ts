import { Ionicons } from '@expo/vector-icons';

export type ProfileAvatarOption = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  glow: string;
};

export const PROFILE_AVATARS: ProfileAvatarOption[] = [
  { id: 'aurora', icon: 'sunny', color: '#2563eb', glow: '#60a5fa' },
  { id: 'grove', icon: 'leaf', color: '#16a34a', glow: '#4ade80' },
  { id: 'ember', icon: 'flame', color: '#f97316', glow: '#fb923c' },
  { id: 'violet', icon: 'sparkles', color: '#7c3aed', glow: '#a78bfa' },
  { id: 'luna', icon: 'moon', color: '#1d4ed8', glow: '#93c5fd' },
];

export function getProfileAvatar(avatarId?: string) {
  return PROFILE_AVATARS.find((item) => item.id === avatarId) ?? PROFILE_AVATARS[0];
}
