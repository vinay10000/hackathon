const path = require("path");
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "HabitAI";
pptx.subject = "HabitAI 4-slide pitch deck";
pptx.title = "HabitAI Pitch Deck";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US",
};

const outPath = path.resolve(__dirname, "..", "HabitAI-pitch-deck.pptx");
const assistantImage = path.resolve(
  __dirname,
  "..",
  "assistant-ui-fix-check-2.png"
);

const colors = {
  ink: "0B1220",
  text: "1E293B",
  muted: "64748B",
  blue: "2563EB",
  cyan: "06B6D4",
  sky: "E0F2FE",
  pale: "F8FAFC",
  line: "D7E3F1",
  white: "FFFFFF",
  navy: "061225",
  green: "0F766E",
};

function addBg(slide, accent = colors.blue) {
  slide.background = { color: colors.white };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: colors.white },
    line: { color: colors.white, transparency: 100 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.18,
    fill: { color: accent },
    line: { color: accent, transparency: 100 },
  });
}

function addTitle(slide, kicker, title, subtitle) {
  slide.addText(kicker, {
    x: 0.7,
    y: 0.45,
    w: 2.8,
    h: 0.25,
    fontFace: "Aptos",
    fontSize: 11,
    bold: true,
    color: colors.blue,
    charSpace: 0.4,
  });
  slide.addText(title, {
    x: 0.7,
    y: 0.78,
    w: 8.4,
    h: 0.7,
    fontFace: "Aptos Display",
    fontSize: 25,
    bold: true,
    color: colors.ink,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.7,
      y: 1.45,
      w: 8.8,
      h: 0.5,
      fontFace: "Aptos",
      fontSize: 12,
      color: colors.muted,
      margin: 0,
    });
  }
}

function addBulletList(slide, items, x, y, w, h, options = {}) {
  const runs = [];
  for (const item of items) {
    runs.push({
      text: item,
      options: {
        bullet: { indent: 16 },
        hanging: 3,
        paraSpaceAfterPt: 11,
      },
    });
  }
  slide.addText(runs, {
    x,
    y,
    w,
    h,
    fontFace: "Aptos",
    fontSize: options.fontSize || 17,
    color: options.color || colors.text,
    valign: "top",
    breakLine: false,
    margin: 0,
  });
}

function addPill(slide, text, x, y, w, fill, textColor = colors.ink) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.38,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
  });
  slide.addText(text, {
    x,
    y: y + 0.05,
    w,
    h: 0.2,
    align: "center",
    fontFace: "Aptos",
    fontSize: 10,
    bold: true,
    color: textColor,
    margin: 0,
  });
}

function addFooter(slide, page) {
  slide.addText(`HabitAI | Pitch Deck | ${page}/4`, {
    x: 10.6,
    y: 7.06,
    w: 2.0,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 9,
    color: "94A3B8",
    align: "right",
    margin: 0,
  });
}

// Slide 1
{
  const slide = pptx.addSlide();
  addBg(slide, colors.blue);
  addTitle(
    slide,
    "PROBLEM",
    "Habit building breaks when consistency takes too much effort.",
    "Most people know what habits they want, but daily tracking, reminders, and motivation are still fragmented."
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.72,
    y: 2.08,
    w: 5.65,
    h: 3.9,
    rectRadius: 0.08,
    fill: { color: colors.pale },
    line: { color: colors.line, pt: 1.2 },
  });

  addBulletList(
    slide,
    [
      "Habit apps often feel like forms instead of a fast daily companion.",
      "Users drop off when logging, reminders, and progress review live in separate steps.",
      "Text-heavy flows create friction when the real need is a quick, low-effort action."
    ],
    1.0,
    2.45,
    4.95,
    2.5
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.68,
    y: 2.08,
    w: 5.95,
    h: 3.9,
    rectRadius: 0.08,
    fill: { color: "F8FBFF" },
    line: { color: "BFDBFE", pt: 1.2 },
  });

  slide.addText("Pain Point Snapshot", {
    x: 7.0,
    y: 2.35,
    w: 2.6,
    h: 0.3,
    fontSize: 16,
    bold: true,
    color: colors.ink,
    margin: 0,
  });
  addPill(slide, "Too many taps", 7.0, 2.8, 1.4, "DBEAFE", colors.blue);
  addPill(slide, "Low daily recall", 8.55, 2.8, 1.75, "CFFAFE", "0F766E");
  addPill(slide, "Weak motivation loop", 10.45, 2.8, 1.8, "E2E8F0", colors.text);

  slide.addText("People don’t fail because habits are unimportant. They fail because the support system is too easy to ignore.", {
    x: 7.0,
    y: 3.45,
    w: 5.0,
    h: 1.2,
    fontSize: 19,
    bold: true,
    color: colors.text,
    margin: 0,
  });
  slide.addText("That leaves a gap for a habit companion that is immediate, mobile-first, and easier to use than to avoid.", {
    x: 7.0,
    y: 4.9,
    w: 5.0,
    h: 0.8,
    fontSize: 12,
    color: colors.muted,
    margin: 0,
  });
  addFooter(slide, 1);
}

