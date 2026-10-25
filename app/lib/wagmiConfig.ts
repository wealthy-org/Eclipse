import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet],
  connectors: [injected()],
  transports: {
    [robinhoodTestnet.id]: http(),
  },
});
