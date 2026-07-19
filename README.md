# TwoPartyEscrow (scaffold)

This repository scaffold adds a minimal 2-of-2 EIP-712 escrow contract and tests.

Summary
- Solidity contract: contracts/TwoPartyEscrow.sol
- Hardhat tests: test/escrow.test.js
- Purpose: funds deposited by a customer are locked in an escrowId and can only be released when BOTH the depositor and merchant provide EIP-712 signatures authorizing the release. If the merchant never cooperates, the depositor can refund after expiry.

Important notes
- The contract includes an owner-only `freezeForever()` function you can call after testing to make deposit functionality permanently inactive (irreversible). This helps you "freeze" behaviour once you're satisfied to avoid human error in future changes.
- All signatures are EIP-712 typed data, which is hardware-wallet friendly.

Next steps
- Review the code and tests in the `scaffold` branch.
- Run the tests locally (`npm install`, `npx hardhat test`).
- If happy, you or the repo owner can open a PR to merge to default branch after audit.