// Slide 2
{
  const slide = pptx.addSlide();
  addBg(slide, colors.cyan);
  addTitle(
    slide,
    "SOLUTION",
    "HabitAI makes daily consistency feel lightweight, guided, and mobile-native.",
    "The app combines manual tracking, reminders, progress feedback, and an assistant-first interaction model."
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.78,
    y: 2.05,
    w: 6.15,
    h: 4.45,
    rectRadius: 0.08,
    fill: { color: "F8FAFC" },
    line: { color: colors.line, pt: 1.1 },
  });

  const steps = [
    ["1", "Onboard quickly", "Choose or create habits with a guided, card-based flow."],
    ["2", "Track from Today", "Complete, skip, or update measurable habits in one place."],
    ["3", "Stay on schedule", "Use local reminders and streak feedback to maintain momentum."],
    ["4", "Ask the assistant", "Speak or type natural commands for faster habit actions."]
  ];

  let sy = 2.45;
  for (const [num, head, body] of steps) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 1.08,
      y: sy,
      w: 0.42,
      h: 0.42,
      fill: { color: colors.blue },
      line: { color: colors.blue, transparency: 100 },
    });
    slide.addText(num, {
      x: 1.08,
      y: sy + 0.08,
      w: 0.42,
      h: 0.16,
      align: "center",
      fontSize: 11,
      bold: true,
      color: colors.white,
      margin: 0,
    });
    slide.addText(head, {
      x: 1.72,
      y: sy - 0.02,
      w: 2.4,
      h: 0.22,
      fontSize: 15,
      bold: true,
      color: colors.ink,
      margin: 0,
    });
    slide.addText(body, {
      x: 1.72,
      y: sy + 0.28,
      w: 4.5,
      h: 0.45,
      fontSize: 11,
      color: colors.muted,
      margin: 0,
    });
    sy += 0.96;
  }

  slide.addImage({
    path: assistantImage,
    x: 7.55,
    y: 1.85,
    w: 2.35,
    h: 4.54,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.9,
    y: 2.22,
    w: 2.55,
    h: 3.6,
    rectRadius: 0.08,
    fill: { color: colors.navy },
    line: { color: "1D4ED8", pt: 1.0 },
  });
  slide.addText("What stands out", {
    x: 10.18,
    y: 2.48,
    w: 1.8,
    h: 0.2,
    fontSize: 13,
    bold: true,
    color: colors.white,
    margin: 0,
  });
  addBulletList(
    slide,
    [
      "Local-first habit storage for reliable offline use",
      "Today, Calendar, Analytics, Assistant, and Settings tabs",
      "Voice capture with preview-first execution for safer actions"
    ],
    10.12,
    2.9,
    2.0,
    2.4,
    { fontSize: 11, color: "DCE9FF" }
  );
  addFooter(slide, 2);
}

