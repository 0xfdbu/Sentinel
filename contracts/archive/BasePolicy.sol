// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPolicy.sol";

/**
 * @title BasePolicy
 * @notice Abstract base contract for ACE policies
 * @dev Provides common functionality for all policies
 */
abstract contract BasePolicy is IPolicy, Ownable {
    string public override name;
    string public override version;
    bool public override isActive;

    event PolicyStatusChanged(bool active);
    event PolicyUpdated(string param, string value);

    modifier onlyActive() {
        require(isActive, "Policy: not active");
        _;
    }

    constructor(string memory _name, string memory _version) Ownable() {
        _transferOwnership(msg.sender);
        name = _name;
        version = _version;
        isActive = true;
    }

    /**
     * @notice Activate or deactivate the policy
     */
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit PolicyStatusChanged(_active);
    }

    /**
     * @notice Update policy name
     */
    function setName(string memory _name) external onlyOwner {
        name = _name;
        emit PolicyUpdated("name", _name);
    }

    /**
     * @notice Update policy version
     */
    function setVersion(string memory _version) external onlyOwner {
        version = _version;
        emit PolicyUpdated("version", _version);
    }
}
