# Mobile node architecture (high level)

Goal: lightweight, resilient mobile node that participates in escrow & token flows while minimizing trust and dependency on centralized servers.

Key components
- Light client / RPC cache: mobile node uses an L2 light client or a trusted RPC with local caching and compact proofs for important events.
- Local signing: user's private key remains on device (secure enclave / keystore), used to sign EIP-712 messages for deposits/releases.
- Offline receipts: merchant and mobile node exchange encrypted receipts and preimages to validate off-chain state.
- Sync & relaying: node can act as a relayer when gas is subsidized by merchant or via incentive tokens.

Privacy & security
- Minimize sensitive metadata on-chain; use commitments and off-chain encrypted blobs when merchant-only visibility is needed.
- Use hardware-backed key storage (Secure Enclave / Keystore) on mobile devices.

Scaling real-world integrations
- For supply-chain telemetry, mobile nodes on trucks can produce signed attestations (location, load) that feed into merchant logic to authorize payments.
- Incentive tokens can be integrated to reward on-chain actions (e.g., bringing plastic to a refinery). Rewards are distributed via escrows that release when attestation signatures and IoT proofs validate.

This is a design doc — implementation is next-phase.
