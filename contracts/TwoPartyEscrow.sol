// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title TwoPartyEscrow
/// @notice A minimal 2-of-2 escrow using EIP-712 signatures. Deposits are locked to an escrowId and
/// require both depositor and merchant EIP-712 signatures to release funds to a recipient. A refund
/// path exists after expiry. The contract can be frozen permanently by the owner after testing.
contract TwoPartyEscrow is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant RELEASE_TYPEHASH = keccak256("Release(bytes32 escrowId,address recipient,uint256 amount,uint256 nonce,uint256 expiry)");

    enum Status { None, Created, Released, Refunded }

    struct Escrow {
        address depositor;
        address merchant;
        uint256 amount;
        uint256 expiry; // unix timestamp
        Status status;
        uint256 nonce; // prevents replay of signatures per-escrow
    }

    mapping(bytes32 => Escrow) public escrows;
    uint256 public depositCounter;
    bool public frozen;

    event Deposited(bytes32 indexed escrowId, address indexed depositor, address indexed merchant, uint256 amount, uint256 expiry);
    event Released(bytes32 indexed escrowId, address indexed recipient, uint256 amount);
    event Refunded(bytes32 indexed escrowId);
    event Frozen(address indexed owner);

    constructor() EIP712("TwoPartyEscrow", "1") {}

    modifier notFrozen() {
        require(!frozen, "Contract frozen");
        _;
    }

    /// @notice Deposit ETH into a new escrow bound to the merchant and expiry.
    /// @param merchant The merchant address that must co-sign to release.
    /// @param expiry Unix timestamp after which depositor can reclaim funds.
    /// @return escrowId The generated escrow identifier.
    function deposit(address merchant, uint256 expiry) external payable notFrozen returns (bytes32 escrowId) {
        require(msg.value > 0, "Zero value");
        require(merchant != address(0), "merchant=0");
        require(expiry > block.timestamp, "expiry in past");

        escrowId = keccak256(abi.encodePacked(msg.sender, depositCounter++, block.timestamp, msg.value, merchant));
        escrows[escrowId] = Escrow({
            depositor: msg.sender,
            merchant: merchant,
            amount: msg.value,
            expiry: expiry,
            status: Status.Created,
            nonce: 0
        });

        emit Deposited(escrowId, msg.sender, merchant, msg.value, expiry);
    }

    /// @notice Release funds to recipient. Requires BOTH depositor and merchant signatures over the EIP-712 typed data.
    /// @param escrowId The escrow identifier returned by deposit.
    /// @param recipient The address to receive funds.
    /// @param amount Must equal the amount stored in escrow (sanity check).
    /// @param sigNonce The nonce value expected by the escrow (prevents signature replay).
    /// @param sigExpiry The expiry value included in the signed payload (must match escrow.expiry).
    /// @param depositorSig EIP-712 signature by the depositor.
    /// @param merchantSig EIP-712 signature by the merchant.
    function release(
        bytes32 escrowId,
        address recipient,
        uint256 amount,
        uint256 sigNonce,
        uint256 sigExpiry,
        bytes calldata depositorSig,
        bytes calldata merchantSig
    ) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == Status.Created, "Not active");
        require(block.timestamp <= e.expiry, "Expired");
        require(amount == e.amount, "Amount mismatch");
        require(sigExpiry == e.expiry, "Expiry mismatch");
        require(sigNonce == e.nonce, "Invalid nonce");
        require(recipient != address(0), "recipient=0");

        // build the typed data hash
        bytes32 structHash = keccak256(abi.encode(
            RELEASE_TYPEHASH,
            escrowId,
            recipient,
            amount,
            sigNonce,
            sigExpiry
        ));

        bytes32 digest = _hashTypedDataV4(structHash);

        address depositorSigner = ECDSA.recover(digest, depositorSig);
        address merchantSigner = ECDSA.recover(digest, merchantSig);

        require(depositorSigner == e.depositor, "Invalid depositor signature");
        require(merchantSigner == e.merchant, "Invalid merchant signature");

        // mark used and transfer
        e.nonce += 1;
        e.status = Status.Released;

        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Transfer failed");

        emit Released(escrowId, recipient, amount);
    }

    /// @notice Refund the depositor after expiry if merchant never cooperated.
    function refund(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == Status.Created, "Not active");
        require(block.timestamp > e.expiry, "Not expired");
        require(msg.sender == e.depositor, "Not depositor");

        e.status = Status.Refunded;
        (bool ok, ) = e.depositor.call{value: e.amount}("");
        require(ok, "Refund failed");

        emit Refunded(escrowId);
    }

    /// @notice Permanently freeze deposit functionality and future modifications that rely on notFrozen modifier.
    /// Use this after testing to lock behaviour. This action is irreversible.
    function freezeForever() external onlyOwner {
        frozen = true;
        emit Frozen(msg.sender);
    }

    // allow receiving ETH
    receive() external payable {}
    fallback() external payable {}
}
