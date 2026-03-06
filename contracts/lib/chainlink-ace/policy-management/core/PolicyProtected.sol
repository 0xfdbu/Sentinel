// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

abstract contract PolicyProtected is Initializable, AccessControlUpgradeable {
    address public policyEngine;
    
    function __PolicyProtected_init(address initialOwner, address _policyEngine) internal onlyInitializing {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        policyEngine = _policyEngine;
    }
    
    modifier runPolicy() {
        // Policy check placeholder - actual implementation would call policyEngine
        _;
    }
}
