import fs from "node:fs";
import path from "node:path";
import EclipseLanding from "./EclipseLanding";

export default function Home() {
  const bodyHtml = fs.readFileSync(
    path.join(process.cwd(), "app/lib/bodyMarkup.html"),
    "utf8"
  );
  const scriptJs = fs.readFileSync(
    path.join(process.cwd(), "app/lib/interactiveScript.js"),
    "utf8"
  );

  return <EclipseLanding bodyHtml={bodyHtml} scriptJs={scriptJs} />;
}
