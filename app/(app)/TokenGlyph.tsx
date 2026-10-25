// Same icon sourcing as the landing terminal: real ETH mark for WETH (CDN:
// atomiclabs/cryptocurrency-icons@0.18.1), generic themed marks for the
// simulated/fictional assets (lucide-static@0.399.0) so no real brand is implied.

export default function TokenGlyph({ symbol, cls }: { symbol: string; cls: string }) {
  return (
    <span className={`glyph ${cls}`}>
      {symbol === "WETH" ? (
        <svg viewBox="0 0 32 32" className="tok-svg">
          <g fill="none" fillRule="evenodd">
            <circle cx="16" cy="16" r="16" fill="#627EEA" />
            <g fill="#FFF" fillRule="nonzero">
              <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
              <path d="M16.498 4L9 16.22l7.498-3.35z" />
              <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
              <path d="M16.498 27.995v-6.028L9 17.616z" />
              <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
              <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
            </g>
          </g>
        </svg>
      ) : symbol === "NVDA" ? (
        <svg viewBox="0 0 32 32" className="tok-svg" style={{ width: "100%", height: "100%" }}>
          <circle cx="16" cy="16" r="16" fill="#76B900" />
          <path
            fill="#FFFFFF"
            d="M11.8 11.2c2.1-1.3 4.8-1.5 7.1-.6.4.2.8.4 1.1.7.3.3.4.7.2 1.1-.2.4-.6.6-1 .5-.3-.2-.6-.3-.9-.5-1.9-.7-4-.6-5.7.5-1.9 1.2-2.9 3.3-2.6 5.4.3 2 1.8 3.7 3.8 4.1 1.7.4 3.4-.1 4.8-1.2.2-.2.5-.2.8-.1.3.2.4.5.3.8-.1.2-.2.4-.4.6-1.7 1.4-3.9 2-6.1 1.6-2.5-.5-4.5-2.6-4.9-5.1-.4-2.8.9-5.5 3.4-6.8zm4.3 2.6c1.3-.7 2.8-.7 4.1 0 .3.2.4.5.3.8-.1.3-.4.5-.7.4-.9-.5-2-.5-2.9 0-1.1.6-1.7 1.8-1.5 3 .2 1.1 1 1.9 2.1 2.1.9.2 1.8 0 2.5-.6.3-.2.6-.2.8 0 .2.2.3.5.1.7-.9.8-2.1 1.1-3.2.8-1.5-.3-2.6-1.5-2.9-3-.3-1.6.3-3.2 1.3-4.2z"
          />
        </svg>
      ) : symbol === "PONS" ? (
        <svg viewBox="0 0 32 32" className="tok-svg" style={{ width: "100%", height: "100%" }}>
          <circle cx="16" cy="16" r="16" fill="#8B5CF6" />
          <path
            fill="#FFFFFF"
            d="M11 8h5.5c3.6 0 6.5 2.5 6.5 5.8 0 3.2-2.8 5.7-6.3 5.8H14v4.4h-3V8zm3 2.7v6.2h2.4c2 0 3.6-1.4 3.6-3.1s-1.6-3.1-3.6-3.1H14z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="tok-svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      )}
    </span>
  );
}
