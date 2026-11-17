# Token Launch Radar (`token-radar-01`)

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/ssass88/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ssass88/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node->=22.0.0-green.svg)](https://nodejs.org/)

An advanced DeFi Token Launch Radar and Valuation Engine built by [@ssass88](https://github.com/ssass88) for the [make.fun `token-radar-01` bounty](https://make.fun/bounty/token-radar-01).

---

## Overview

Token Radar analyzes sealed protocol snapshots from DefiLlama, identifies high-potential protocols that have not yet launched a token, computes realistic implied valuations based on multi-factor econometric models, and generates actionable, step-by-step farming playbooks.

### Key Capabilities

1. **Precision Watchlist & Early Discovery**:
   - Covers 100% of the official watchlist protocols (TVL >= $50M, zero token records).
   - Explores pre-token emerging protocols below the watchlist floor by TVL growth and operational maturity.
2. **Econometric Valuation Modeling**:
   - Fundamental Base Multiple derived from liquid TVL across chains.
   - Non-linear 7-day velocity factor with volatility dampening.
   - Empirical protocol maturity curve calibrated against time since listing.
3. **Actionable Farm Playbooks**:
   - Tailored multi-step strategies per protocol category (Lending, DEX, Bridges, Restaking, Derivatives).
   - Clear capital requirements, gas estimates, holding windows, and exit hygiene.
4. **Interactive Zero-Network Dashboard**:
   - Fully standalone, responsive Web dashboard requiring 0 external CDNs or network calls.
   - Multi-metric sorting, category filtering, search, and deep-dive drawer views.

---

## Local Execution

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

## License

MIT © 2026 ssass88
