import "./index.css";
import { Composition } from "remotion";
import { HabitAiPromo } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HabitAiPromoVertical"
        component={HabitAiPromo}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
