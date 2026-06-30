import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  secondaryColor?: string;
};

export function AssistantWaveIcon({ size = 32, color = '#BFA8FF' }: IconProps) {
  const mid = size / 2;
  const stroke = Math.max(2, size * 0.08);
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G stroke={color} strokeWidth={stroke} strokeLinecap="round">
        <Line x1="7" y1="19" x2="7" y2="13" opacity="0.72" />
        <Line x1="13" y1="22.5" x2="13" y2="9.5" />
        <Line x1={mid} y1="26" x2={mid} y2="6" />
        <Line x1="19" y1="22.5" x2="19" y2="9.5" />
        <Line x1="25" y1="19" x2="25" y2="13" opacity="0.72" />
      </G>
    </Svg>
  );
}

export function RunningShoeIcon({ size = 26, color = '#F4F0FF', secondaryColor = '#9A86E8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M5 21.8c2.8-.5 5.8-3.4 7.4-6.2l2.5 1.3c1.6.8 2.9 2.3 4.8 2.7l4 .8c1.7.3 2.9 1.8 2.9 3.5v1H5.4c-1.1 0-2-.9-2-2 0-.5.2-.9.4-1.1.3-.3.7-.6 1.2-.7Z"
        fill={color}
      />
      <Path d="M15.3 15.2 18 9.7l2 1.2-1.8 4" stroke={secondaryColor} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M8.8 20.4h4.7M14.8 21.7h4.8M20.8 23h3.8" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </Svg>
  );
}

export function BookIcon({ size = 26, color = '#F4F0FF', secondaryColor = '#9A86E8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M6 9.5c0-2 1.6-3.5 3.6-3.5H16v18H9.6A3.6 3.6 0 0 0 6 27.6V9.5Z" fill={color} opacity="0.96" />
      <Path d="M26 9.5c0-2-1.6-3.5-3.6-3.5H16v18h6.4a3.6 3.6 0 0 1 3.6 3.6V9.5Z" fill={color} opacity="0.82" />
      <Line x1="16" y1="6.5" x2="16" y2="24.5" stroke={secondaryColor} strokeWidth="1.6" opacity="0.95" />
    </Svg>
  );
}

export function StackBooksIcon({ size = 26, color = '#F4F0FF', secondaryColor = '#9A86E8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M6 10.4 16 6l10 4.4-10 4.2L6 10.4Z" fill={color} />
      <Path d="M6 16 16 11.8 26 16 16 20.2 6 16Z" fill={color} opacity="0.82" />
      <Path d="M6 21.6 16 17.4 26 21.6 16 25.8 6 21.6Z" fill={color} opacity="0.66" />
      <Line x1="16" y1="6.8" x2="16" y2="25" stroke={secondaryColor} strokeWidth="1.2" opacity="0.7" />
    </Svg>
  );
}

export function DocumentIcon({ size = 26, color = '#F4F0FF', secondaryColor = '#9A86E8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M9 5h9l5 5v15.2A2.8 2.8 0 0 1 20.2 28H9.8A2.8 2.8 0 0 1 7 25.2V7.8A2.8 2.8 0 0 1 9.8 5H9Z" fill={color} opacity="0.95" />
      <Path d="M18 5v5h5" stroke={secondaryColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="11" y1="16" x2="21" y2="16" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="11" y1="20.5" x2="19" y2="20.5" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.84" />
    </Svg>
  );
}

export function SparkleIcon({ size = 16, color = '#B894FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 1.3 9.5 5 13.2 6.5 9.5 8 8 11.7 6.5 8 2.8 6.5 6.5 5 8 1.3Z" fill={color} />
      <Circle cx="12.7" cy="2.8" r="1" fill={color} opacity="0.9" />
    </Svg>
  );
}

export function ShieldSparkIcon({ size = 18, color = '#46DBC8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 2.4 16 4.8v4.4c0 3.8-2.2 6.2-6 8.4-3.8-2.2-6-4.6-6-8.4V4.8l6-2.4Z" stroke={color} strokeWidth="1.6" fill="none" />
      <Path d="M10 5.3 11 7.7l2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4Z" fill={color} />
    </Svg>
  );
}

export function CalendarMiniIcon({ size = 16, color = '#BFC8D8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect x="2.2" y="3.5" width="11.6" height="10" rx="2" stroke={color} strokeWidth="1.4" fill="none" />
      <Line x1="2.8" y1="6.2" x2="13.2" y2="6.2" stroke={color} strokeWidth="1.4" />
      <Line x1="5.1" y1="2.1" x2="5.1" y2="4.8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Line x1="10.9" y1="2.1" x2="10.9" y2="4.8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function ChangeListIcon({ size = 16, color = '#BFC8D8', secondaryColor = '#46DBC8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Circle cx="3" cy="4" r="1.2" fill={color} />
      <Circle cx="3" cy="8" r="1.2" fill={color} />
      <Circle cx="3" cy="12" r="1.2" fill={secondaryColor} />
      <Line x1="6" y1="4" x2="13" y2="4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Line x1="6" y1="8" x2="13" y2="8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Line x1="6" y1="12" x2="13" y2="12" stroke={secondaryColor} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function StreakDropIcon({ size = 16, color = '#BFC8D8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 2.1c1.8 2.6 4.2 5 4.2 7.5A4.2 4.2 0 0 1 8 13.8a4.2 4.2 0 0 1-4.2-4.2c0-2.5 2.4-5 4.2-7.5Z" stroke={color} strokeWidth="1.4" fill="none" />
      <Path d="M6.6 9.6c.5.8 1 .9 1.4.9.7 0 1.1-.4 1.4-1" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function ProgressRingIcon({ size = 70, color = '#46DBC8', secondaryColor = '#3E2A68' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 70 70">
      <Circle cx="35" cy="35" r="24" stroke={secondaryColor} strokeWidth="6" fill="none" opacity="0.75" />
      <Circle
        cx="35"
        cy="35"
        r="24"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="104 151"
        transform="rotate(-90 35 35)"
        fill="none"
      />
    </Svg>
  );
}

export function BookOrbIcon({ size = 52, color = '#46DBC8', secondaryColor = '#17363F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Defs>
        <LinearGradient id="bookOrb" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#102228" />
          <Stop offset="1" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      <Circle cx="26" cy="26" r="24" fill="url(#bookOrb)" stroke={color} strokeOpacity="0.35" />
      <G transform="translate(12 13)">
        <Path d="M2 3.4c0-1.7 1.3-3 2.9-3H14v19H4.9A2.9 2.9 0 0 0 2 22.3V3.4Z" fill={color} />
        <Path d="M26 3.4c0-1.7-1.3-3-2.9-3H14v19h9.1a2.9 2.9 0 0 1 2.9 2.9V3.4Z" fill={color} opacity="0.84" />
      </G>
    </Svg>
  );
}

