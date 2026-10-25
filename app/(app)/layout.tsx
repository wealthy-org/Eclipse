import Rail from "./Rail";
import WaveHud from "./WaveHud";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Rail />
      <main className="app-main">{children}</main>
      <WaveHud />
    </div>
  );
}
