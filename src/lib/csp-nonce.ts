import { createContext, useContext } from "react";

// The nonce of the page being rendered on the server (src/entry.server.tsx), for a script the page writes itself.
// In the browser there is none: the page's scripts have run by then, and the nonce is never sent anywhere else.
export const NonceContext = createContext<string | undefined>(undefined);
export const useNonce = () => useContext(NonceContext);
