import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodMainnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodMainnet],
  connectors: [injected()],
  transports: {
    [robinhoodMainnet.id]: http(),
  },
});
