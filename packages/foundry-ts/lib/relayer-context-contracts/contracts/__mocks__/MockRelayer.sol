// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import {GelatoBytes} from "../lib/GelatoBytes.sol";
// import {
//     _encodeRelayerContext,
//     _encodeRelayerContextERC2771
// } from "@gelatonetwork/relayer-context/contracts/functions/RelayerUtils.sol";
import {
    _encodeRelayerContext,
    _encodeRelayerContextERC2771
} from "../functions/RelayerUtils.sol";

/// @dev Mock contracts for testing - UNSAFE CODE - do not copy
contract MockRelayer {
    using GelatoBytes for bytes;

    function forwardCall(
        address _target,
        bytes calldata _data,
        address _feeCollector,
        address _feeToken,
        uint256 _fee
    ) external {
        (bool success, bytes memory returndata) = _target.call(
            _encodeRelayerContext(_data, _feeCollector, _feeToken, _fee)
        );
        if (!success) returndata.revertWithError("MockRelayer.forwardCall:");
    }

    function forwardCallERC2771(
        address _target,
        bytes calldata _data,
        address _feeCollector,
        address _feeToken,
        uint256 _fee,
        address _user
    ) external {
        (bool success, bytes memory returndata) = _target.call(
            _encodeRelayerContextERC2771(
                _data,
                _feeCollector,
                _feeToken,
                _fee,
                _user
            )
        );
        if (!success)
            returndata.revertWithError("MockRelayer.forwardCallERC2771:");
    }
}
