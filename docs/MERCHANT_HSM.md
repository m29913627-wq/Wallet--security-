# Merchant key management / HSM guidance

Production merchants should avoid a single hot private key. Options:

- HSM / KMS: use a hardware security module or cloud KMS that can sign EIP-712 payloads without revealing private key material.
- Multisig: require N-of-M operator approvals (Gnosis Safe) and use the multisig to produce the merchant signature (either via off-chain aggregation or via a contract-proxy that co-signs).
- Threshold signatures: advanced option — use a threshold signing scheme so no single keyholder can sign alone.

For our demo microservice we emulate an HSM by keeping a private key in an environment variable. This is NOT suitable for production.
