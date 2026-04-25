import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { monadTestnet } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const connectors = [
  injected(),
  ...(projectId ? [walletConnect({ projectId })] : []),
];

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors,
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
});
