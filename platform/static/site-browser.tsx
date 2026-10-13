import { hydrateRoot } from "react-dom/client";
import { StaticSite } from "./site";
hydrateRoot(document.getElementById("root")!, <StaticSite />);