// Slide 3
{
  const slide = pptx.addSlide();
  addBg(slide, colors.green);
  addTitle(
    slide,
    "TOOLS / STACK",
    "Built with a pragmatic mobile stack designed for fast iteration and future scale.",
    "The current build is intentionally local-first, with cloud and monetization seams already prepared."
  );

  const cards = [
    {
      title: "Frontend",
      body: "Expo, React Native, Expo Router, TypeScript",
      x: 0.85,
      y: 2.05,
      fill: "EFF6FF",
      line: "BFDBFE",
    },
    {
      title: "State & UX",
      body: "Zustand, Async persistence, native-feeling card-based flows",
      x: 4.45,
      y: 2.05,
      fill: "F0FDFA",
      line: "99F6E4",
    },
    {
      title: "Core Features",
      body: "expo-notifications, expo-speech-recognition, expo-speech",
      x: 8.05,
      y: 2.05,
      fill: "F8FAFC",
      line: "CBD5E1",
    },
    {
      title: "Backend Ready",
      body: "Firebase Auth already wired; Firestore and Cloud Functions planned next",
      x: 0.85,
      y: 4.2,
      fill: "F8FAFC",
      line: "CBD5E1",
    },
    {
      title: "Observability",
      body: "Sentry integration, privacy-safe telemetry seam",
      x: 4.45,
      y: 4.2,
      fill: "FFF7ED",
      line: "FED7AA",
    },
    {
      title: "Monetization Path",
      body: "RevenueCat planned for premium features like advanced reminders and exports",
      x: 8.05,
      y: 4.2,
      fill: "F5F3FF",
      line: "DDD6FE",
    },
  ];

  for (const card of cards) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: card.x,
      y: card.y,
      w: 3.0,
      h: 1.55,
      rectRadius: 0.08,
      fill: { color: card.fill },
      line: { color: card.line, pt: 1.0 },
      shadow: { type: "outer", color: "C7D2FE", blur: 1, angle: 45, distance: 1, opacity: 0.12 },
    });
    slide.addText(card.title, {
      x: card.x + 0.22,
      y: card.y + 0.22,
      w: 2.5,
      h: 0.22,
      fontSize: 15,
      bold: true,
      color: colors.ink,
      margin: 0,
    });
    slide.addText(card.body, {
      x: card.x + 0.22,
      y: card.y + 0.58,
      w: 2.45,
      h: 0.66,
      fontSize: 11,
      color: colors.muted,
      margin: 0,
    });
  }
  addFooter(slide, 3);
}

// Slide 4
{
  const slide = pptx.addSlide();
  addBg(slide, colors.blue);
  addTitle(
    slide,
    "TARGET USERS",
    "HabitAI is built for people who want consistency without heavy setup or daily friction.",
    "The strongest initial audience is mobile-first users trying to build routines that survive real life."
  );

  const audience = [
    {
      title: "Students & early professionals",
      body: "Need structure for study, fitness, sleep, and personal routines.",
      y: 2.08,
      fill: "EEF2FF",
    },
    {
      title: "Busy self-improvers",
      body: "Want simple tracking, reminders, and visible progress without spreadsheet overhead.",
      y: 3.22,
      fill: "ECFEFF",
    },
    {
      title: "Users who prefer voice-first convenience",
      body: "Benefit from speaking quick habit actions instead of navigating multiple screens.",
      y: 4.36,
      fill: "F0FDF4",
    },
  ];

  for (const item of audience) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.88,
      y: item.y,
      w: 6.65,
      h: 0.9,
      rectRadius: 0.08,
      fill: { color: item.fill },
      line: { color: colors.line, pt: 1.0 },
    });
    slide.addText(item.title, {
      x: 1.15,
      y: item.y + 0.18,
      w: 3.3,
      h: 0.2,
      fontSize: 15,
      bold: true,
      color: colors.ink,
      margin: 0,
    });
    slide.addText(item.body, {
      x: 4.35,
      y: item.y + 0.18,
      w: 2.8,
      h: 0.34,
      fontSize: 11,
      color: colors.muted,
      margin: 0,
    });
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.1,
    y: 2.15,
    w: 4.35,
    h: 3.55,
    rectRadius: 0.08,
    fill: { color: colors.ink },
    line: { color: "1D4ED8", pt: 1.0 },
  });
  slide.addText("Why this audience fits now", {
    x: 8.42,
    y: 2.48,
    w: 2.8,
    h: 0.24,
    fontSize: 15,
    bold: true,
    color: colors.white,
    margin: 0,
  });
  addBulletList(
    slide,
    [
      "They already use phones as their daily command center.",
      "They need low-friction habit support, not a complex planning system.",
      "They are likely to value future premium features once consistency becomes part of their routine."
    ],
    8.38,
    2.95,
    3.35,
    2.15,
    { fontSize: 12, color: "E2E8F0" }
  );
  slide.addText("HabitAI’s pitch: turn self-discipline into a smoother daily interaction.", {
    x: 0.88,
    y: 6.34,
    w: 8.2,
    h: 0.3,
    fontSize: 18,
    bold: true,
    color: colors.blue,
    margin: 0,
  });
  addFooter(slide, 4);
}

pptx.writeFile({ fileName: outPath });
