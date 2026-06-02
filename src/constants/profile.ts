import { ImageSourcePropType } from 'react-native';

export type ProfileAvatarOption = {
  id: string;
  image: ImageSourcePropType;
  accent: string;
  glow: string;
};

export const PROFILE_AVATARS: ProfileAvatarOption[] = [
  {
    id: 'mason',
    image: require('../../assets/images/pfp/anime-pfp-of-tanjiro-kamado-from-demon-slayer-backlighting.webp'),
    accent: '#7c3aed',
    glow: '#a78bfa',
  },
  {
    id: 'nina',
    image: require('../../assets/images/pfp/jujutsu-kaisen-gojo-satoru-pfp-shy-golden-hour-edge-plain.webp'),
    accent: '#16a34a',
    glow: '#4ade80',
  },
  {
    id: 'leo',
    image: require('../../assets/images/pfp/levi-ackerman-pfp-from-attack-on-titan-fighting-late-night-calm.webp'),
    accent: '#2563eb',
    glow: '#60a5fa',
  },
  {
    id: 'zoe',
    image: require('../../assets/images/pfp/mikasa-ackerman-avatar-in-lens-light-attack-on-titan-sleepy.webp'),
    accent: '#f97316',
    glow: '#fb923c',
  },
  {
    id: 'kai',
    image: require('../../assets/images/pfp/mikasa-ackerman-pfp-from-attack-on-titan-running-golden-hour-edge.webp'),
    accent: '#0f766e',
    glow: '#2dd4bf',
  },
];

export function getProfileAvatar(avatarId?: string) {
  return PROFILE_AVATARS.find((item) => item.id === avatarId) ?? PROFILE_AVATARS[0];
}
