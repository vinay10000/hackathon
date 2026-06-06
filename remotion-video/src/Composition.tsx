import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const palette = {
  background: "#05070b",
  backgroundSoft: "#0c1220",
  surface: "rgba(15, 23, 38, 0.82)",
  surfaceStrong: "rgba(17, 29, 47, 0.96)",
  border: "rgba(255, 255, 255, 0.09)",
  text: "#f7fbff",
  textMuted: "#b6c2d2",
  purple: "#a78bfa",
  teal: "#5eead4",
  amber: "#fb923c",
};

const screenshots = [
  "habitai-playstore-promo-1.jpg",
  "habitai-playstore-promo-2.jpg",
  "habitai-playstore-promo-3.jpg",
  "habitai-playstore-promo-4.jpg",
];

const sceneDuration = 90;

const absoluteCenter: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "center",
};

const fullSize: React.CSSProperties = {
  height: "100%",
  width: "100%",
};

const titleStyle: React.CSSProperties = {
  color: palette.text,
  fontFamily: '"Inter", "Segoe UI", sans-serif',
  fontSize: 84,
  fontWeight: 800,
  letterSpacing: -3,
  lineHeight: 0.96,
  margin: 0,
  maxWidth: 760,
};

const bodyStyle: React.CSSProperties = {
  color: palette.textMuted,
  fontFamily: '"Inter", "Segoe UI", sans-serif',
  fontSize: 34,
  fontWeight: 500,
  letterSpacing: -0.7,
  lineHeight: 1.3,
  margin: 0,
  maxWidth: 720,
};

const chipStyle = (tone: string): React.CSSProperties => ({
  backdropFilter: "blur(12px)",
  background: tone,
  border: `1px solid ${palette.border}`,
  borderRadius: 999,
  color: palette.text,
  fontFamily: '"Inter", "Segoe UI", sans-serif',
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: 0.5,
  padding: "14px 24px",
});

const getEntrance = (frame: number, start: number, fps: number, delay = 0) => {
  const localFrame = Math.max(0, frame - start - delay);
  const eased = spring({
    fps,
    frame: localFrame,
    config: {
      damping: 18,
      mass: 0.9,
      stiffness: 120,
    },
  });

  return {
    opacity: interpolate(eased, [0, 1], [0, 1]),
    translateY: interpolate(eased, [0, 1], [42, 0]),
    scale: interpolate(eased, [0, 1], [0.96, 1]),
  };
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${22 + drift * 18}% ${18 + drift * 10}%, rgba(167,139,250,0.32), transparent 34%),
          radial-gradient(circle at ${82 - drift * 10}% ${78 - drift * 18}%, rgba(94,234,212,0.2), transparent 28%),
          linear-gradient(180deg, ${palette.backgroundSoft} 0%, ${palette.background} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundPosition: `${drift * 80}px ${drift * 50}px`,
          backgroundSize: "120px 120px",
          opacity: 0.22,
        }}
      />
    </AbsoluteFill>
  );
};

