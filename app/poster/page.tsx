import { notFound } from "next/navigation";
import { PosterRender } from "./PosterRender";

/** Dev/build tool: renders the hero object at a fixed explode value for poster export. */
export default function Page() {
  if (process.env.POSTER_TOOL !== "1") notFound();
  return <PosterRender />;
}