const ScreenshotCard: React.FC<{
  file: string;
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
}> = ({ file, rotation, x, y, width, height }) => {
  const frame = useCurrentFrame();
  const floatY = interpolate(frame, [0, 300], [0, -24], {
    easing: Easing.bezier(0.37, 0, 0.63, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  const pulse = interpolate(Math.sin(frame / 18), [-1, 1], [0.92, 1]);
  return (
    <div
      style={{
        backdropFilter: "blur(18px)",
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${palette.border}`,
        borderRadius: 42,
        boxShadow: "0 30px 120px rgba(0,0,0,0.45)",
        height,
        left: x,
        overflow: "hidden",
        position: "absolute",
        top: y + floatY,
        transform: `rotate(${rotation}deg) scale(${pulse})`,
        width,
      }}
    >
      <Img src={staticFile(file)} style={{ ...fullSize, objectFit: "cover" }} />
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 26%, rgba(0,0,0,0.1) 100%)",
          inset: 0,
          position: "absolute",
        }}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 8,
          left: 22,
          position: "absolute",
          top: 18,
        }}
      >
        <span style={{ ...chipStyle("rgba(12,18,32,0.78)"), fontSize: 18, padding: "8px 14px" }}>
          HabitAI
        </span>
        <span
          style={{
            ...chipStyle("rgba(94,234,212,0.16)"),
            color: palette.teal,
            fontSize: 18,
            padding: "8px 14px",
          }}
        >
          real app
        </span>
      </div>
    </div>
  );
};

const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = getEntrance(frame, 0, fps, 0);
  const copyIn = getEntrance(frame, 0, fps, 10);
  const cardIn = getEntrance(frame, 0, fps, 18);

  return (
    <AbsoluteFill style={{ padding: "130px 90px" }}>
      <div
        style={{
          ...absoluteCenter,
          flexDirection: "column",
          gap: 26,
          left: 90,
          position: "absolute",
          top: 120,
          transform: `translateY(${titleIn.translateY}px) scale(${titleIn.scale})`,
          transformOrigin: "top left",
        }}
      >
        <div style={{ ...chipStyle("rgba(167,139,250,0.15)"), color: palette.purple, opacity: titleIn.opacity }}>
          VOICE-FIRST HABITS
        </div>
        <h1 style={{ ...titleStyle, opacity: titleIn.opacity }}>
          Speak your habits.
          <br />
          Keep your focus.
        </h1>
        <p style={{ ...bodyStyle, opacity: copyIn.opacity, transform: `translateY(${copyIn.translateY}px)` }}>
          HabitAI turns plain-language intent into calm plans, daily momentum, and an assistant
          that confirms before it changes anything.
        </p>
      </div>

      <div
        style={{
          backdropFilter: "blur(16px)",
          background: palette.surfaceStrong,
          border: `1px solid ${palette.border}`,
          borderRadius: 44,
          bottom: 120,
          boxShadow: "0 30px 100px rgba(0,0,0,0.45)",
          left: 90,
          padding: 28,
          position: "absolute",
          width: 520,
          opacity: cardIn.opacity,
          transform: `translateY(${cardIn.translateY}px)`,
        }}
      >
        <div style={{ color: palette.textMuted, fontFamily: '"Inter", "Segoe UI", sans-serif', fontSize: 22, marginBottom: 16 }}>
          Example flow
        </div>
        <div style={{ color: palette.text, fontFamily: '"Inter", "Segoe UI", sans-serif', fontSize: 30, fontWeight: 700, lineHeight: 1.35 }}>
          “Add reading for 20 minutes every night at 9.”
        </div>
        <div style={{ color: palette.teal, fontFamily: '"Inter", "Segoe UI", sans-serif', fontSize: 24, fontWeight: 700, marginTop: 16 }}>
          Habit: Reading · Duration: 20 min · Reminder: 9:00 pm
        </div>
      </div>

      <div
        style={{
          opacity: cardIn.opacity,
          position: "absolute",
          right: 72,
          top: 180,
          transform: `translateY(${cardIn.translateY}px) scale(${cardIn.scale})`,
        }}
      >
        <ScreenshotCard file={screenshots[0]} rotation={-6} x={0} y={0} width={420} height={780} />
        <ScreenshotCard file={screenshots[1]} rotation={7} x={240} y={300} width={360} height={660} />
      </div>
    </AbsoluteFill>
  );
};

const FeatureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leftIn = getEntrance(frame, 0, fps, 0);
  const rightIn = getEntrance(frame, 0, fps, 8);

  const features = [
    { label: "Today stays simple", tone: "rgba(94,234,212,0.14)" },
    { label: "Real streaks and history", tone: "rgba(251,146,60,0.16)" },
    { label: "Assistant with confirmation-first actions", tone: "rgba(167,139,250,0.16)" },
    { label: "Local-first privacy by default", tone: "rgba(96,165,250,0.16)" },
  ];

  return (
    <AbsoluteFill style={{ padding: "120px 84px" }}>
      <div
        style={{
          left: 84,
          position: "absolute",
          top: 150,
          width: 430,
          opacity: leftIn.opacity,
          transform: `translateY(${leftIn.translateY}px)`,
        }}
      >
        <div style={{ ...chipStyle("rgba(94,234,212,0.14)"), color: palette.teal, display: "inline-flex", marginBottom: 24 }}>
          WHAT MAKES IT DIFFERENT
        </div>
        <h2 style={{ ...titleStyle, fontSize: 78, maxWidth: 430 }}>
          Built for calm,
          <br />
          not clutter.
        </h2>
        <p style={{ ...bodyStyle, fontSize: 30, marginTop: 22, maxWidth: 400 }}>
          The app already has real onboarding, reminders, analytics, voice, and AI-assisted habit
          planning. This promo uses that actual product story.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 18,
          position: "absolute",
          right: 80,
          top: 150,
          width: 490,
          opacity: rightIn.opacity,
          transform: `translateY(${rightIn.translateY}px)`,
        }}
      >
        {features.map((feature, index) => {
          const entry = getEntrance(frame, 0, fps, 12 + index * 6);
          return (
            <div
              key={feature.label}
              style={{
                backdropFilter: "blur(14px)",
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 34,
                display: "flex",
                gap: 16,
                opacity: entry.opacity,
                padding: "24px 24px",
                transform: `translateY(${entry.translateY}px)`,
              }}
            >
              <div
                style={{
                  ...absoluteCenter,
                  background: feature.tone,
                  borderRadius: 20,
                  color: palette.text,
                  fontFamily: '"Inter", "Segoe UI", sans-serif',
                  fontSize: 28,
                  fontWeight: 800,
                  height: 54,
                  minWidth: 54,
                }}
              >
                0{index + 1}
              </div>
              <div style={{ color: palette.text, fontFamily: '"Inter", "Segoe UI", sans-serif', fontSize: 29, fontWeight: 700, lineHeight: 1.25 }}>
                {feature.label}
              </div>
            </div>
          );
        })}
      </div>

      <ScreenshotCard file={screenshots[2]} rotation={-5} x={84} y={1000} width={250} height={460} />
      <ScreenshotCard file={screenshots[3]} rotation={5} x={380} y={960} width={250} height={460} />
    </AbsoluteFill>
  );
};

const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = getEntrance(frame, 0, fps, 0);
  const titleIn = getEntrance(frame, 0, fps, 8);
  const ctaIn = getEntrance(frame, 0, fps, 18);

  return (
    <AbsoluteFill style={absoluteCenter}>
      <div
        style={{
          ...absoluteCenter,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${palette.border}`,
          borderRadius: 60,
          boxShadow: "0 30px 120px rgba(0,0,0,0.45)",
          flexDirection: "column",
          gap: 28,
          height: 1220,
          padding: "90px 70px",
          width: 860,
        }}
      >
        <div
          style={{
            ...absoluteCenter,
            background: "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(94,234,212,0.2))",
            border: `1px solid ${palette.border}`,
            borderRadius: 42,
            height: 180,
            opacity: logoIn.opacity,
            transform: `translateY(${logoIn.translateY}px) scale(${logoIn.scale})`,
            width: 180,
          }}
        >
          <Img src={staticFile("app-icon.svg")} style={{ height: 112, width: 112 }} />
        </div>

        <div style={{ ...chipStyle("rgba(94,234,212,0.14)"), color: palette.teal, opacity: titleIn.opacity }}>
          HABITAI
        </div>
        <h2
          style={{
            ...titleStyle,
            fontSize: 88,
            maxWidth: 700,
            opacity: titleIn.opacity,
            textAlign: "center",
            transform: `translateY(${titleIn.translateY}px)`,
          }}
        >
          The calmest habit tracker you can talk to.
        </h2>
        <p
          style={{
            ...bodyStyle,
            fontSize: 32,
            maxWidth: 670,
            opacity: ctaIn.opacity,
            textAlign: "center",
            transform: `translateY(${ctaIn.translateY}px)`,
          }}
        >
          Voice-first. Local-first. Built around real daily momentum instead of dashboard noise.
        </p>
        <div
          style={{
            ...chipStyle("linear-gradient(135deg, rgba(167,139,250,0.22), rgba(94,234,212,0.22))"),
            fontSize: 28,
            opacity: ctaIn.opacity,
            transform: `translateY(${ctaIn.translateY}px)`,
          }}
        >
          Android beta available now
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const HabitAiPromo = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence durationInFrames={sceneDuration}>
        <HeroScene />
      </Sequence>
      <Sequence from={sceneDuration} durationInFrames={sceneDuration}>
        <FeatureScene />
      </Sequence>
      <Sequence from={sceneDuration * 2} durationInFrames={sceneDuration}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
