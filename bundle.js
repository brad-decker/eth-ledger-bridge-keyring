(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _hwTransportU2f = require('@ledgerhq/hw-transport-u2f');

var _hwTransportU2f2 = _interopRequireDefault(_hwTransportU2f);

var _hwAppEth = require('@ledgerhq/hw-app-eth');

var _hwAppEth2 = _interopRequireDefault(_hwAppEth);

var _erc = require('@ledgerhq/hw-app-eth/erc20');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('buffer');

var LedgerBridge = function () {
    function LedgerBridge() {
        _classCallCheck(this, LedgerBridge);

        this.addEventListeners();
    }

    _createClass(LedgerBridge, [{
        key: 'addEventListeners',
        value: function addEventListeners() {
            var _this = this;

            window.addEventListener('message', async function (e) {
                if (e && e.data && e.data.target === 'LEDGER-IFRAME') {
                    var _e$data = e.data,
                        action = _e$data.action,
                        params = _e$data.params;

                    var replyAction = action + '-reply';

                    switch (action) {
                        case 'ledger-unlock':
                            _this.unlock(replyAction, params.hdPath);
                            break;
                        case 'ledger-sign-transaction':
                            _this.signTransaction(replyAction, params.hdPath, params.tx, params.to);
                            break;
                        case 'ledger-sign-personal-message':
                            _this.signPersonalMessage(replyAction, params.hdPath, params.message);
                            break;
                        case 'ledger-sign-typed-data':
                            _this.signTypedData(replyAction, params.hdPath, params.domainSeparatorHex, params.hashStructMessageHex);
                    }
                }
            }, false);
        }
    }, {
        key: 'sendMessageToExtension',
        value: function sendMessageToExtension(msg) {
            window.parent.postMessage(msg, '*');
        }
    }, {
        key: 'makeApp',
        value: async function makeApp() {
            try {
                this.transport = await _hwTransportU2f2.default.create();
                this.app = new _hwAppEth2.default(this.transport);
            } catch (e) {
                console.log('LEDGER:::CREATE APP ERROR', e);
            }
        }
    }, {
        key: 'cleanUp',
        value: function cleanUp() {
            this.app = null;
            this.transport.close();
        }
    }, {
        key: 'unlock',
        value: async function unlock(replyAction, hdPath) {
            try {
                await this.makeApp();
                var res = await this.app.getAddress(hdPath, false, true);

                this.sendMessageToExtension({
                    action: replyAction,
                    success: true,
                    payload: res
                });
            } catch (err) {
                var e = this.ledgerErrToMessage(err);

                this.sendMessageToExtension({
                    action: replyAction,
                    success: false,
                    payload: { error: e.toString() }
                });
            } finally {
                this.cleanUp();
            }
        }
    }, {
        key: 'signTransaction',
        value: async function signTransaction(replyAction, hdPath, tx, to) {
            try {
                await this.makeApp();
                if (to) {
                    var isKnownERC20Token = (0, _erc.byContractAddress)(to);
                    if (isKnownERC20Token) await this.app.provideERC20TokenInformation(isKnownERC20Token);
                }
                var res = await this.app.signTransaction(hdPath, tx);
                this.sendMessageToExtension({
                    action: replyAction,
                    success: true,
                    payload: res
                });
            } catch (err) {
                var e = this.ledgerErrToMessage(err);
                this.sendMessageToExtension({
                    action: replyAction,
                    success: false,
                    payload: { error: e.toString() }
                });
            } finally {
                this.cleanUp();
            }
        }
    }, {
        key: 'signPersonalMessage',
        value: async function signPersonalMessage(replyAction, hdPath, message) {
            try {
                await this.makeApp();
                var res = await this.app.signPersonalMessage(hdPath, message);

                this.sendMessageToExtension({
                    action: replyAction,
                    success: true,
                    payload: res
                });
            } catch (err) {
                var e = this.ledgerErrToMessage(err);
                this.sendMessageToExtension({
                    action: replyAction,
                    success: false,
                    payload: { error: e.toString() }
                });
            } finally {
                this.cleanUp();
            }
        }
    }, {
        key: 'signTypedData',
        value: async function signTypedData(replyAction, hdPath, domainSeparatorHex, hashStructMessageHex) {
            try {
                await this.makeApp();
                var res = await this.app.signEIP712HashedMessage(hdPath, domainSeparatorHex, hashStructMessageHex);

                this.sendMessageToExtension({
                    action: replyAction,
                    success: true,
                    payload: res
                });
            } catch (err) {
                var e = this.ledgerErrToMessage(err);
                this.sendMessageToExtension({
                    action: replyAction,
                    success: false,
                    payload: { error: e.toString() }
                });
            } finally {
                this.cleanUp();
            }
        }
    }, {
        key: 'ledgerErrToMessage',
        value: function ledgerErrToMessage(err) {
            var isU2FError = function isU2FError(err) {
                return !!err && !!err.metaData;
            };
            var isStringError = function isStringError(err) {
                return typeof err === 'string';
            };
            var isErrorWithId = function isErrorWithId(err) {
                return err.hasOwnProperty('id') && err.hasOwnProperty('message');
            };

            // https://developers.yubico.com/U2F/Libraries/Client_error_codes.html
            if (isU2FError(err)) {
                // Timeout
                if (err.metaData.code === 5) {
                    return 'LEDGER_TIMEOUT';
                }

                return err.metaData.type;
            }

            if (isStringError(err)) {
                // Wrong app logged into
                if (err.includes('6804')) {
                    return 'LEDGER_WRONG_APP';
                }
                // Ledger locked
                if (err.includes('6801')) {
                    return 'LEDGER_LOCKED';
                }

                return err;
            }

            if (isErrorWithId(err)) {
                // Browser doesn't support U2F
                if (err.message.includes('U2F not supported')) {
                    return 'U2F_NOT_SUPPORTED';
                }
            }

            // Other
            return err.toString();
        }
    }]);

    return LedgerBridge;
}();

exports.default = LedgerBridge;

},{"@ledgerhq/hw-app-eth":6,"@ledgerhq/hw-app-eth/erc20":5,"@ledgerhq/hw-transport-u2f":9,"buffer":16}],2:[function(require,module,exports){
'use strict';

var _ledgerBridge = require('./ledger-bridge');

var _ledgerBridge2 = _interopRequireDefault(_ledgerBridge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(async function () {
    window.bridge = new _ledgerBridge2.default();
})();
console.log('MetaMask < = > Ledger Bridge initialized (5.43.0)!');

},{"./ledger-bridge":1}],3:[function(require,module,exports){
module.exports = "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";
},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* eslint-disable no-continue */
/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable no-prototype-builtins */
var errorClasses = {};
var deserializers = {};
var addCustomErrorDeserializer = function (name, deserializer) {
    deserializers[name] = deserializer;
};
var createCustomErrorClass = function (name) {
    var C = function CustomError(message, fields) {
        Object.assign(this, fields);
        this.name = name;
        this.message = message || name;
        this.stack = new Error().stack;
    };
    C.prototype = new Error();
    errorClasses[name] = C;
    return C;
};
// inspired from https://github.com/programble/errio/blob/master/index.js
var deserializeError = function (object) {
    if (typeof object === "object" && object) {
        try {
            // $FlowFixMe FIXME HACK
            var msg = JSON.parse(object.message);
            if (msg.message && msg.name) {
                object = msg;
            }
        }
        catch (e) {
            // nothing
        }
        var error = void 0;
        if (typeof object.name === "string") {
            var name_1 = object.name;
            var des = deserializers[name_1];
            if (des) {
                error = des(object);
            }
            else {
                var constructor = name_1 === "Error" ? Error : errorClasses[name_1];
                if (!constructor) {
                    console.warn("deserializing an unknown class '" + name_1 + "'");
                    constructor = createCustomErrorClass(name_1);
                }
                error = Object.create(constructor.prototype);
                try {
                    for (var prop in object) {
                        if (object.hasOwnProperty(prop)) {
                            error[prop] = object[prop];
                        }
                    }
                }
                catch (e) {
                    // sometimes setting a property can fail (e.g. .name)
                }
            }
        }
        else {
            error = new Error(object.message);
        }
        if (!error.stack && Error.captureStackTrace) {
            Error.captureStackTrace(error, deserializeError);
        }
        return error;
    }
    return new Error(String(object));
};
// inspired from https://github.com/sindresorhus/serialize-error/blob/master/index.js
var serializeError = function (value) {
    if (!value)
        return value;
    if (typeof value === "object") {
        return destroyCircular(value, []);
    }
    if (typeof value === "function") {
        return "[Function: " + (value.name || "anonymous") + "]";
    }
    return value;
};
// https://www.npmjs.com/package/destroy-circular
function destroyCircular(from, seen) {
    var to = {};
    seen.push(from);
    for (var _i = 0, _a = Object.keys(from); _i < _a.length; _i++) {
        var key = _a[_i];
        var value = from[key];
        if (typeof value === "function") {
            continue;
        }
        if (!value || typeof value !== "object") {
            to[key] = value;
            continue;
        }
        if (seen.indexOf(from[key]) === -1) {
            to[key] = destroyCircular(from[key], seen.slice(0));
            continue;
        }
        to[key] = "[Circular]";
    }
    if (typeof from.name === "string") {
        to.name = from.name;
    }
    if (typeof from.message === "string") {
        to.message = from.message;
    }
    if (typeof from.stack === "string") {
        to.stack = from.stack;
    }
    return to;
}

var AccountNameRequiredError = createCustomErrorClass("AccountNameRequired");
var AccountNotSupported = createCustomErrorClass("AccountNotSupported");
var AmountRequired = createCustomErrorClass("AmountRequired");
var BluetoothRequired = createCustomErrorClass("BluetoothRequired");
var BtcUnmatchedApp = createCustomErrorClass("BtcUnmatchedApp");
var CantOpenDevice = createCustomErrorClass("CantOpenDevice");
var CashAddrNotSupported = createCustomErrorClass("CashAddrNotSupported");
var CurrencyNotSupported = createCustomErrorClass("CurrencyNotSupported");
var DeviceAppVerifyNotSupported = createCustomErrorClass("DeviceAppVerifyNotSupported");
var DeviceGenuineSocketEarlyClose = createCustomErrorClass("DeviceGenuineSocketEarlyClose");
var DeviceNotGenuineError = createCustomErrorClass("DeviceNotGenuine");
var DeviceOnDashboardExpected = createCustomErrorClass("DeviceOnDashboardExpected");
var DeviceOnDashboardUnexpected = createCustomErrorClass("DeviceOnDashboardUnexpected");
var DeviceInOSUExpected = createCustomErrorClass("DeviceInOSUExpected");
var DeviceHalted = createCustomErrorClass("DeviceHalted");
var DeviceNameInvalid = createCustomErrorClass("DeviceNameInvalid");
var DeviceSocketFail = createCustomErrorClass("DeviceSocketFail");
var DeviceSocketNoBulkStatus = createCustomErrorClass("DeviceSocketNoBulkStatus");
var DisconnectedDevice = createCustomErrorClass("DisconnectedDevice");
var DisconnectedDeviceDuringOperation = createCustomErrorClass("DisconnectedDeviceDuringOperation");
var EnpointConfigError = createCustomErrorClass("EnpointConfig");
var EthAppPleaseEnableContractData = createCustomErrorClass("EthAppPleaseEnableContractData");
var FeeEstimationFailed = createCustomErrorClass("FeeEstimationFailed");
var FirmwareNotRecognized = createCustomErrorClass("FirmwareNotRecognized");
var HardResetFail = createCustomErrorClass("HardResetFail");
var InvalidXRPTag = createCustomErrorClass("InvalidXRPTag");
var InvalidAddress = createCustomErrorClass("InvalidAddress");
var InvalidAddressBecauseDestinationIsAlsoSource = createCustomErrorClass("InvalidAddressBecauseDestinationIsAlsoSource");
var LatestMCUInstalledError = createCustomErrorClass("LatestMCUInstalledError");
var UnknownMCU = createCustomErrorClass("UnknownMCU");
var LedgerAPIError = createCustomErrorClass("LedgerAPIError");
var LedgerAPIErrorWithMessage = createCustomErrorClass("LedgerAPIErrorWithMessage");
var LedgerAPINotAvailable = createCustomErrorClass("LedgerAPINotAvailable");
var ManagerAppAlreadyInstalledError = createCustomErrorClass("ManagerAppAlreadyInstalled");
var ManagerAppRelyOnBTCError = createCustomErrorClass("ManagerAppRelyOnBTC");
var ManagerAppDepInstallRequired = createCustomErrorClass("ManagerAppDepInstallRequired");
var ManagerAppDepUninstallRequired = createCustomErrorClass("ManagerAppDepUninstallRequired");
var ManagerDeviceLockedError = createCustomErrorClass("ManagerDeviceLocked");
var ManagerFirmwareNotEnoughSpaceError = createCustomErrorClass("ManagerFirmwareNotEnoughSpace");
var ManagerNotEnoughSpaceError = createCustomErrorClass("ManagerNotEnoughSpace");
var ManagerUninstallBTCDep = createCustomErrorClass("ManagerUninstallBTCDep");
var NetworkDown = createCustomErrorClass("NetworkDown");
var NoAddressesFound = createCustomErrorClass("NoAddressesFound");
var NotEnoughBalance = createCustomErrorClass("NotEnoughBalance");
var NotEnoughBalanceToDelegate = createCustomErrorClass("NotEnoughBalanceToDelegate");
var NotEnoughBalanceInParentAccount = createCustomErrorClass("NotEnoughBalanceInParentAccount");
var NotEnoughSpendableBalance = createCustomErrorClass("NotEnoughSpendableBalance");
var NotEnoughBalanceBecauseDestinationNotCreated = createCustomErrorClass("NotEnoughBalanceBecauseDestinationNotCreated");
var NoAccessToCamera = createCustomErrorClass("NoAccessToCamera");
var NotEnoughGas = createCustomErrorClass("NotEnoughGas");
var NotSupportedLegacyAddress = createCustomErrorClass("NotSupportedLegacyAddress");
var GasLessThanEstimate = createCustomErrorClass("GasLessThanEstimate");
var PasswordsDontMatchError = createCustomErrorClass("PasswordsDontMatch");
var PasswordIncorrectError = createCustomErrorClass("PasswordIncorrect");
var RecommendSubAccountsToEmpty = createCustomErrorClass("RecommendSubAccountsToEmpty");
var RecommendUndelegation = createCustomErrorClass("RecommendUndelegation");
var TimeoutTagged = createCustomErrorClass("TimeoutTagged");
var UnexpectedBootloader = createCustomErrorClass("UnexpectedBootloader");
var MCUNotGenuineToDashboard = createCustomErrorClass("MCUNotGenuineToDashboard");
var RecipientRequired = createCustomErrorClass("RecipientRequired");
var UnavailableTezosOriginatedAccountReceive = createCustomErrorClass("UnavailableTezosOriginatedAccountReceive");
var UnavailableTezosOriginatedAccountSend = createCustomErrorClass("UnavailableTezosOriginatedAccountSend");
var UpdateFetchFileFail = createCustomErrorClass("UpdateFetchFileFail");
var UpdateIncorrectHash = createCustomErrorClass("UpdateIncorrectHash");
var UpdateIncorrectSig = createCustomErrorClass("UpdateIncorrectSig");
var UpdateYourApp = createCustomErrorClass("UpdateYourApp");
var UserRefusedDeviceNameChange = createCustomErrorClass("UserRefusedDeviceNameChange");
var UserRefusedAddress = createCustomErrorClass("UserRefusedAddress");
var UserRefusedFirmwareUpdate = createCustomErrorClass("UserRefusedFirmwareUpdate");
var UserRefusedAllowManager = createCustomErrorClass("UserRefusedAllowManager");
var UserRefusedOnDevice = createCustomErrorClass("UserRefusedOnDevice"); // TODO rename because it's just for transaction refusal
var TransportOpenUserCancelled = createCustomErrorClass("TransportOpenUserCancelled");
var TransportInterfaceNotAvailable = createCustomErrorClass("TransportInterfaceNotAvailable");
var TransportRaceCondition = createCustomErrorClass("TransportRaceCondition");
var TransportWebUSBGestureRequired = createCustomErrorClass("TransportWebUSBGestureRequired");
var DeviceShouldStayInApp = createCustomErrorClass("DeviceShouldStayInApp");
var WebsocketConnectionError = createCustomErrorClass("WebsocketConnectionError");
var WebsocketConnectionFailed = createCustomErrorClass("WebsocketConnectionFailed");
var WrongDeviceForAccount = createCustomErrorClass("WrongDeviceForAccount");
var WrongAppForCurrency = createCustomErrorClass("WrongAppForCurrency");
var ETHAddressNonEIP = createCustomErrorClass("ETHAddressNonEIP");
var CantScanQRCode = createCustomErrorClass("CantScanQRCode");
var FeeNotLoaded = createCustomErrorClass("FeeNotLoaded");
var FeeRequired = createCustomErrorClass("FeeRequired");
var FeeTooHigh = createCustomErrorClass("FeeTooHigh");
var SyncError = createCustomErrorClass("SyncError");
var PairingFailed = createCustomErrorClass("PairingFailed");
var GenuineCheckFailed = createCustomErrorClass("GenuineCheckFailed");
var LedgerAPI4xx = createCustomErrorClass("LedgerAPI4xx");
var LedgerAPI5xx = createCustomErrorClass("LedgerAPI5xx");
var FirmwareOrAppUpdateRequired = createCustomErrorClass("FirmwareOrAppUpdateRequired");
// db stuff, no need to translate
var NoDBPathGiven = createCustomErrorClass("NoDBPathGiven");
var DBWrongPassword = createCustomErrorClass("DBWrongPassword");
var DBNotReset = createCustomErrorClass("DBNotReset");
/**
 * TransportError is used for any generic transport errors.
 * e.g. Error thrown when data received by exchanges are incorrect or if exchanged failed to communicate with the device for various reason.
 */
function TransportError(message, id) {
    this.name = "TransportError";
    this.message = message;
    this.stack = new Error().stack;
    this.id = id;
}
TransportError.prototype = new Error();
addCustomErrorDeserializer("TransportError", function (e) { return new TransportError(e.message, e.id); });
var StatusCodes = {
    PIN_REMAINING_ATTEMPTS: 0x63c0,
    INCORRECT_LENGTH: 0x6700,
    MISSING_CRITICAL_PARAMETER: 0x6800,
    COMMAND_INCOMPATIBLE_FILE_STRUCTURE: 0x6981,
    SECURITY_STATUS_NOT_SATISFIED: 0x6982,
    CONDITIONS_OF_USE_NOT_SATISFIED: 0x6985,
    INCORRECT_DATA: 0x6a80,
    NOT_ENOUGH_MEMORY_SPACE: 0x6a84,
    REFERENCED_DATA_NOT_FOUND: 0x6a88,
    FILE_ALREADY_EXISTS: 0x6a89,
    INCORRECT_P1_P2: 0x6b00,
    INS_NOT_SUPPORTED: 0x6d00,
    CLA_NOT_SUPPORTED: 0x6e00,
    TECHNICAL_PROBLEM: 0x6f00,
    OK: 0x9000,
    MEMORY_PROBLEM: 0x9240,
    NO_EF_SELECTED: 0x9400,
    INVALID_OFFSET: 0x9402,
    FILE_NOT_FOUND: 0x9404,
    INCONSISTENT_FILE: 0x9408,
    ALGORITHM_NOT_SUPPORTED: 0x9484,
    INVALID_KCV: 0x9485,
    CODE_NOT_INITIALIZED: 0x9802,
    ACCESS_CONDITION_NOT_FULFILLED: 0x9804,
    CONTRADICTION_SECRET_CODE_STATUS: 0x9808,
    CONTRADICTION_INVALIDATION: 0x9810,
    CODE_BLOCKED: 0x9840,
    MAX_VALUE_REACHED: 0x9850,
    GP_AUTH_FAILED: 0x6300,
    LICENSING: 0x6f42,
    HALTED: 0x6faa,
};
function getAltStatusMessage(code) {
    switch (code) {
        // improve text of most common errors
        case 0x6700:
            return "Incorrect length";
        case 0x6800:
            return "Missing critical parameter";
        case 0x6982:
            return "Security not satisfied (dongle locked or have invalid access rights)";
        case 0x6985:
            return "Condition of use not satisfied (denied by the user?)";
        case 0x6a80:
            return "Invalid data received";
        case 0x6b00:
            return "Invalid parameter received";
    }
    if (0x6f00 <= code && code <= 0x6fff) {
        return "Internal error, please report";
    }
}
/**
 * Error thrown when a device returned a non success status.
 * the error.statusCode is one of the `StatusCodes` exported by this library.
 */
function TransportStatusError(statusCode) {
    this.name = "TransportStatusError";
    var statusText = Object.keys(StatusCodes).find(function (k) { return StatusCodes[k] === statusCode; }) ||
        "UNKNOWN_ERROR";
    var smsg = getAltStatusMessage(statusCode) || statusText;
    var statusCodeStr = statusCode.toString(16);
    this.message = "Ledger device: " + smsg + " (0x" + statusCodeStr + ")";
    this.stack = new Error().stack;
    this.statusCode = statusCode;
    this.statusText = statusText;
}
TransportStatusError.prototype = new Error();
addCustomErrorDeserializer("TransportStatusError", function (e) { return new TransportStatusError(e.statusCode); });

exports.AccountNameRequiredError = AccountNameRequiredError;
exports.AccountNotSupported = AccountNotSupported;
exports.AmountRequired = AmountRequired;
exports.BluetoothRequired = BluetoothRequired;
exports.BtcUnmatchedApp = BtcUnmatchedApp;
exports.CantOpenDevice = CantOpenDevice;
exports.CantScanQRCode = CantScanQRCode;
exports.CashAddrNotSupported = CashAddrNotSupported;
exports.CurrencyNotSupported = CurrencyNotSupported;
exports.DBNotReset = DBNotReset;
exports.DBWrongPassword = DBWrongPassword;
exports.DeviceAppVerifyNotSupported = DeviceAppVerifyNotSupported;
exports.DeviceGenuineSocketEarlyClose = DeviceGenuineSocketEarlyClose;
exports.DeviceHalted = DeviceHalted;
exports.DeviceInOSUExpected = DeviceInOSUExpected;
exports.DeviceNameInvalid = DeviceNameInvalid;
exports.DeviceNotGenuineError = DeviceNotGenuineError;
exports.DeviceOnDashboardExpected = DeviceOnDashboardExpected;
exports.DeviceOnDashboardUnexpected = DeviceOnDashboardUnexpected;
exports.DeviceShouldStayInApp = DeviceShouldStayInApp;
exports.DeviceSocketFail = DeviceSocketFail;
exports.DeviceSocketNoBulkStatus = DeviceSocketNoBulkStatus;
exports.DisconnectedDevice = DisconnectedDevice;
exports.DisconnectedDeviceDuringOperation = DisconnectedDeviceDuringOperation;
exports.ETHAddressNonEIP = ETHAddressNonEIP;
exports.EnpointConfigError = EnpointConfigError;
exports.EthAppPleaseEnableContractData = EthAppPleaseEnableContractData;
exports.FeeEstimationFailed = FeeEstimationFailed;
exports.FeeNotLoaded = FeeNotLoaded;
exports.FeeRequired = FeeRequired;
exports.FeeTooHigh = FeeTooHigh;
exports.FirmwareNotRecognized = FirmwareNotRecognized;
exports.FirmwareOrAppUpdateRequired = FirmwareOrAppUpdateRequired;
exports.GasLessThanEstimate = GasLessThanEstimate;
exports.GenuineCheckFailed = GenuineCheckFailed;
exports.HardResetFail = HardResetFail;
exports.InvalidAddress = InvalidAddress;
exports.InvalidAddressBecauseDestinationIsAlsoSource = InvalidAddressBecauseDestinationIsAlsoSource;
exports.InvalidXRPTag = InvalidXRPTag;
exports.LatestMCUInstalledError = LatestMCUInstalledError;
exports.LedgerAPI4xx = LedgerAPI4xx;
exports.LedgerAPI5xx = LedgerAPI5xx;
exports.LedgerAPIError = LedgerAPIError;
exports.LedgerAPIErrorWithMessage = LedgerAPIErrorWithMessage;
exports.LedgerAPINotAvailable = LedgerAPINotAvailable;
exports.MCUNotGenuineToDashboard = MCUNotGenuineToDashboard;
exports.ManagerAppAlreadyInstalledError = ManagerAppAlreadyInstalledError;
exports.ManagerAppDepInstallRequired = ManagerAppDepInstallRequired;
exports.ManagerAppDepUninstallRequired = ManagerAppDepUninstallRequired;
exports.ManagerAppRelyOnBTCError = ManagerAppRelyOnBTCError;
exports.ManagerDeviceLockedError = ManagerDeviceLockedError;
exports.ManagerFirmwareNotEnoughSpaceError = ManagerFirmwareNotEnoughSpaceError;
exports.ManagerNotEnoughSpaceError = ManagerNotEnoughSpaceError;
exports.ManagerUninstallBTCDep = ManagerUninstallBTCDep;
exports.NetworkDown = NetworkDown;
exports.NoAccessToCamera = NoAccessToCamera;
exports.NoAddressesFound = NoAddressesFound;
exports.NoDBPathGiven = NoDBPathGiven;
exports.NotEnoughBalance = NotEnoughBalance;
exports.NotEnoughBalanceBecauseDestinationNotCreated = NotEnoughBalanceBecauseDestinationNotCreated;
exports.NotEnoughBalanceInParentAccount = NotEnoughBalanceInParentAccount;
exports.NotEnoughBalanceToDelegate = NotEnoughBalanceToDelegate;
exports.NotEnoughGas = NotEnoughGas;
exports.NotEnoughSpendableBalance = NotEnoughSpendableBalance;
exports.NotSupportedLegacyAddress = NotSupportedLegacyAddress;
exports.PairingFailed = PairingFailed;
exports.PasswordIncorrectError = PasswordIncorrectError;
exports.PasswordsDontMatchError = PasswordsDontMatchError;
exports.RecipientRequired = RecipientRequired;
exports.RecommendSubAccountsToEmpty = RecommendSubAccountsToEmpty;
exports.RecommendUndelegation = RecommendUndelegation;
exports.StatusCodes = StatusCodes;
exports.SyncError = SyncError;
exports.TimeoutTagged = TimeoutTagged;
exports.TransportError = TransportError;
exports.TransportInterfaceNotAvailable = TransportInterfaceNotAvailable;
exports.TransportOpenUserCancelled = TransportOpenUserCancelled;
exports.TransportRaceCondition = TransportRaceCondition;
exports.TransportStatusError = TransportStatusError;
exports.TransportWebUSBGestureRequired = TransportWebUSBGestureRequired;
exports.UnavailableTezosOriginatedAccountReceive = UnavailableTezosOriginatedAccountReceive;
exports.UnavailableTezosOriginatedAccountSend = UnavailableTezosOriginatedAccountSend;
exports.UnexpectedBootloader = UnexpectedBootloader;
exports.UnknownMCU = UnknownMCU;
exports.UpdateFetchFileFail = UpdateFetchFileFail;
exports.UpdateIncorrectHash = UpdateIncorrectHash;
exports.UpdateIncorrectSig = UpdateIncorrectSig;
exports.UpdateYourApp = UpdateYourApp;
exports.UserRefusedAddress = UserRefusedAddress;
exports.UserRefusedAllowManager = UserRefusedAllowManager;
exports.UserRefusedDeviceNameChange = UserRefusedDeviceNameChange;
exports.UserRefusedFirmwareUpdate = UserRefusedFirmwareUpdate;
exports.UserRefusedOnDevice = UserRefusedOnDevice;
exports.WebsocketConnectionError = WebsocketConnectionError;
exports.WebsocketConnectionFailed = WebsocketConnectionFailed;
exports.WrongAppForCurrency = WrongAppForCurrency;
exports.WrongDeviceForAccount = WrongDeviceForAccount;
exports.addCustomErrorDeserializer = addCustomErrorDeserializer;
exports.createCustomErrorClass = createCustomErrorClass;
exports.deserializeError = deserializeError;
exports.getAltStatusMessage = getAltStatusMessage;
exports.serializeError = serializeError;

},{}],5:[function(require,module,exports){
module.exports = require("./lib/erc20");

},{"./lib/erc20":7}],6:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _utils = require("./utils");

var _errors = require("@ledgerhq/errors");

var _bignumber = require("bignumber.js");

var _rlp = require("rlp");

/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/
// FIXME drop:
const starkQuantizationTypeMap = {
  eth: 1,
  erc20: 2,
  erc721: 3,
  erc20mintable: 4,
  erc721mintable: 5
};

function hexBuffer(str) {
  return Buffer.from(str.startsWith("0x") ? str.slice(2) : str, "hex");
}

function maybeHexBuffer(str) {
  if (!str) return null;
  return hexBuffer(str);
}

const remapTransactionRelatedErrors = e => {
  if (e && e.statusCode === 0x6a80) {
    return new _errors.EthAppPleaseEnableContractData("Please enable Contract data on the Ethereum app Settings");
  }

  return e;
};
/**
 * Ethereum API
 *
 * @example
 * import Eth from "@ledgerhq/hw-app-eth";
 * const eth = new Eth(transport)
 */


class Eth {
  constructor(transport, scrambleKey = "w0w") {
    this.transport = void 0;
    this.transport = transport;
    transport.decorateAppAPIMethods(this, ["getAddress", "provideERC20TokenInformation", "signTransaction", "signPersonalMessage", "getAppConfiguration", "signEIP712HashedMessage", "starkGetPublicKey", "starkSignOrder", "starkSignOrder_v2", "starkSignTransfer", "starkSignTransfer_v2", "starkProvideQuantum", "starkProvideQuantum_v2", "starkUnsafeSign", "eth2GetPublicKey", "eth2SetWithdrawalIndex"], scrambleKey);
  }
  /**
   * get Ethereum address for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @option boolDisplay optionally enable or not the display
   * @option boolChaincode optionally enable or not the chaincode request
   * @return an object with a publicKey, address and (optionally) chainCode
   * @example
   * eth.getAddress("44'/60'/0'/0/0").then(o => o.address)
   */


  getAddress(path, boolDisplay, boolChaincode) {
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return this.transport.send(0xe0, 0x02, boolDisplay ? 0x01 : 0x00, boolChaincode ? 0x01 : 0x00, buffer).then(response => {
      let result = {};
      let publicKeyLength = response[0];
      let addressLength = response[1 + publicKeyLength];
      result.publicKey = response.slice(1, 1 + publicKeyLength).toString("hex");
      result.address = "0x" + response.slice(1 + publicKeyLength + 1, 1 + publicKeyLength + 1 + addressLength).toString("ascii");

      if (boolChaincode) {
        result.chainCode = response.slice(1 + publicKeyLength + 1 + addressLength, 1 + publicKeyLength + 1 + addressLength + 32).toString("hex");
      }

      return result;
    });
  }
  /**
   * This commands provides a trusted description of an ERC 20 token
   * to associate a contract address with a ticker and number of decimals.
   *
   * It shall be run immediately before performing a transaction involving a contract
   * calling this contract address to display the proper token information to the user if necessary.
   *
   * @param {*} info: a blob from "erc20.js" utilities that contains all token information.
   *
   * @example
   * import { byContractAddress } from "@ledgerhq/hw-app-eth/erc20"
   * const zrxInfo = byContractAddress("0xe41d2489571d322189246dafa5ebde1f4699f498")
   * if (zrxInfo) await appEth.provideERC20TokenInformation(zrxInfo)
   * const signed = await appEth.signTransaction(path, rawTxHex)
   */


  provideERC20TokenInformation({
    data
  }) {
    return this.transport.send(0xe0, 0x0a, 0x00, 0x00, data).then(() => true, e => {
      if (e && e.statusCode === 0x6d00) {
        // this case happen for older version of ETH app, since older app version had the ERC20 data hardcoded, it's fine to assume it worked.
        // we return a flag to know if the call was effective or not
        return false;
      }

      throw e;
    });
  }
  /**
   * You can sign a transaction and retrieve v, r, s given the raw transaction and the BIP 32 path of the account to sign
   * @example
   eth.signTransaction("44'/60'/0'/0/0", "e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080").then(result => ...)
   */


  signTransaction(path, rawTxHex) {
    let paths = (0, _utils.splitPath)(path);
    let offset = 0;
    let rawTx = Buffer.from(rawTxHex, "hex");
    let toSend = [];
    let response; // Check if the TX is encoded following EIP 155

    let rlpTx = (0, _rlp.decode)(rawTx);
    let rlpOffset = 0;
    let chainIdPrefix = "";

    if (rlpTx.length > 6) {
      let rlpVrs = (0, _rlp.encode)(rlpTx.slice(-3));
      rlpOffset = rawTx.length - (rlpVrs.length - 1);
      const chainIdSrc = rlpTx[6];
      const chainIdBuf = Buffer.alloc(4);
      chainIdSrc.copy(chainIdBuf, 4 - chainIdSrc.length);
      chainIdPrefix = (chainIdBuf.readUInt32BE(0) * 2 + 35).toString(16).slice(0, -2); // Drop the low byte, that comes from the ledger.

      if (chainIdPrefix.length % 2 === 1) {
        chainIdPrefix = "0" + chainIdPrefix;
      }
    }

    while (offset !== rawTx.length) {
      let maxChunkSize = offset === 0 ? 150 - 1 - paths.length * 4 : 150;
      let chunkSize = offset + maxChunkSize > rawTx.length ? rawTx.length - offset : maxChunkSize;

      if (rlpOffset != 0 && offset + chunkSize == rlpOffset) {
        // Make sure that the chunk doesn't end right on the EIP 155 marker if set
        chunkSize--;
      }

      let buffer = Buffer.alloc(offset === 0 ? 1 + paths.length * 4 + chunkSize : chunkSize);

      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        rawTx.copy(buffer, 1 + 4 * paths.length, offset, offset + chunkSize);
      } else {
        rawTx.copy(buffer, 0, offset, offset + chunkSize);
      }

      toSend.push(buffer);
      offset += chunkSize;
    }

    return (0, _utils.foreach)(toSend, (data, i) => this.transport.send(0xe0, 0x04, i === 0 ? 0x00 : 0x80, 0x00, data).then(apduResponse => {
      response = apduResponse;
    })).then(() => {
      const v = chainIdPrefix + response.slice(0, 1).toString("hex");
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        v,
        r,
        s
      };
    }, e => {
      throw remapTransactionRelatedErrors(e);
    });
  }
  /**
   */


  getAppConfiguration() {
    return this.transport.send(0xe0, 0x06, 0x00, 0x00).then(response => {
      let result = {};
      result.arbitraryDataEnabled = response[0] & 0x01;
      result.erc20ProvisioningNecessary = response[0] & 0x02;
      result.starkEnabled = response[0] & 0x04;
      result.starkv2Supported = response[0] & 0x08;
      result.version = "" + response[1] + "." + response[2] + "." + response[3];
      return result;
    });
  }
  /**
  * You can sign a message according to eth_sign RPC call and retrieve v, r, s given the message and the BIP 32 path of the account to sign.
  * @example
  eth.signPersonalMessage("44'/60'/0'/0/0", Buffer.from("test").toString("hex")).then(result => {
  var v = result['v'] - 27;
  v = v.toString(16);
  if (v.length < 2) {
    v = "0" + v;
  }
  console.log("Signature 0x" + result['r'] + result['s'] + v);
  })
   */


  signPersonalMessage(path, messageHex) {
    let paths = (0, _utils.splitPath)(path);
    let offset = 0;
    let message = Buffer.from(messageHex, "hex");
    let toSend = [];
    let response;

    while (offset !== message.length) {
      let maxChunkSize = offset === 0 ? 150 - 1 - paths.length * 4 - 4 : 150;
      let chunkSize = offset + maxChunkSize > message.length ? message.length - offset : maxChunkSize;
      let buffer = Buffer.alloc(offset === 0 ? 1 + paths.length * 4 + 4 + chunkSize : chunkSize);

      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        buffer.writeUInt32BE(message.length, 1 + 4 * paths.length);
        message.copy(buffer, 1 + 4 * paths.length + 4, offset, offset + chunkSize);
      } else {
        message.copy(buffer, 0, offset, offset + chunkSize);
      }

      toSend.push(buffer);
      offset += chunkSize;
    }

    return (0, _utils.foreach)(toSend, (data, i) => this.transport.send(0xe0, 0x08, i === 0 ? 0x00 : 0x80, 0x00, data).then(apduResponse => {
      response = apduResponse;
    })).then(() => {
      const v = response[0];
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        v,
        r,
        s
      };
    });
  }
  /**
  * Sign a prepared message following web3.eth.signTypedData specification. The host computes the domain separator and hashStruct(message)
  * @example
  eth.signEIP712HashedMessage("44'/60'/0'/0/0", Buffer.from("0101010101010101010101010101010101010101010101010101010101010101").toString("hex"), Buffer.from("0202020202020202020202020202020202020202020202020202020202020202").toString("hex")).then(result => {
  var v = result['v'] - 27;
  v = v.toString(16);
  if (v.length < 2) {
    v = "0" + v;
  }
  console.log("Signature 0x" + result['r'] + result['s'] + v);
  })
   */


  signEIP712HashedMessage(path, domainSeparatorHex, hashStructMessageHex) {
    const domainSeparator = hexBuffer(domainSeparatorHex);
    const hashStruct = hexBuffer(hashStructMessageHex);
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4 + 32 + 32, 0);
    let offset = 0;
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    offset = 1 + 4 * paths.length;
    domainSeparator.copy(buffer, offset);
    offset += 32;
    hashStruct.copy(buffer, offset);
    return this.transport.send(0xe0, 0x0c, 0x00, 0x00, buffer).then(response => {
      const v = response[0];
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        v,
        r,
        s
      };
    });
  }
  /**
   * get Stark public key for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @option boolDisplay optionally enable or not the display
   * @return the Stark public key
   */


  starkGetPublicKey(path, boolDisplay) {
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return this.transport.send(0xf0, 0x02, boolDisplay ? 0x01 : 0x00, 0x00, buffer).then(response => {
      return response.slice(0, response.length - 2);
    });
  }
  /**
   * sign a Stark order
   * @param path a path in BIP 32 format
   * @option sourceTokenAddress contract address of the source token (not present for ETH)
   * @param sourceQuantization quantization used for the source token
   * @option destinationTokenAddress contract address of the destination token (not present for ETH)
   * @param destinationQuantization quantization used for the destination token
   * @param sourceVault ID of the source vault
   * @param destinationVault ID of the destination vault
   * @param amountSell amount to sell
   * @param amountBuy amount to buy
   * @param nonce transaction nonce
   * @param timestamp transaction validity timestamp
   * @return the signature
   */


  starkSignOrder(path, sourceTokenAddress, sourceQuantization, destinationTokenAddress, destinationQuantization, sourceVault, destinationVault, amountSell, amountBuy, nonce, timestamp) {
    const sourceTokenAddressHex = maybeHexBuffer(sourceTokenAddress);
    const destinationTokenAddressHex = maybeHexBuffer(destinationTokenAddress);
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4 + 20 + 32 + 20 + 32 + 4 + 4 + 8 + 8 + 4 + 4, 0);
    let offset = 0;
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    offset = 1 + 4 * paths.length;

    if (sourceTokenAddressHex) {
      sourceTokenAddressHex.copy(buffer, offset);
    }

    offset += 20;
    Buffer.from(sourceQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    offset += 32;

    if (destinationTokenAddressHex) {
      destinationTokenAddressHex.copy(buffer, offset);
    }

    offset += 20;
    Buffer.from(destinationQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    offset += 32;
    buffer.writeUInt32BE(sourceVault, offset);
    offset += 4;
    buffer.writeUInt32BE(destinationVault, offset);
    offset += 4;
    Buffer.from(amountSell.toString(16).padStart(16, "0"), "hex").copy(buffer, offset);
    offset += 8;
    Buffer.from(amountBuy.toString(16).padStart(16, "0"), "hex").copy(buffer, offset);
    offset += 8;
    buffer.writeUInt32BE(nonce, offset);
    offset += 4;
    buffer.writeUInt32BE(timestamp, offset);
    return this.transport.send(0xf0, 0x04, 0x01, 0x00, buffer).then(response => {
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        r,
        s
      };
    });
  }
  /**
   * sign a Stark order using the Starkex V2 protocol
   * @param path a path in BIP 32 format
   * @option sourceTokenAddress contract address of the source token (not present for ETH)
   * @param sourceQuantizationType quantization type used for the source token
   * @option sourceQuantization quantization used for the source token (not present for erc 721 or mintable erc 721)
   * @option sourceMintableBlobOrTokenId mintable blob (mintable erc 20 / mintable erc 721) or token id (erc 721) associated to the source token
   * @option destinationTokenAddress contract address of the destination token (not present for ETH)
   * @param destinationQuantizationType quantization type used for the destination token
   * @option destinationQuantization quantization used for the destination token (not present for erc 721 or mintable erc 721)
   * @option destinationMintableBlobOrTokenId mintable blob (mintable erc 20 / mintable erc 721) or token id (erc 721) associated to the destination token
   * @param sourceVault ID of the source vault
   * @param destinationVault ID of the destination vault
   * @param amountSell amount to sell
   * @param amountBuy amount to buy
   * @param nonce transaction nonce
   * @param timestamp transaction validity timestamp
   * @return the signature
   */


  starkSignOrder_v2(path, sourceTokenAddress, sourceQuantizationType, sourceQuantization, sourceMintableBlobOrTokenId, destinationTokenAddress, destinationQuantizationType, destinationQuantization, destinationMintableBlobOrTokenId, sourceVault, destinationVault, amountSell, amountBuy, nonce, timestamp) {
    const sourceTokenAddressHex = maybeHexBuffer(sourceTokenAddress);
    const destinationTokenAddressHex = maybeHexBuffer(destinationTokenAddress);

    if (!(sourceQuantizationType in starkQuantizationTypeMap)) {
      throw new Error("eth.starkSignOrderv2 invalid source quantization type=" + sourceQuantizationType);
    }

    if (!(destinationQuantizationType in starkQuantizationTypeMap)) {
      throw new Error("eth.starkSignOrderv2 invalid destination quantization type=" + destinationQuantizationType);
    }

    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4 + 1 + 20 + 32 + 32 + 1 + 20 + 32 + 32 + 4 + 4 + 8 + 8 + 4 + 4, 0);
    let offset = 0;
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    offset = 1 + 4 * paths.length;
    buffer[offset] = starkQuantizationTypeMap[sourceQuantizationType];
    offset++;

    if (sourceTokenAddressHex) {
      sourceTokenAddressHex.copy(buffer, offset);
    }

    offset += 20;

    if (sourceQuantization) {
      Buffer.from(sourceQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;

    if (sourceMintableBlobOrTokenId) {
      Buffer.from(sourceMintableBlobOrTokenId.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;
    buffer[offset] = starkQuantizationTypeMap[destinationQuantizationType];
    offset++;

    if (destinationTokenAddressHex) {
      destinationTokenAddressHex.copy(buffer, offset);
    }

    offset += 20;

    if (destinationQuantization) {
      Buffer.from(destinationQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;

    if (destinationMintableBlobOrTokenId) {
      Buffer.from(destinationMintableBlobOrTokenId.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;
    buffer.writeUInt32BE(sourceVault, offset);
    offset += 4;
    buffer.writeUInt32BE(destinationVault, offset);
    offset += 4;
    Buffer.from(amountSell.toString(16).padStart(16, "0"), "hex").copy(buffer, offset);
    offset += 8;
    Buffer.from(amountBuy.toString(16).padStart(16, "0"), "hex").copy(buffer, offset);
    offset += 8;
    buffer.writeUInt32BE(nonce, offset);
    offset += 4;
    buffer.writeUInt32BE(timestamp, offset);
    return this.transport.send(0xf0, 0x04, 0x03, 0x00, buffer).then(response => {
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        r,
        s
      };
    });
  }
  /**
   * sign a Stark transfer
   * @param path a path in BIP 32 format
   * @option transferTokenAddress contract address of the token to be transferred (not present for ETH)
   * @param transferQuantization quantization used for the token to be transferred
   * @param targetPublicKey target Stark public key
   * @param sourceVault ID of the source vault
   * @param destinationVault ID of the destination vault
   * @param amountTransfer amount to transfer
   * @param nonce transaction nonce
   * @param timestamp transaction validity timestamp
   * @return the signature
   */


  starkSignTransfer(path, transferTokenAddress, transferQuantization, targetPublicKey, sourceVault, destinationVault, amountTransfer, nonce, timestamp) {
    const transferTokenAddressHex = maybeHexBuffer(transferTokenAddress);
    const targetPublicKeyHex = hexBuffer(targetPublicKey);
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4 + 20 + 32 + 32 + 4 + 4 + 8 + 4 + 4, 0);
    let offset = 0;
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    offset = 1 + 4 * paths.length;

    if (transferTokenAddressHex) {
      transferTokenAddressHex.copy(buffer, offset);
    }

    offset += 20;
    Buffer.from(transferQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    offset += 32;
    targetPublicKeyHex.copy(buffer, offset);
    offset += 32;
    buffer.writeUInt32BE(sourceVault, offset);
    offset += 4;
    buffer.writeUInt32BE(destinationVault, offset);
    offset += 4;
    Buffer.from(amountTransfer.toString(16).padStart(16, "0"), "hex").copy(buffer, offset);
    offset += 8;
    buffer.writeUInt32BE(nonce, offset);
    offset += 4;
    buffer.writeUInt32BE(timestamp, offset);
    return this.transport.send(0xf0, 0x04, 0x02, 0x00, buffer).then(response => {
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        r,
        s
      };
    });
  }
  /**
   * sign a Stark transfer or conditional transfer using the Starkex V2 protocol
   * @param path a path in BIP 32 format
   * @option transferTokenAddress contract address of the token to be transferred (not present for ETH)
   * @param transferQuantizationType quantization type used for the token to be transferred
   * @option transferQuantization quantization used for the token to be transferred (not present for erc 721 or mintable erc 721)
   * @option transferMintableBlobOrTokenId mintable blob (mintable erc 20 / mintable erc 721) or token id (erc 721) associated to the token to be transferred
   * @param targetPublicKey target Stark public key
   * @param sourceVault ID of the source vault
   * @param destinationVault ID of the destination vault
   * @param amountTransfer amount to transfer
   * @param nonce transaction nonce
   * @param timestamp transaction validity timestamp
   * @option conditionalTransferAddress onchain address of the condition for a conditional transfer
   * @option conditionalTransferFact fact associated to the condition for a conditional transfer
   * @return the signature
   */


  starkSignTransfer_v2(path, transferTokenAddress, transferQuantizationType, transferQuantization, transferMintableBlobOrTokenId, targetPublicKey, sourceVault, destinationVault, amountTransfer, nonce, timestamp, conditionalTransferAddress, conditionalTransferFact) {
    const transferTokenAddressHex = maybeHexBuffer(transferTokenAddress);
    const targetPublicKeyHex = hexBuffer(targetPublicKey);
    const conditionalTransferAddressHex = maybeHexBuffer(conditionalTransferAddress);

    if (!(transferQuantizationType in starkQuantizationTypeMap)) {
      throw new Error("eth.starkSignTransferv2 invalid quantization type=" + transferQuantizationType);
    }

    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4 + 1 + 20 + 32 + 32 + 32 + 4 + 4 + 8 + 4 + 4 + (conditionalTransferAddressHex ? 32 + 20 : 0), 0);
    let offset = 0;
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    offset = 1 + 4 * paths.length;
    buffer[offset] = starkQuantizationTypeMap[transferQuantizationType];
    offset++;

    if (transferTokenAddressHex) {
      transferTokenAddressHex.copy(buffer, offset);
    }

    offset += 20;

    if (transferQuantization) {
      Buffer.from(transferQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;

    if (transferMintableBlobOrTokenId) {
      Buffer.from(transferMintableBlobOrTokenId.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;
    targetPublicKeyHex.copy(buffer, offset);
    offset += 32;
    buffer.writeUInt32BE(sourceVault, offset);
    offset += 4;
    buffer.writeUInt32BE(destinationVault, offset);
    offset += 4;
    Buffer.from(amountTransfer.toString(16).padStart(16, "0"), "hex").copy(buffer, offset);
    offset += 8;
    buffer.writeUInt32BE(nonce, offset);
    offset += 4;
    buffer.writeUInt32BE(timestamp, offset);

    if (conditionalTransferAddressHex && conditionalTransferFact) {
      offset += 4;
      Buffer.from(conditionalTransferFact.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
      offset += 32;
      conditionalTransferAddressHex.copy(buffer, offset);
    }

    return this.transport.send(0xf0, 0x04, conditionalTransferAddressHex ? 0x05 : 0x04, 0x00, buffer).then(response => {
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        r,
        s
      };
    });
  }
  /**
   * provide quantization information before singing a deposit or withdrawal Stark powered contract call
   *
   * It shall be run following a provideERC20TokenInformation call for the given contract
   *
   * @param operationContract contract address of the token to be transferred (not present for ETH)
   * @param operationQuantization quantization used for the token to be transferred
   */


  starkProvideQuantum(operationContract, operationQuantization) {
    const operationContractHex = maybeHexBuffer(operationContract);
    let buffer = Buffer.alloc(20 + 32, 0);

    if (operationContractHex) {
      operationContractHex.copy(buffer, 0);
    }

    Buffer.from(operationQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, 20);
    return this.transport.send(0xf0, 0x08, 0x00, 0x00, buffer).then(() => true, e => {
      if (e && e.statusCode === 0x6d00) {
        // this case happen for ETH application versions not supporting Stark extensions
        return false;
      }

      throw e;
    });
  }
  /**
   * provide quantization information before singing a deposit or withdrawal Stark powered contract call using the Starkex V2 protocol
   *
   * It shall be run following a provideERC20TokenInformation call for the given contract
   *
   * @param operationContract contract address of the token to be transferred (not present for ETH)
   * @param operationQuantizationType quantization type of the token to be transferred
   * @option operationQuantization quantization used for the token to be transferred (not present for erc 721 or mintable erc 721)
   * @option operationMintableBlobOrTokenId mintable blob (mintable erc 20 / mintable erc 721) or token id (erc 721) of the token to be transferred
   */


  starkProvideQuantum_v2(operationContract, operationQuantizationType, operationQuantization, operationMintableBlobOrTokenId) {
    const operationContractHex = maybeHexBuffer(operationContract);

    if (!(operationQuantizationType in starkQuantizationTypeMap)) {
      throw new Error("eth.starkProvideQuantumV2 invalid quantization type=" + operationQuantizationType);
    }

    let buffer = Buffer.alloc(20 + 32 + 32, 0);
    let offset = 0;

    if (operationContractHex) {
      operationContractHex.copy(buffer, offset);
    }

    offset += 20;

    if (operationQuantization) {
      Buffer.from(operationQuantization.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    offset += 32;

    if (operationMintableBlobOrTokenId) {
      Buffer.from(operationMintableBlobOrTokenId.toString(16).padStart(64, "0"), "hex").copy(buffer, offset);
    }

    return this.transport.send(0xf0, 0x08, starkQuantizationTypeMap[operationQuantizationType], 0x00, buffer).then(() => true, e => {
      if (e && e.statusCode === 0x6d00) {
        // this case happen for ETH application versions not supporting Stark extensions
        return false;
      }

      throw e;
    });
  }
  /**
   * sign the given hash over the Stark curve
   * It is intended for speed of execution in case an unknown Stark model is pushed and should be avoided as much as possible.
   * @param path a path in BIP 32 format
   * @param hash hexadecimal hash to sign
   * @return the signature
   */


  starkUnsafeSign(path, hash) {
    const hashHex = hexBuffer(hash);
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4 + 32);
    let offset = 0;
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    offset = 1 + 4 * paths.length;
    hashHex.copy(buffer, offset);
    return this.transport.send(0xf0, 0x0a, 0x00, 0x00, buffer).then(response => {
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return {
        r,
        s
      };
    });
  }
  /**
   * get an Ethereum 2 BLS-12 381 public key for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @option boolDisplay optionally enable or not the display
   * @return an object with a publicKey
   * @example
   * eth.eth2GetPublicKey("12381/3600/0/0").then(o => o.publicKey)
   */


  eth2GetPublicKey(path, boolDisplay) {
    let paths = (0, _utils.splitPath)(path);
    let buffer = Buffer.alloc(1 + paths.length * 4);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return this.transport.send(0xe0, 0x0e, boolDisplay ? 0x01 : 0x00, 0x00, buffer).then(response => {
      let result = {};
      result.publicKey = response.slice(0, -2).toString("hex");
      return result;
    });
  }
  /**
   * Set the index of a Withdrawal key used as withdrawal credentials in an ETH 2 deposit contract call signature
   *
   * It shall be run before the ETH 2 deposit transaction is signed. If not called, the index is set to 0
   *
   * @param withdrawalIndex index path in the EIP 2334 path m/12381/3600/withdrawalIndex/0
   * @return True if the method was executed successfully
   */


  eth2SetWithdrawalIndex(withdrawalIndex) {
    let buffer = Buffer.alloc(4, 0);
    buffer.writeUInt32BE(withdrawalIndex, 0);
    return this.transport.send(0xe0, 0x10, 0x00, 0x00, buffer).then(() => true, e => {
      if (e && e.statusCode === 0x6d00) {
        // this case happen for ETH application versions not supporting ETH 2
        return false;
      }

      throw e;
    });
  }

}

exports.default = Eth;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./utils":8,"@ledgerhq/errors":4,"bignumber.js":13,"buffer":16,"rlp":19}],7:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.list = exports.byContractAddress = void 0;

var _erc20Signatures = _interopRequireDefault(require("@ledgerhq/cryptoassets/data/erc20-signatures"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Retrieve the token information by a given contract address if any
 */
const byContractAddress = contract => get().byContract(asContractAddress(contract));
/**
 * list all the ERC20 tokens informations
 */


exports.byContractAddress = byContractAddress;

const list = () => get().list();

exports.list = list;

const asContractAddress = addr => {
  const a = addr.toLowerCase();
  return a.startsWith("0x") ? a : "0x" + a;
}; // this internal get() will lazy load and cache the data from the erc20 data blob


const get = (() => {
  let cache;
  return () => {
    if (cache) return cache;
    const buf = Buffer.from(_erc20Signatures.default, "base64");
    const byContract = {};
    const entries = [];
    let i = 0;

    while (i < buf.length) {
      const length = buf.readUInt32BE(i);
      i += 4;
      const item = buf.slice(i, i + length);
      let j = 0;
      const tickerLength = item.readUInt8(j);
      j += 1;
      const ticker = item.slice(j, j + tickerLength).toString("ascii");
      j += tickerLength;
      const contractAddress = asContractAddress(item.slice(j, j + 20).toString("hex"));
      j += 20;
      const decimals = item.readUInt32BE(j);
      j += 4;
      const chainId = item.readUInt32BE(j);
      j += 4;
      const signature = item.slice(j);
      const entry = {
        ticker,
        contractAddress,
        decimals,
        chainId,
        signature,
        data: item
      };
      entries.push(entry);
      byContract[contractAddress] = entry;
      i += length;
    }

    const api = {
      list: () => entries,
      byContract: contractAddress => byContract[contractAddress]
    };
    cache = api;
    return api;
  };
})();

}).call(this)}).call(this,require("buffer").Buffer)
},{"@ledgerhq/cryptoassets/data/erc20-signatures":3,"buffer":16}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defer = defer;
exports.splitPath = splitPath;
exports.eachSeries = eachSeries;
exports.foreach = foreach;
exports.doIf = doIf;
exports.asyncWhile = asyncWhile;

/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/
function defer() {
  let resolve, reject;
  let promise = new Promise(function (success, failure) {
    resolve = success;
    reject = failure;
  });
  if (!resolve || !reject) throw "defer() error"; // this never happens and is just to make flow happy

  return {
    promise,
    resolve,
    reject
  };
} // TODO use bip32-path library


function splitPath(path) {
  let result = [];
  let components = path.split("/");
  components.forEach(element => {
    let number = parseInt(element, 10);

    if (isNaN(number)) {
      return; // FIXME shouldn't it throws instead?
    }

    if (element.length > 1 && element[element.length - 1] === "'") {
      number += 0x80000000;
    }

    result.push(number);
  });
  return result;
} // TODO use async await


function eachSeries(arr, fun) {
  return arr.reduce((p, e) => p.then(() => fun(e)), Promise.resolve());
}

function foreach(arr, callback) {
  function iterate(index, array, result) {
    if (index >= array.length) {
      return result;
    } else return callback(array[index], index).then(function (res) {
      result.push(res);
      return iterate(index + 1, array, result);
    });
  }

  return Promise.resolve().then(() => iterate(0, arr, []));
}

function doIf(condition, callback) {
  return Promise.resolve().then(() => {
    if (condition) {
      return callback();
    }
  });
}

function asyncWhile(predicate, callback) {
  function iterate(result) {
    if (!predicate()) {
      return result;
    } else {
      return callback().then(res => {
        result.push(res);
        return iterate(result);
      });
    }
  }

  return Promise.resolve([]).then(iterate);
}

},{}],9:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _u2fApi = require("u2f-api");

var _hwTransport = _interopRequireDefault(require("@ledgerhq/hw-transport"));

var _logs = require("@ledgerhq/logs");

var _errors = require("@ledgerhq/errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function wrapU2FTransportError(originalError, message, id) {
  const err = new _errors.TransportError(message, id); // $FlowFixMe

  err.originalError = originalError;
  return err;
}

function wrapApdu(apdu, key) {
  const result = Buffer.alloc(apdu.length);

  for (let i = 0; i < apdu.length; i++) {
    result[i] = apdu[i] ^ key[i % key.length];
  }

  return result;
} // Convert from normal to web-safe, strip trailing "="s


const webSafe64 = base64 => base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // Convert from web-safe to normal, add trailing "="s


const normal64 = base64 => base64.replace(/-/g, "+").replace(/_/g, "/") + "==".substring(0, 3 * base64.length % 4);

function attemptExchange(apdu, timeoutMillis, scrambleKey, unwrap) {
  const keyHandle = wrapApdu(apdu, scrambleKey);
  const challenge = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");
  const signRequest = {
    version: "U2F_V2",
    keyHandle: webSafe64(keyHandle.toString("base64")),
    challenge: webSafe64(challenge.toString("base64")),
    appId: location.origin
  };
  (0, _logs.log)("apdu", "=> " + apdu.toString("hex"));
  return (0, _u2fApi.sign)(signRequest, timeoutMillis / 1000).then(response => {
    const {
      signatureData
    } = response;

    if (typeof signatureData === "string") {
      const data = Buffer.from(normal64(signatureData), "base64");
      let result;

      if (!unwrap) {
        result = data;
      } else {
        result = data.slice(5);
      }

      (0, _logs.log)("apdu", "<= " + result.toString("hex"));
      return result;
    } else {
      throw response;
    }
  });
}

let transportInstances = [];

function emitDisconnect() {
  transportInstances.forEach(t => t.emit("disconnect"));
  transportInstances = [];
}

function isTimeoutU2FError(u2fError) {
  return u2fError.metaData.code === 5;
}
/**
 * U2F web Transport implementation
 * @example
 * import TransportU2F from "@ledgerhq/hw-transport-u2f";
 * ...
 * TransportU2F.create().then(transport => ...)
 */


class TransportU2F extends _hwTransport.default {
  /*
   */

  /*
   */

  /**
   * static function to create a new Transport from a connected Ledger device discoverable via U2F (browser support)
   */
  static async open(_, _openTimeout = 5000) {
    return new TransportU2F();
  }

  constructor() {
    super();
    this.scrambleKey = void 0;
    this.unwrap = true;
    transportInstances.push(this);
  }
  /**
   * Exchange with the device using APDU protocol.
   * @param apdu
   * @returns a promise of apdu response
   */


  async exchange(apdu) {
    try {
      return await attemptExchange(apdu, this.exchangeTimeout, this.scrambleKey, this.unwrap);
    } catch (e) {
      const isU2FError = typeof e.metaData === "object";

      if (isU2FError) {
        if (isTimeoutU2FError(e)) {
          emitDisconnect();
        } // the wrapping make error more usable and "printable" to the end user.


        throw wrapU2FTransportError(e, "Failed to sign with Ledger device: U2F " + e.metaData.type, "U2F_" + e.metaData.code);
      } else {
        throw e;
      }
    }
  }
  /**
   */


  setScrambleKey(scrambleKey) {
    this.scrambleKey = Buffer.from(scrambleKey, "ascii");
  }
  /**
   */


  setUnwrap(unwrap) {
    this.unwrap = unwrap;
  }

  close() {
    // u2f have no way to clean things up
    return Promise.resolve();
  }

}

exports.default = TransportU2F;
TransportU2F.isSupported = _u2fApi.isSupported;

TransportU2F.list = () => // this transport is not discoverable but we are going to guess if it is here with isSupported()
(0, _u2fApi.isSupported)().then(supported => supported ? [null] : []);

TransportU2F.listen = observer => {
  let unsubscribed = false;
  (0, _u2fApi.isSupported)().then(supported => {
    if (unsubscribed) return;

    if (supported) {
      observer.next({
        type: "add",
        descriptor: null
      });
      observer.complete();
    } else {
      observer.error(new _errors.TransportError("U2F browser support is needed for Ledger. " + "Please use Chrome, Opera or Firefox with a U2F extension. " + "Also make sure you're on an HTTPS connection", "U2FNotSupported"));
    }
  });
  return {
    unsubscribe: () => {
      unsubscribed = true;
    }
  };
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"@ledgerhq/errors":4,"@ledgerhq/hw-transport":10,"@ledgerhq/logs":11,"buffer":16,"u2f-api":20}],10:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "TransportError", {
  enumerable: true,
  get: function () {
    return _errors.TransportError;
  }
});
Object.defineProperty(exports, "StatusCodes", {
  enumerable: true,
  get: function () {
    return _errors.StatusCodes;
  }
});
Object.defineProperty(exports, "getAltStatusMessage", {
  enumerable: true,
  get: function () {
    return _errors.getAltStatusMessage;
  }
});
Object.defineProperty(exports, "TransportStatusError", {
  enumerable: true,
  get: function () {
    return _errors.TransportStatusError;
  }
});
exports.default = void 0;

var _events = _interopRequireDefault(require("events"));

var _errors = require("@ledgerhq/errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Transport defines the generic interface to share between node/u2f impl
 * A **Descriptor** is a parametric type that is up to be determined for the implementation.
 * it can be for instance an ID, an file path, a URL,...
 */
class Transport {
  constructor() {
    this.exchangeTimeout = 30000;
    this.unresponsiveTimeout = 15000;
    this.deviceModel = null;
    this._events = new _events.default();

    this.send = async (cla, ins, p1, p2, data = Buffer.alloc(0), statusList = [_errors.StatusCodes.OK]) => {
      if (data.length >= 256) {
        throw new _errors.TransportError("data.length exceed 256 bytes limit. Got: " + data.length, "DataLengthTooBig");
      }

      const response = await this.exchange(Buffer.concat([Buffer.from([cla, ins, p1, p2]), Buffer.from([data.length]), data]));
      const sw = response.readUInt16BE(response.length - 2);

      if (!statusList.some(s => s === sw)) {
        throw new _errors.TransportStatusError(sw);
      }

      return response;
    };

    this.exchangeBusyPromise = void 0;

    this.exchangeAtomicImpl = async f => {
      if (this.exchangeBusyPromise) {
        throw new _errors.TransportRaceCondition("An action was already pending on the Ledger device. Please deny or reconnect.");
      }

      let resolveBusy;
      const busyPromise = new Promise(r => {
        resolveBusy = r;
      });
      this.exchangeBusyPromise = busyPromise;
      let unresponsiveReached = false;
      const timeout = setTimeout(() => {
        unresponsiveReached = true;
        this.emit("unresponsive");
      }, this.unresponsiveTimeout);

      try {
        const res = await f();

        if (unresponsiveReached) {
          this.emit("responsive");
        }

        return res;
      } finally {
        clearTimeout(timeout);
        if (resolveBusy) resolveBusy();
        this.exchangeBusyPromise = null;
      }
    };

    this._appAPIlock = null;
  }

  /**
   * low level api to communicate with the device
   * This method is for implementations to implement but should not be directly called.
   * Instead, the recommanded way is to use send() method
   * @param apdu the data to send
   * @return a Promise of response data
   */
  exchange(_apdu) {
    throw new Error("exchange not implemented");
  }
  /**
   * set the "scramble key" for the next exchanges with the device.
   * Each App can have a different scramble key and they internally will set it at instanciation.
   * @param key the scramble key
   */


  setScrambleKey(_key) {}
  /**
   * close the exchange with the device.
   * @return a Promise that ends when the transport is closed.
   */


  close() {
    return Promise.resolve();
  }

  /**
   * Listen to an event on an instance of transport.
   * Transport implementation can have specific events. Here is the common events:
   * * `"disconnect"` : triggered if Transport is disconnected
   */
  on(eventName, cb) {
    this._events.on(eventName, cb);
  }
  /**
   * Stop listening to an event on an instance of transport.
   */


  off(eventName, cb) {
    this._events.removeListener(eventName, cb);
  }

  emit(event, ...args) {
    this._events.emit(event, ...args);
  }
  /**
   * Enable or not logs of the binary exchange
   */


  setDebugMode() {
    console.warn("setDebugMode is deprecated. use @ledgerhq/logs instead. No logs are emitted in this anymore.");
  }
  /**
   * Set a timeout (in milliseconds) for the exchange call. Only some transport might implement it. (e.g. U2F)
   */


  setExchangeTimeout(exchangeTimeout) {
    this.exchangeTimeout = exchangeTimeout;
  }
  /**
   * Define the delay before emitting "unresponsive" on an exchange that does not respond
   */


  setExchangeUnresponsiveTimeout(unresponsiveTimeout) {
    this.unresponsiveTimeout = unresponsiveTimeout;
  }
  /**
   * wrapper on top of exchange to simplify work of the implementation.
   * @param cla
   * @param ins
   * @param p1
   * @param p2
   * @param data
   * @param statusList is a list of accepted status code (shorts). [0x9000] by default
   * @return a Promise of response buffer
   */


  /**
   * create() allows to open the first descriptor available or
   * throw if there is none or if timeout is reached.
   * This is a light helper, alternative to using listen() and open() (that you may need for any more advanced usecase)
   * @example
  TransportFoo.create().then(transport => ...)
   */
  static create(openTimeout = 3000, listenTimeout) {
    return new Promise((resolve, reject) => {
      let found = false;
      const sub = this.listen({
        next: e => {
          found = true;
          if (sub) sub.unsubscribe();
          if (listenTimeoutId) clearTimeout(listenTimeoutId);
          this.open(e.descriptor, openTimeout).then(resolve, reject);
        },
        error: e => {
          if (listenTimeoutId) clearTimeout(listenTimeoutId);
          reject(e);
        },
        complete: () => {
          if (listenTimeoutId) clearTimeout(listenTimeoutId);

          if (!found) {
            reject(new _errors.TransportError(this.ErrorMessage_NoDeviceFound, "NoDeviceFound"));
          }
        }
      });
      const listenTimeoutId = listenTimeout ? setTimeout(() => {
        sub.unsubscribe();
        reject(new _errors.TransportError(this.ErrorMessage_ListenTimeout, "ListenTimeout"));
      }, listenTimeout) : null;
    });
  }

  decorateAppAPIMethods(self, methods, scrambleKey) {
    for (let methodName of methods) {
      self[methodName] = this.decorateAppAPIMethod(methodName, self[methodName], self, scrambleKey);
    }
  }

  decorateAppAPIMethod(methodName, f, ctx, scrambleKey) {
    return async (...args) => {
      const {
        _appAPIlock
      } = this;

      if (_appAPIlock) {
        return Promise.reject(new _errors.TransportError("Ledger Device is busy (lock " + _appAPIlock + ")", "TransportLocked"));
      }

      try {
        this._appAPIlock = methodName;
        this.setScrambleKey(scrambleKey);
        return await f.apply(ctx, args);
      } finally {
        this._appAPIlock = null;
      }
    };
  }

}

exports.default = Transport;
Transport.isSupported = void 0;
Transport.list = void 0;
Transport.listen = void 0;
Transport.open = void 0;
Transport.ErrorMessage_ListenTimeout = "No Ledger device found (timeout)";
Transport.ErrorMessage_NoDeviceFound = "No Ledger device found";

}).call(this)}).call(this,require("buffer").Buffer)
},{"@ledgerhq/errors":4,"buffer":16,"events":17}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.listen = exports.log = void 0;

/**
 * A Log object
 */
let id = 0;
const subscribers = [];
/**
 * log something
 * @param type a namespaced identifier of the log (it is not a level like "debug", "error" but more like "apdu-in", "apdu-out", etc...)
 * @param message a clear message of the log associated to the type
 */

const log = (type, message, data) => {
  const obj = {
    type,
    id: String(++id),
    date: new Date()
  };
  if (message) obj.message = message;
  if (data) obj.data = data;
  dispatch(obj);
};
/**
 * listen to logs.
 * @param cb that is called for each future log() with the Log object
 * @return a function that can be called to unsubscribe the listener
 */


exports.log = log;

const listen = cb => {
  subscribers.push(cb);
  return () => {
    const i = subscribers.indexOf(cb);

    if (i !== -1) {
      // equivalent of subscribers.splice(i, 1) // https://twitter.com/Rich_Harris/status/1125850391155965952
      subscribers[i] = subscribers[subscribers.length - 1];
      subscribers.pop();
    }
  };
};

exports.listen = listen;

function dispatch(log) {
  for (let i = 0; i < subscribers.length; i++) {
    try {
      subscribers[i](log);
    } catch (e) {
      console.error(e);
    }
  }
} // for debug purpose


if (typeof window !== "undefined") {
  window.__ledgerLogsListen = listen;
}

},{}],12:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],13:[function(require,module,exports){
;(function (globalObject) {
  'use strict';

/*
 *      bignumber.js v9.0.1
 *      A JavaScript library for arbitrary-precision arithmetic.
 *      https://github.com/MikeMcl/bignumber.js
 *      Copyright (c) 2020 Michael Mclaughlin <M8ch88l@gmail.com>
 *      MIT Licensed.
 *
 *      BigNumber.prototype methods     |  BigNumber methods
 *                                      |
 *      absoluteValue            abs    |  clone
 *      comparedTo                      |  config               set
 *      decimalPlaces            dp     |      DECIMAL_PLACES
 *      dividedBy                div    |      ROUNDING_MODE
 *      dividedToIntegerBy       idiv   |      EXPONENTIAL_AT
 *      exponentiatedBy          pow    |      RANGE
 *      integerValue                    |      CRYPTO
 *      isEqualTo                eq     |      MODULO_MODE
 *      isFinite                        |      POW_PRECISION
 *      isGreaterThan            gt     |      FORMAT
 *      isGreaterThanOrEqualTo   gte    |      ALPHABET
 *      isInteger                       |  isBigNumber
 *      isLessThan               lt     |  maximum              max
 *      isLessThanOrEqualTo      lte    |  minimum              min
 *      isNaN                           |  random
 *      isNegative                      |  sum
 *      isPositive                      |
 *      isZero                          |
 *      minus                           |
 *      modulo                   mod    |
 *      multipliedBy             times  |
 *      negated                         |
 *      plus                            |
 *      precision                sd     |
 *      shiftedBy                       |
 *      squareRoot               sqrt   |
 *      toExponential                   |
 *      toFixed                         |
 *      toFormat                        |
 *      toFraction                      |
 *      toJSON                          |
 *      toNumber                        |
 *      toPrecision                     |
 *      toString                        |
 *      valueOf                         |
 *
 */


  var BigNumber,
    isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,
    mathceil = Math.ceil,
    mathfloor = Math.floor,

    bignumberError = '[BigNumber Error] ',
    tooManyDigits = bignumberError + 'Number primitive has more than 15 significant digits: ',

    BASE = 1e14,
    LOG_BASE = 14,
    MAX_SAFE_INTEGER = 0x1fffffffffffff,         // 2^53 - 1
    // MAX_INT32 = 0x7fffffff,                   // 2^31 - 1
    POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13],
    SQRT_BASE = 1e7,

    // EDITABLE
    // The limit on the value of DECIMAL_PLACES, TO_EXP_NEG, TO_EXP_POS, MIN_EXP, MAX_EXP, and
    // the arguments to toExponential, toFixed, toFormat, and toPrecision.
    MAX = 1E9;                                   // 0 to MAX_INT32


  /*
   * Create and return a BigNumber constructor.
   */
  function clone(configObject) {
    var div, convertBase, parseNumeric,
      P = BigNumber.prototype = { constructor: BigNumber, toString: null, valueOf: null },
      ONE = new BigNumber(1),


      //----------------------------- EDITABLE CONFIG DEFAULTS -------------------------------


      // The default values below must be integers within the inclusive ranges stated.
      // The values can also be changed at run-time using BigNumber.set.

      // The maximum number of decimal places for operations involving division.
      DECIMAL_PLACES = 20,                     // 0 to MAX

      // The rounding mode used when rounding to the above decimal places, and when using
      // toExponential, toFixed, toFormat and toPrecision, and round (default value).
      // UP         0 Away from zero.
      // DOWN       1 Towards zero.
      // CEIL       2 Towards +Infinity.
      // FLOOR      3 Towards -Infinity.
      // HALF_UP    4 Towards nearest neighbour. If equidistant, up.
      // HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
      // HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
      // HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
      // HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
      ROUNDING_MODE = 4,                       // 0 to 8

      // EXPONENTIAL_AT : [TO_EXP_NEG , TO_EXP_POS]

      // The exponent value at and beneath which toString returns exponential notation.
      // Number type: -7
      TO_EXP_NEG = -7,                         // 0 to -MAX

      // The exponent value at and above which toString returns exponential notation.
      // Number type: 21
      TO_EXP_POS = 21,                         // 0 to MAX

      // RANGE : [MIN_EXP, MAX_EXP]

      // The minimum exponent value, beneath which underflow to zero occurs.
      // Number type: -324  (5e-324)
      MIN_EXP = -1e7,                          // -1 to -MAX

      // The maximum exponent value, above which overflow to Infinity occurs.
      // Number type:  308  (1.7976931348623157e+308)
      // For MAX_EXP > 1e7, e.g. new BigNumber('1e100000000').plus(1) may be slow.
      MAX_EXP = 1e7,                           // 1 to MAX

      // Whether to use cryptographically-secure random number generation, if available.
      CRYPTO = false,                          // true or false

      // The modulo mode used when calculating the modulus: a mod n.
      // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
      // The remainder (r) is calculated as: r = a - n * q.
      //
      // UP        0 The remainder is positive if the dividend is negative, else is negative.
      // DOWN      1 The remainder has the same sign as the dividend.
      //             This modulo mode is commonly known as 'truncated division' and is
      //             equivalent to (a % n) in JavaScript.
      // FLOOR     3 The remainder has the same sign as the divisor (Python %).
      // HALF_EVEN 6 This modulo mode implements the IEEE 754 remainder function.
      // EUCLID    9 Euclidian division. q = sign(n) * floor(a / abs(n)).
      //             The remainder is always positive.
      //
      // The truncated division, floored division, Euclidian division and IEEE 754 remainder
      // modes are commonly used for the modulus operation.
      // Although the other rounding modes can also be used, they may not give useful results.
      MODULO_MODE = 1,                         // 0 to 9

      // The maximum number of significant digits of the result of the exponentiatedBy operation.
      // If POW_PRECISION is 0, there will be unlimited significant digits.
      POW_PRECISION = 0,                    // 0 to MAX

      // The format specification used by the BigNumber.prototype.toFormat method.
      FORMAT = {
        prefix: '',
        groupSize: 3,
        secondaryGroupSize: 0,
        groupSeparator: ',',
        decimalSeparator: '.',
        fractionGroupSize: 0,
        fractionGroupSeparator: '\xA0',      // non-breaking space
        suffix: ''
      },

      // The alphabet used for base conversion. It must be at least 2 characters long, with no '+',
      // '-', '.', whitespace, or repeated character.
      // '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'
      ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';


    //------------------------------------------------------------------------------------------


    // CONSTRUCTOR


    /*
     * The BigNumber constructor and exported function.
     * Create and return a new instance of a BigNumber object.
     *
     * v {number|string|BigNumber} A numeric value.
     * [b] {number} The base of v. Integer, 2 to ALPHABET.length inclusive.
     */
    function BigNumber(v, b) {
      var alphabet, c, caseChanged, e, i, isNum, len, str,
        x = this;

      // Enable constructor call without `new`.
      if (!(x instanceof BigNumber)) return new BigNumber(v, b);

      if (b == null) {

        if (v && v._isBigNumber === true) {
          x.s = v.s;

          if (!v.c || v.e > MAX_EXP) {
            x.c = x.e = null;
          } else if (v.e < MIN_EXP) {
            x.c = [x.e = 0];
          } else {
            x.e = v.e;
            x.c = v.c.slice();
          }

          return;
        }

        if ((isNum = typeof v == 'number') && v * 0 == 0) {

          // Use `1 / n` to handle minus zero also.
          x.s = 1 / v < 0 ? (v = -v, -1) : 1;

          // Fast path for integers, where n < 2147483648 (2**31).
          if (v === ~~v) {
            for (e = 0, i = v; i >= 10; i /= 10, e++);

            if (e > MAX_EXP) {
              x.c = x.e = null;
            } else {
              x.e = e;
              x.c = [v];
            }

            return;
          }

          str = String(v);
        } else {

          if (!isNumeric.test(str = String(v))) return parseNumeric(x, str, isNum);

          x.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
        }

        // Decimal point?
        if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');

        // Exponential form?
        if ((i = str.search(/e/i)) > 0) {

          // Determine exponent.
          if (e < 0) e = i;
          e += +str.slice(i + 1);
          str = str.substring(0, i);
        } else if (e < 0) {

          // Integer.
          e = str.length;
        }

      } else {

        // '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
        intCheck(b, 2, ALPHABET.length, 'Base');

        // Allow exponential notation to be used with base 10 argument, while
        // also rounding to DECIMAL_PLACES as with other bases.
        if (b == 10) {
          x = new BigNumber(v);
          return round(x, DECIMAL_PLACES + x.e + 1, ROUNDING_MODE);
        }

        str = String(v);

        if (isNum = typeof v == 'number') {

          // Avoid potential interpretation of Infinity and NaN as base 44+ values.
          if (v * 0 != 0) return parseNumeric(x, str, isNum, b);

          x.s = 1 / v < 0 ? (str = str.slice(1), -1) : 1;

          // '[BigNumber Error] Number primitive has more than 15 significant digits: {n}'
          if (BigNumber.DEBUG && str.replace(/^0\.0*|\./, '').length > 15) {
            throw Error
             (tooManyDigits + v);
          }
        } else {
          x.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
        }

        alphabet = ALPHABET.slice(0, b);
        e = i = 0;

        // Check that str is a valid base b number.
        // Don't use RegExp, so alphabet can contain special characters.
        for (len = str.length; i < len; i++) {
          if (alphabet.indexOf(c = str.charAt(i)) < 0) {
            if (c == '.') {

              // If '.' is not the first character and it has not be found before.
              if (i > e) {
                e = len;
                continue;
              }
            } else if (!caseChanged) {

              // Allow e.g. hexadecimal 'FF' as well as 'ff'.
              if (str == str.toUpperCase() && (str = str.toLowerCase()) ||
                  str == str.toLowerCase() && (str = str.toUpperCase())) {
                caseChanged = true;
                i = -1;
                e = 0;
                continue;
              }
            }

            return parseNumeric(x, String(v), isNum, b);
          }
        }

        // Prevent later check for length on converted number.
        isNum = false;
        str = convertBase(str, b, 10, x.s);

        // Decimal point?
        if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');
        else e = str.length;
      }

      // Determine leading zeros.
      for (i = 0; str.charCodeAt(i) === 48; i++);

      // Determine trailing zeros.
      for (len = str.length; str.charCodeAt(--len) === 48;);

      if (str = str.slice(i, ++len)) {
        len -= i;

        // '[BigNumber Error] Number primitive has more than 15 significant digits: {n}'
        if (isNum && BigNumber.DEBUG &&
          len > 15 && (v > MAX_SAFE_INTEGER || v !== mathfloor(v))) {
            throw Error
             (tooManyDigits + (x.s * v));
        }

         // Overflow?
        if ((e = e - i - 1) > MAX_EXP) {

          // Infinity.
          x.c = x.e = null;

        // Underflow?
        } else if (e < MIN_EXP) {

          // Zero.
          x.c = [x.e = 0];
        } else {
          x.e = e;
          x.c = [];

          // Transform base

          // e is the base 10 exponent.
          // i is where to slice str to get the first element of the coefficient array.
          i = (e + 1) % LOG_BASE;
          if (e < 0) i += LOG_BASE;  // i < 1

          if (i < len) {
            if (i) x.c.push(+str.slice(0, i));

            for (len -= LOG_BASE; i < len;) {
              x.c.push(+str.slice(i, i += LOG_BASE));
            }

            i = LOG_BASE - (str = str.slice(i)).length;
          } else {
            i -= len;
          }

          for (; i--; str += '0');
          x.c.push(+str);
        }
      } else {

        // Zero.
        x.c = [x.e = 0];
      }
    }


    // CONSTRUCTOR PROPERTIES


    BigNumber.clone = clone;

    BigNumber.ROUND_UP = 0;
    BigNumber.ROUND_DOWN = 1;
    BigNumber.ROUND_CEIL = 2;
    BigNumber.ROUND_FLOOR = 3;
    BigNumber.ROUND_HALF_UP = 4;
    BigNumber.ROUND_HALF_DOWN = 5;
    BigNumber.ROUND_HALF_EVEN = 6;
    BigNumber.ROUND_HALF_CEIL = 7;
    BigNumber.ROUND_HALF_FLOOR = 8;
    BigNumber.EUCLID = 9;


    /*
     * Configure infrequently-changing library-wide settings.
     *
     * Accept an object with the following optional properties (if the value of a property is
     * a number, it must be an integer within the inclusive range stated):
     *
     *   DECIMAL_PLACES   {number}           0 to MAX
     *   ROUNDING_MODE    {number}           0 to 8
     *   EXPONENTIAL_AT   {number|number[]}  -MAX to MAX  or  [-MAX to 0, 0 to MAX]
     *   RANGE            {number|number[]}  -MAX to MAX (not zero)  or  [-MAX to -1, 1 to MAX]
     *   CRYPTO           {boolean}          true or false
     *   MODULO_MODE      {number}           0 to 9
     *   POW_PRECISION       {number}           0 to MAX
     *   ALPHABET         {string}           A string of two or more unique characters which does
     *                                       not contain '.'.
     *   FORMAT           {object}           An object with some of the following properties:
     *     prefix                 {string}
     *     groupSize              {number}
     *     secondaryGroupSize     {number}
     *     groupSeparator         {string}
     *     decimalSeparator       {string}
     *     fractionGroupSize      {number}
     *     fractionGroupSeparator {string}
     *     suffix                 {string}
     *
     * (The values assigned to the above FORMAT object properties are not checked for validity.)
     *
     * E.g.
     * BigNumber.config({ DECIMAL_PLACES : 20, ROUNDING_MODE : 4 })
     *
     * Ignore properties/parameters set to null or undefined, except for ALPHABET.
     *
     * Return an object with the properties current values.
     */
    BigNumber.config = BigNumber.set = function (obj) {
      var p, v;

      if (obj != null) {

        if (typeof obj == 'object') {

          // DECIMAL_PLACES {number} Integer, 0 to MAX inclusive.
          // '[BigNumber Error] DECIMAL_PLACES {not a primitive number|not an integer|out of range}: {v}'
          if (obj.hasOwnProperty(p = 'DECIMAL_PLACES')) {
            v = obj[p];
            intCheck(v, 0, MAX, p);
            DECIMAL_PLACES = v;
          }

          // ROUNDING_MODE {number} Integer, 0 to 8 inclusive.
          // '[BigNumber Error] ROUNDING_MODE {not a primitive number|not an integer|out of range}: {v}'
          if (obj.hasOwnProperty(p = 'ROUNDING_MODE')) {
            v = obj[p];
            intCheck(v, 0, 8, p);
            ROUNDING_MODE = v;
          }

          // EXPONENTIAL_AT {number|number[]}
          // Integer, -MAX to MAX inclusive or
          // [integer -MAX to 0 inclusive, 0 to MAX inclusive].
          // '[BigNumber Error] EXPONENTIAL_AT {not a primitive number|not an integer|out of range}: {v}'
          if (obj.hasOwnProperty(p = 'EXPONENTIAL_AT')) {
            v = obj[p];
            if (v && v.pop) {
              intCheck(v[0], -MAX, 0, p);
              intCheck(v[1], 0, MAX, p);
              TO_EXP_NEG = v[0];
              TO_EXP_POS = v[1];
            } else {
              intCheck(v, -MAX, MAX, p);
              TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
            }
          }

          // RANGE {number|number[]} Non-zero integer, -MAX to MAX inclusive or
          // [integer -MAX to -1 inclusive, integer 1 to MAX inclusive].
          // '[BigNumber Error] RANGE {not a primitive number|not an integer|out of range|cannot be zero}: {v}'
          if (obj.hasOwnProperty(p = 'RANGE')) {
            v = obj[p];
            if (v && v.pop) {
              intCheck(v[0], -MAX, -1, p);
              intCheck(v[1], 1, MAX, p);
              MIN_EXP = v[0];
              MAX_EXP = v[1];
            } else {
              intCheck(v, -MAX, MAX, p);
              if (v) {
                MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
              } else {
                throw Error
                 (bignumberError + p + ' cannot be zero: ' + v);
              }
            }
          }

          // CRYPTO {boolean} true or false.
          // '[BigNumber Error] CRYPTO not true or false: {v}'
          // '[BigNumber Error] crypto unavailable'
          if (obj.hasOwnProperty(p = 'CRYPTO')) {
            v = obj[p];
            if (v === !!v) {
              if (v) {
                if (typeof crypto != 'undefined' && crypto &&
                 (crypto.getRandomValues || crypto.randomBytes)) {
                  CRYPTO = v;
                } else {
                  CRYPTO = !v;
                  throw Error
                   (bignumberError + 'crypto unavailable');
                }
              } else {
                CRYPTO = v;
              }
            } else {
              throw Error
               (bignumberError + p + ' not true or false: ' + v);
            }
          }

          // MODULO_MODE {number} Integer, 0 to 9 inclusive.
          // '[BigNumber Error] MODULO_MODE {not a primitive number|not an integer|out of range}: {v}'
          if (obj.hasOwnProperty(p = 'MODULO_MODE')) {
            v = obj[p];
            intCheck(v, 0, 9, p);
            MODULO_MODE = v;
          }

          // POW_PRECISION {number} Integer, 0 to MAX inclusive.
          // '[BigNumber Error] POW_PRECISION {not a primitive number|not an integer|out of range}: {v}'
          if (obj.hasOwnProperty(p = 'POW_PRECISION')) {
            v = obj[p];
            intCheck(v, 0, MAX, p);
            POW_PRECISION = v;
          }

          // FORMAT {object}
          // '[BigNumber Error] FORMAT not an object: {v}'
          if (obj.hasOwnProperty(p = 'FORMAT')) {
            v = obj[p];
            if (typeof v == 'object') FORMAT = v;
            else throw Error
             (bignumberError + p + ' not an object: ' + v);
          }

          // ALPHABET {string}
          // '[BigNumber Error] ALPHABET invalid: {v}'
          if (obj.hasOwnProperty(p = 'ALPHABET')) {
            v = obj[p];

            // Disallow if less than two characters,
            // or if it contains '+', '-', '.', whitespace, or a repeated character.
            if (typeof v == 'string' && !/^.?$|[+\-.\s]|(.).*\1/.test(v)) {
              ALPHABET = v;
            } else {
              throw Error
               (bignumberError + p + ' invalid: ' + v);
            }
          }

        } else {

          // '[BigNumber Error] Object expected: {v}'
          throw Error
           (bignumberError + 'Object expected: ' + obj);
        }
      }

      return {
        DECIMAL_PLACES: DECIMAL_PLACES,
        ROUNDING_MODE: ROUNDING_MODE,
        EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
        RANGE: [MIN_EXP, MAX_EXP],
        CRYPTO: CRYPTO,
        MODULO_MODE: MODULO_MODE,
        POW_PRECISION: POW_PRECISION,
        FORMAT: FORMAT,
        ALPHABET: ALPHABET
      };
    };


    /*
     * Return true if v is a BigNumber instance, otherwise return false.
     *
     * If BigNumber.DEBUG is true, throw if a BigNumber instance is not well-formed.
     *
     * v {any}
     *
     * '[BigNumber Error] Invalid BigNumber: {v}'
     */
    BigNumber.isBigNumber = function (v) {
      if (!v || v._isBigNumber !== true) return false;
      if (!BigNumber.DEBUG) return true;

      var i, n,
        c = v.c,
        e = v.e,
        s = v.s;

      out: if ({}.toString.call(c) == '[object Array]') {

        if ((s === 1 || s === -1) && e >= -MAX && e <= MAX && e === mathfloor(e)) {

          // If the first element is zero, the BigNumber value must be zero.
          if (c[0] === 0) {
            if (e === 0 && c.length === 1) return true;
            break out;
          }

          // Calculate number of digits that c[0] should have, based on the exponent.
          i = (e + 1) % LOG_BASE;
          if (i < 1) i += LOG_BASE;

          // Calculate number of digits of c[0].
          //if (Math.ceil(Math.log(c[0] + 1) / Math.LN10) == i) {
          if (String(c[0]).length == i) {

            for (i = 0; i < c.length; i++) {
              n = c[i];
              if (n < 0 || n >= BASE || n !== mathfloor(n)) break out;
            }

            // Last element cannot be zero, unless it is the only element.
            if (n !== 0) return true;
          }
        }

      // Infinity/NaN
      } else if (c === null && e === null && (s === null || s === 1 || s === -1)) {
        return true;
      }

      throw Error
        (bignumberError + 'Invalid BigNumber: ' + v);
    };


    /*
     * Return a new BigNumber whose value is the maximum of the arguments.
     *
     * arguments {number|string|BigNumber}
     */
    BigNumber.maximum = BigNumber.max = function () {
      return maxOrMin(arguments, P.lt);
    };


    /*
     * Return a new BigNumber whose value is the minimum of the arguments.
     *
     * arguments {number|string|BigNumber}
     */
    BigNumber.minimum = BigNumber.min = function () {
      return maxOrMin(arguments, P.gt);
    };


    /*
     * Return a new BigNumber with a random value equal to or greater than 0 and less than 1,
     * and with dp, or DECIMAL_PLACES if dp is omitted, decimal places (or less if trailing
     * zeros are produced).
     *
     * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp}'
     * '[BigNumber Error] crypto unavailable'
     */
    BigNumber.random = (function () {
      var pow2_53 = 0x20000000000000;

      // Return a 53 bit integer n, where 0 <= n < 9007199254740992.
      // Check if Math.random() produces more than 32 bits of randomness.
      // If it does, assume at least 53 bits are produced, otherwise assume at least 30 bits.
      // 0x40000000 is 2^30, 0x800000 is 2^23, 0x1fffff is 2^21 - 1.
      var random53bitInt = (Math.random() * pow2_53) & 0x1fffff
       ? function () { return mathfloor(Math.random() * pow2_53); }
       : function () { return ((Math.random() * 0x40000000 | 0) * 0x800000) +
         (Math.random() * 0x800000 | 0); };

      return function (dp) {
        var a, b, e, k, v,
          i = 0,
          c = [],
          rand = new BigNumber(ONE);

        if (dp == null) dp = DECIMAL_PLACES;
        else intCheck(dp, 0, MAX);

        k = mathceil(dp / LOG_BASE);

        if (CRYPTO) {

          // Browsers supporting crypto.getRandomValues.
          if (crypto.getRandomValues) {

            a = crypto.getRandomValues(new Uint32Array(k *= 2));

            for (; i < k;) {

              // 53 bits:
              // ((Math.pow(2, 32) - 1) * Math.pow(2, 21)).toString(2)
              // 11111 11111111 11111111 11111111 11100000 00000000 00000000
              // ((Math.pow(2, 32) - 1) >>> 11).toString(2)
              //                                     11111 11111111 11111111
              // 0x20000 is 2^21.
              v = a[i] * 0x20000 + (a[i + 1] >>> 11);

              // Rejection sampling:
              // 0 <= v < 9007199254740992
              // Probability that v >= 9e15, is
              // 7199254740992 / 9007199254740992 ~= 0.0008, i.e. 1 in 1251
              if (v >= 9e15) {
                b = crypto.getRandomValues(new Uint32Array(2));
                a[i] = b[0];
                a[i + 1] = b[1];
              } else {

                // 0 <= v <= 8999999999999999
                // 0 <= (v % 1e14) <= 99999999999999
                c.push(v % 1e14);
                i += 2;
              }
            }
            i = k / 2;

          // Node.js supporting crypto.randomBytes.
          } else if (crypto.randomBytes) {

            // buffer
            a = crypto.randomBytes(k *= 7);

            for (; i < k;) {

              // 0x1000000000000 is 2^48, 0x10000000000 is 2^40
              // 0x100000000 is 2^32, 0x1000000 is 2^24
              // 11111 11111111 11111111 11111111 11111111 11111111 11111111
              // 0 <= v < 9007199254740992
              v = ((a[i] & 31) * 0x1000000000000) + (a[i + 1] * 0x10000000000) +
                 (a[i + 2] * 0x100000000) + (a[i + 3] * 0x1000000) +
                 (a[i + 4] << 16) + (a[i + 5] << 8) + a[i + 6];

              if (v >= 9e15) {
                crypto.randomBytes(7).copy(a, i);
              } else {

                // 0 <= (v % 1e14) <= 99999999999999
                c.push(v % 1e14);
                i += 7;
              }
            }
            i = k / 7;
          } else {
            CRYPTO = false;
            throw Error
             (bignumberError + 'crypto unavailable');
          }
        }

        // Use Math.random.
        if (!CRYPTO) {

          for (; i < k;) {
            v = random53bitInt();
            if (v < 9e15) c[i++] = v % 1e14;
          }
        }

        k = c[--i];
        dp %= LOG_BASE;

        // Convert trailing digits to zeros according to dp.
        if (k && dp) {
          v = POWS_TEN[LOG_BASE - dp];
          c[i] = mathfloor(k / v) * v;
        }

        // Remove trailing elements which are zero.
        for (; c[i] === 0; c.pop(), i--);

        // Zero?
        if (i < 0) {
          c = [e = 0];
        } else {

          // Remove leading elements which are zero and adjust exponent accordingly.
          for (e = -1 ; c[0] === 0; c.splice(0, 1), e -= LOG_BASE);

          // Count the digits of the first element of c to determine leading zeros, and...
          for (i = 1, v = c[0]; v >= 10; v /= 10, i++);

          // adjust the exponent accordingly.
          if (i < LOG_BASE) e -= LOG_BASE - i;
        }

        rand.e = e;
        rand.c = c;
        return rand;
      };
    })();


    /*
     * Return a BigNumber whose value is the sum of the arguments.
     *
     * arguments {number|string|BigNumber}
     */
    BigNumber.sum = function () {
      var i = 1,
        args = arguments,
        sum = new BigNumber(args[0]);
      for (; i < args.length;) sum = sum.plus(args[i++]);
      return sum;
    };


    // PRIVATE FUNCTIONS


    // Called by BigNumber and BigNumber.prototype.toString.
    convertBase = (function () {
      var decimal = '0123456789';

      /*
       * Convert string of baseIn to an array of numbers of baseOut.
       * Eg. toBaseOut('255', 10, 16) returns [15, 15].
       * Eg. toBaseOut('ff', 16, 10) returns [2, 5, 5].
       */
      function toBaseOut(str, baseIn, baseOut, alphabet) {
        var j,
          arr = [0],
          arrL,
          i = 0,
          len = str.length;

        for (; i < len;) {
          for (arrL = arr.length; arrL--; arr[arrL] *= baseIn);

          arr[0] += alphabet.indexOf(str.charAt(i++));

          for (j = 0; j < arr.length; j++) {

            if (arr[j] > baseOut - 1) {
              if (arr[j + 1] == null) arr[j + 1] = 0;
              arr[j + 1] += arr[j] / baseOut | 0;
              arr[j] %= baseOut;
            }
          }
        }

        return arr.reverse();
      }

      // Convert a numeric string of baseIn to a numeric string of baseOut.
      // If the caller is toString, we are converting from base 10 to baseOut.
      // If the caller is BigNumber, we are converting from baseIn to base 10.
      return function (str, baseIn, baseOut, sign, callerIsToString) {
        var alphabet, d, e, k, r, x, xc, y,
          i = str.indexOf('.'),
          dp = DECIMAL_PLACES,
          rm = ROUNDING_MODE;

        // Non-integer.
        if (i >= 0) {
          k = POW_PRECISION;

          // Unlimited precision.
          POW_PRECISION = 0;
          str = str.replace('.', '');
          y = new BigNumber(baseIn);
          x = y.pow(str.length - i);
          POW_PRECISION = k;

          // Convert str as if an integer, then restore the fraction part by dividing the
          // result by its base raised to a power.

          y.c = toBaseOut(toFixedPoint(coeffToString(x.c), x.e, '0'),
           10, baseOut, decimal);
          y.e = y.c.length;
        }

        // Convert the number as integer.

        xc = toBaseOut(str, baseIn, baseOut, callerIsToString
         ? (alphabet = ALPHABET, decimal)
         : (alphabet = decimal, ALPHABET));

        // xc now represents str as an integer and converted to baseOut. e is the exponent.
        e = k = xc.length;

        // Remove trailing zeros.
        for (; xc[--k] == 0; xc.pop());

        // Zero?
        if (!xc[0]) return alphabet.charAt(0);

        // Does str represent an integer? If so, no need for the division.
        if (i < 0) {
          --e;
        } else {
          x.c = xc;
          x.e = e;

          // The sign is needed for correct rounding.
          x.s = sign;
          x = div(x, y, dp, rm, baseOut);
          xc = x.c;
          r = x.r;
          e = x.e;
        }

        // xc now represents str converted to baseOut.

        // THe index of the rounding digit.
        d = e + dp + 1;

        // The rounding digit: the digit to the right of the digit that may be rounded up.
        i = xc[d];

        // Look at the rounding digits and mode to determine whether to round up.

        k = baseOut / 2;
        r = r || d < 0 || xc[d + 1] != null;

        r = rm < 4 ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
              : i > k || i == k &&(rm == 4 || r || rm == 6 && xc[d - 1] & 1 ||
               rm == (x.s < 0 ? 8 : 7));

        // If the index of the rounding digit is not greater than zero, or xc represents
        // zero, then the result of the base conversion is zero or, if rounding up, a value
        // such as 0.00001.
        if (d < 1 || !xc[0]) {

          // 1^-dp or 0
          str = r ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
        } else {

          // Truncate xc to the required number of decimal places.
          xc.length = d;

          // Round up?
          if (r) {

            // Rounding up may mean the previous digit has to be rounded up and so on.
            for (--baseOut; ++xc[--d] > baseOut;) {
              xc[d] = 0;

              if (!d) {
                ++e;
                xc = [1].concat(xc);
              }
            }
          }

          // Determine trailing zeros.
          for (k = xc.length; !xc[--k];);

          // E.g. [4, 11, 15] becomes 4bf.
          for (i = 0, str = ''; i <= k; str += alphabet.charAt(xc[i++]));

          // Add leading zeros, decimal point and trailing zeros as required.
          str = toFixedPoint(str, e, alphabet.charAt(0));
        }

        // The caller will add the sign.
        return str;
      };
    })();


    // Perform division in the specified base. Called by div and convertBase.
    div = (function () {

      // Assume non-zero x and k.
      function multiply(x, k, base) {
        var m, temp, xlo, xhi,
          carry = 0,
          i = x.length,
          klo = k % SQRT_BASE,
          khi = k / SQRT_BASE | 0;

        for (x = x.slice(); i--;) {
          xlo = x[i] % SQRT_BASE;
          xhi = x[i] / SQRT_BASE | 0;
          m = khi * xlo + xhi * klo;
          temp = klo * xlo + ((m % SQRT_BASE) * SQRT_BASE) + carry;
          carry = (temp / base | 0) + (m / SQRT_BASE | 0) + khi * xhi;
          x[i] = temp % base;
        }

        if (carry) x = [carry].concat(x);

        return x;
      }

      function compare(a, b, aL, bL) {
        var i, cmp;

        if (aL != bL) {
          cmp = aL > bL ? 1 : -1;
        } else {

          for (i = cmp = 0; i < aL; i++) {

            if (a[i] != b[i]) {
              cmp = a[i] > b[i] ? 1 : -1;
              break;
            }
          }
        }

        return cmp;
      }

      function subtract(a, b, aL, base) {
        var i = 0;

        // Subtract b from a.
        for (; aL--;) {
          a[aL] -= i;
          i = a[aL] < b[aL] ? 1 : 0;
          a[aL] = i * base + a[aL] - b[aL];
        }

        // Remove leading zeros.
        for (; !a[0] && a.length > 1; a.splice(0, 1));
      }

      // x: dividend, y: divisor.
      return function (x, y, dp, rm, base) {
        var cmp, e, i, more, n, prod, prodL, q, qc, rem, remL, rem0, xi, xL, yc0,
          yL, yz,
          s = x.s == y.s ? 1 : -1,
          xc = x.c,
          yc = y.c;

        // Either NaN, Infinity or 0?
        if (!xc || !xc[0] || !yc || !yc[0]) {

          return new BigNumber(

           // Return NaN if either NaN, or both Infinity or 0.
           !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN :

            // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
            xc && xc[0] == 0 || !yc ? s * 0 : s / 0
         );
        }

        q = new BigNumber(s);
        qc = q.c = [];
        e = x.e - y.e;
        s = dp + e + 1;

        if (!base) {
          base = BASE;
          e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
          s = s / LOG_BASE | 0;
        }

        // Result exponent may be one less then the current value of e.
        // The coefficients of the BigNumbers from convertBase may have trailing zeros.
        for (i = 0; yc[i] == (xc[i] || 0); i++);

        if (yc[i] > (xc[i] || 0)) e--;

        if (s < 0) {
          qc.push(1);
          more = true;
        } else {
          xL = xc.length;
          yL = yc.length;
          i = 0;
          s += 2;

          // Normalise xc and yc so highest order digit of yc is >= base / 2.

          n = mathfloor(base / (yc[0] + 1));

          // Not necessary, but to handle odd bases where yc[0] == (base / 2) - 1.
          // if (n > 1 || n++ == 1 && yc[0] < base / 2) {
          if (n > 1) {
            yc = multiply(yc, n, base);
            xc = multiply(xc, n, base);
            yL = yc.length;
            xL = xc.length;
          }

          xi = yL;
          rem = xc.slice(0, yL);
          remL = rem.length;

          // Add zeros to make remainder as long as divisor.
          for (; remL < yL; rem[remL++] = 0);
          yz = yc.slice();
          yz = [0].concat(yz);
          yc0 = yc[0];
          if (yc[1] >= base / 2) yc0++;
          // Not necessary, but to prevent trial digit n > base, when using base 3.
          // else if (base == 3 && yc0 == 1) yc0 = 1 + 1e-15;

          do {
            n = 0;

            // Compare divisor and remainder.
            cmp = compare(yc, rem, yL, remL);

            // If divisor < remainder.
            if (cmp < 0) {

              // Calculate trial digit, n.

              rem0 = rem[0];
              if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);

              // n is how many times the divisor goes into the current remainder.
              n = mathfloor(rem0 / yc0);

              //  Algorithm:
              //  product = divisor multiplied by trial digit (n).
              //  Compare product and remainder.
              //  If product is greater than remainder:
              //    Subtract divisor from product, decrement trial digit.
              //  Subtract product from remainder.
              //  If product was less than remainder at the last compare:
              //    Compare new remainder and divisor.
              //    If remainder is greater than divisor:
              //      Subtract divisor from remainder, increment trial digit.

              if (n > 1) {

                // n may be > base only when base is 3.
                if (n >= base) n = base - 1;

                // product = divisor * trial digit.
                prod = multiply(yc, n, base);
                prodL = prod.length;
                remL = rem.length;

                // Compare product and remainder.
                // If product > remainder then trial digit n too high.
                // n is 1 too high about 5% of the time, and is not known to have
                // ever been more than 1 too high.
                while (compare(prod, rem, prodL, remL) == 1) {
                  n--;

                  // Subtract divisor from product.
                  subtract(prod, yL < prodL ? yz : yc, prodL, base);
                  prodL = prod.length;
                  cmp = 1;
                }
              } else {

                // n is 0 or 1, cmp is -1.
                // If n is 0, there is no need to compare yc and rem again below,
                // so change cmp to 1 to avoid it.
                // If n is 1, leave cmp as -1, so yc and rem are compared again.
                if (n == 0) {

                  // divisor < remainder, so n must be at least 1.
                  cmp = n = 1;
                }

                // product = divisor
                prod = yc.slice();
                prodL = prod.length;
              }

              if (prodL < remL) prod = [0].concat(prod);

              // Subtract product from remainder.
              subtract(rem, prod, remL, base);
              remL = rem.length;

               // If product was < remainder.
              if (cmp == -1) {

                // Compare divisor and new remainder.
                // If divisor < new remainder, subtract divisor from remainder.
                // Trial digit n too low.
                // n is 1 too low about 5% of the time, and very rarely 2 too low.
                while (compare(yc, rem, yL, remL) < 1) {
                  n++;

                  // Subtract divisor from remainder.
                  subtract(rem, yL < remL ? yz : yc, remL, base);
                  remL = rem.length;
                }
              }
            } else if (cmp === 0) {
              n++;
              rem = [0];
            } // else cmp === 1 and n will be 0

            // Add the next digit, n, to the result array.
            qc[i++] = n;

            // Update the remainder.
            if (rem[0]) {
              rem[remL++] = xc[xi] || 0;
            } else {
              rem = [xc[xi]];
              remL = 1;
            }
          } while ((xi++ < xL || rem[0] != null) && s--);

          more = rem[0] != null;

          // Leading zero?
          if (!qc[0]) qc.splice(0, 1);
        }

        if (base == BASE) {

          // To calculate q.e, first get the number of digits of qc[0].
          for (i = 1, s = qc[0]; s >= 10; s /= 10, i++);

          round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);

        // Caller is convertBase.
        } else {
          q.e = e;
          q.r = +more;
        }

        return q;
      };
    })();


    /*
     * Return a string representing the value of BigNumber n in fixed-point or exponential
     * notation rounded to the specified decimal places or significant digits.
     *
     * n: a BigNumber.
     * i: the index of the last digit required (i.e. the digit that may be rounded up).
     * rm: the rounding mode.
     * id: 1 (toExponential) or 2 (toPrecision).
     */
    function format(n, i, rm, id) {
      var c0, e, ne, len, str;

      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);

      if (!n.c) return n.toString();

      c0 = n.c[0];
      ne = n.e;

      if (i == null) {
        str = coeffToString(n.c);
        str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS)
         ? toExponential(str, ne)
         : toFixedPoint(str, ne, '0');
      } else {
        n = round(new BigNumber(n), i, rm);

        // n.e may have changed if the value was rounded up.
        e = n.e;

        str = coeffToString(n.c);
        len = str.length;

        // toPrecision returns exponential notation if the number of significant digits
        // specified is less than the number of digits necessary to represent the integer
        // part of the value in fixed-point notation.

        // Exponential notation.
        if (id == 1 || id == 2 && (i <= e || e <= TO_EXP_NEG)) {

          // Append zeros?
          for (; len < i; str += '0', len++);
          str = toExponential(str, e);

        // Fixed-point notation.
        } else {
          i -= ne;
          str = toFixedPoint(str, e, '0');

          // Append zeros?
          if (e + 1 > len) {
            if (--i > 0) for (str += '.'; i--; str += '0');
          } else {
            i += e - len;
            if (i > 0) {
              if (e + 1 == len) str += '.';
              for (; i--; str += '0');
            }
          }
        }
      }

      return n.s < 0 && c0 ? '-' + str : str;
    }


    // Handle BigNumber.max and BigNumber.min.
    function maxOrMin(args, method) {
      var n,
        i = 1,
        m = new BigNumber(args[0]);

      for (; i < args.length; i++) {
        n = new BigNumber(args[i]);

        // If any number is NaN, return NaN.
        if (!n.s) {
          m = n;
          break;
        } else if (method.call(m, n)) {
          m = n;
        }
      }

      return m;
    }


    /*
     * Strip trailing zeros, calculate base 10 exponent and check against MIN_EXP and MAX_EXP.
     * Called by minus, plus and times.
     */
    function normalise(n, c, e) {
      var i = 1,
        j = c.length;

       // Remove trailing zeros.
      for (; !c[--j]; c.pop());

      // Calculate the base 10 exponent. First get the number of digits of c[0].
      for (j = c[0]; j >= 10; j /= 10, i++);

      // Overflow?
      if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {

        // Infinity.
        n.c = n.e = null;

      // Underflow?
      } else if (e < MIN_EXP) {

        // Zero.
        n.c = [n.e = 0];
      } else {
        n.e = e;
        n.c = c;
      }

      return n;
    }


    // Handle values that fail the validity test in BigNumber.
    parseNumeric = (function () {
      var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i,
        dotAfter = /^([^.]+)\.$/,
        dotBefore = /^\.([^.]+)$/,
        isInfinityOrNaN = /^-?(Infinity|NaN)$/,
        whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;

      return function (x, str, isNum, b) {
        var base,
          s = isNum ? str : str.replace(whitespaceOrPlus, '');

        // No exception on ±Infinity or NaN.
        if (isInfinityOrNaN.test(s)) {
          x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
        } else {
          if (!isNum) {

            // basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i
            s = s.replace(basePrefix, function (m, p1, p2) {
              base = (p2 = p2.toLowerCase()) == 'x' ? 16 : p2 == 'b' ? 2 : 8;
              return !b || b == base ? p1 : m;
            });

            if (b) {
              base = b;

              // E.g. '1.' to '1', '.1' to '0.1'
              s = s.replace(dotAfter, '$1').replace(dotBefore, '0.$1');
            }

            if (str != s) return new BigNumber(s, base);
          }

          // '[BigNumber Error] Not a number: {n}'
          // '[BigNumber Error] Not a base {b} number: {n}'
          if (BigNumber.DEBUG) {
            throw Error
              (bignumberError + 'Not a' + (b ? ' base ' + b : '') + ' number: ' + str);
          }

          // NaN
          x.s = null;
        }

        x.c = x.e = null;
      }
    })();


    /*
     * Round x to sd significant digits using rounding mode rm. Check for over/under-flow.
     * If r is truthy, it is known that there are more digits after the rounding digit.
     */
    function round(x, sd, rm, r) {
      var d, i, j, k, n, ni, rd,
        xc = x.c,
        pows10 = POWS_TEN;

      // if x is not Infinity or NaN...
      if (xc) {

        // rd is the rounding digit, i.e. the digit after the digit that may be rounded up.
        // n is a base 1e14 number, the value of the element of array x.c containing rd.
        // ni is the index of n within x.c.
        // d is the number of digits of n.
        // i is the index of rd within n including leading zeros.
        // j is the actual index of rd within n (if < 0, rd is a leading zero).
        out: {

          // Get the number of digits of the first element of xc.
          for (d = 1, k = xc[0]; k >= 10; k /= 10, d++);
          i = sd - d;

          // If the rounding digit is in the first element of xc...
          if (i < 0) {
            i += LOG_BASE;
            j = sd;
            n = xc[ni = 0];

            // Get the rounding digit at index j of n.
            rd = n / pows10[d - j - 1] % 10 | 0;
          } else {
            ni = mathceil((i + 1) / LOG_BASE);

            if (ni >= xc.length) {

              if (r) {

                // Needed by sqrt.
                for (; xc.length <= ni; xc.push(0));
                n = rd = 0;
                d = 1;
                i %= LOG_BASE;
                j = i - LOG_BASE + 1;
              } else {
                break out;
              }
            } else {
              n = k = xc[ni];

              // Get the number of digits of n.
              for (d = 1; k >= 10; k /= 10, d++);

              // Get the index of rd within n.
              i %= LOG_BASE;

              // Get the index of rd within n, adjusted for leading zeros.
              // The number of leading zeros of n is given by LOG_BASE - d.
              j = i - LOG_BASE + d;

              // Get the rounding digit at index j of n.
              rd = j < 0 ? 0 : n / pows10[d - j - 1] % 10 | 0;
            }
          }

          r = r || sd < 0 ||

          // Are there any non-zero digits after the rounding digit?
          // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
          // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
           xc[ni + 1] != null || (j < 0 ? n : n % pows10[d - j - 1]);

          r = rm < 4
           ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
           : rd > 5 || rd == 5 && (rm == 4 || r || rm == 6 &&

            // Check whether the digit to the left of the rounding digit is odd.
            ((i > 0 ? j > 0 ? n / pows10[d - j] : 0 : xc[ni - 1]) % 10) & 1 ||
             rm == (x.s < 0 ? 8 : 7));

          if (sd < 1 || !xc[0]) {
            xc.length = 0;

            if (r) {

              // Convert sd to decimal places.
              sd -= x.e + 1;

              // 1, 0.1, 0.01, 0.001, 0.0001 etc.
              xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
              x.e = -sd || 0;
            } else {

              // Zero.
              xc[0] = x.e = 0;
            }

            return x;
          }

          // Remove excess digits.
          if (i == 0) {
            xc.length = ni;
            k = 1;
            ni--;
          } else {
            xc.length = ni + 1;
            k = pows10[LOG_BASE - i];

            // E.g. 56700 becomes 56000 if 7 is the rounding digit.
            // j > 0 means i > number of leading zeros of n.
            xc[ni] = j > 0 ? mathfloor(n / pows10[d - j] % pows10[j]) * k : 0;
          }

          // Round up?
          if (r) {

            for (; ;) {

              // If the digit to be rounded up is in the first element of xc...
              if (ni == 0) {

                // i will be the length of xc[0] before k is added.
                for (i = 1, j = xc[0]; j >= 10; j /= 10, i++);
                j = xc[0] += k;
                for (k = 1; j >= 10; j /= 10, k++);

                // if i != k the length has increased.
                if (i != k) {
                  x.e++;
                  if (xc[0] == BASE) xc[0] = 1;
                }

                break;
              } else {
                xc[ni] += k;
                if (xc[ni] != BASE) break;
                xc[ni--] = 0;
                k = 1;
              }
            }
          }

          // Remove trailing zeros.
          for (i = xc.length; xc[--i] === 0; xc.pop());
        }

        // Overflow? Infinity.
        if (x.e > MAX_EXP) {
          x.c = x.e = null;

        // Underflow? Zero.
        } else if (x.e < MIN_EXP) {
          x.c = [x.e = 0];
        }
      }

      return x;
    }


    function valueOf(n) {
      var str,
        e = n.e;

      if (e === null) return n.toString();

      str = coeffToString(n.c);

      str = e <= TO_EXP_NEG || e >= TO_EXP_POS
        ? toExponential(str, e)
        : toFixedPoint(str, e, '0');

      return n.s < 0 ? '-' + str : str;
    }


    // PROTOTYPE/INSTANCE METHODS


    /*
     * Return a new BigNumber whose value is the absolute value of this BigNumber.
     */
    P.absoluteValue = P.abs = function () {
      var x = new BigNumber(this);
      if (x.s < 0) x.s = 1;
      return x;
    };


    /*
     * Return
     *   1 if the value of this BigNumber is greater than the value of BigNumber(y, b),
     *   -1 if the value of this BigNumber is less than the value of BigNumber(y, b),
     *   0 if they have the same value,
     *   or null if the value of either is NaN.
     */
    P.comparedTo = function (y, b) {
      return compare(this, new BigNumber(y, b));
    };


    /*
     * If dp is undefined or null or true or false, return the number of decimal places of the
     * value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
     *
     * Otherwise, if dp is a number, return a new BigNumber whose value is the value of this
     * BigNumber rounded to a maximum of dp decimal places using rounding mode rm, or
     * ROUNDING_MODE if rm is omitted.
     *
     * [dp] {number} Decimal places: integer, 0 to MAX inclusive.
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
     */
    P.decimalPlaces = P.dp = function (dp, rm) {
      var c, n, v,
        x = this;

      if (dp != null) {
        intCheck(dp, 0, MAX);
        if (rm == null) rm = ROUNDING_MODE;
        else intCheck(rm, 0, 8);

        return round(new BigNumber(x), dp + x.e + 1, rm);
      }

      if (!(c = x.c)) return null;
      n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;

      // Subtract the number of trailing zeros of the last number.
      if (v = c[v]) for (; v % 10 == 0; v /= 10, n--);
      if (n < 0) n = 0;

      return n;
    };


    /*
     *  n / 0 = I
     *  n / N = N
     *  n / I = 0
     *  0 / n = 0
     *  0 / 0 = N
     *  0 / N = N
     *  0 / I = 0
     *  N / n = N
     *  N / 0 = N
     *  N / N = N
     *  N / I = N
     *  I / n = I
     *  I / 0 = I
     *  I / N = N
     *  I / I = N
     *
     * Return a new BigNumber whose value is the value of this BigNumber divided by the value of
     * BigNumber(y, b), rounded according to DECIMAL_PLACES and ROUNDING_MODE.
     */
    P.dividedBy = P.div = function (y, b) {
      return div(this, new BigNumber(y, b), DECIMAL_PLACES, ROUNDING_MODE);
    };


    /*
     * Return a new BigNumber whose value is the integer part of dividing the value of this
     * BigNumber by the value of BigNumber(y, b).
     */
    P.dividedToIntegerBy = P.idiv = function (y, b) {
      return div(this, new BigNumber(y, b), 0, 1);
    };


    /*
     * Return a BigNumber whose value is the value of this BigNumber exponentiated by n.
     *
     * If m is present, return the result modulo m.
     * If n is negative round according to DECIMAL_PLACES and ROUNDING_MODE.
     * If POW_PRECISION is non-zero and m is not present, round to POW_PRECISION using ROUNDING_MODE.
     *
     * The modular power operation works efficiently when x, n, and m are integers, otherwise it
     * is equivalent to calculating x.exponentiatedBy(n).modulo(m) with a POW_PRECISION of 0.
     *
     * n {number|string|BigNumber} The exponent. An integer.
     * [m] {number|string|BigNumber} The modulus.
     *
     * '[BigNumber Error] Exponent not an integer: {n}'
     */
    P.exponentiatedBy = P.pow = function (n, m) {
      var half, isModExp, i, k, more, nIsBig, nIsNeg, nIsOdd, y,
        x = this;

      n = new BigNumber(n);

      // Allow NaN and ±Infinity, but not other non-integers.
      if (n.c && !n.isInteger()) {
        throw Error
          (bignumberError + 'Exponent not an integer: ' + valueOf(n));
      }

      if (m != null) m = new BigNumber(m);

      // Exponent of MAX_SAFE_INTEGER is 15.
      nIsBig = n.e > 14;

      // If x is NaN, ±Infinity, ±0 or ±1, or n is ±Infinity, NaN or ±0.
      if (!x.c || !x.c[0] || x.c[0] == 1 && !x.e && x.c.length == 1 || !n.c || !n.c[0]) {

        // The sign of the result of pow when x is negative depends on the evenness of n.
        // If +n overflows to ±Infinity, the evenness of n would be not be known.
        y = new BigNumber(Math.pow(+valueOf(x), nIsBig ? 2 - isOdd(n) : +valueOf(n)));
        return m ? y.mod(m) : y;
      }

      nIsNeg = n.s < 0;

      if (m) {

        // x % m returns NaN if abs(m) is zero, or m is NaN.
        if (m.c ? !m.c[0] : !m.s) return new BigNumber(NaN);

        isModExp = !nIsNeg && x.isInteger() && m.isInteger();

        if (isModExp) x = x.mod(m);

      // Overflow to ±Infinity: >=2**1e10 or >=1.0000024**1e15.
      // Underflow to ±0: <=0.79**1e10 or <=0.9999975**1e15.
      } else if (n.e > 9 && (x.e > 0 || x.e < -1 || (x.e == 0
        // [1, 240000000]
        ? x.c[0] > 1 || nIsBig && x.c[1] >= 24e7
        // [80000000000000]  [99999750000000]
        : x.c[0] < 8e13 || nIsBig && x.c[0] <= 9999975e7))) {

        // If x is negative and n is odd, k = -0, else k = 0.
        k = x.s < 0 && isOdd(n) ? -0 : 0;

        // If x >= 1, k = ±Infinity.
        if (x.e > -1) k = 1 / k;

        // If n is negative return ±0, else return ±Infinity.
        return new BigNumber(nIsNeg ? 1 / k : k);

      } else if (POW_PRECISION) {

        // Truncating each coefficient array to a length of k after each multiplication
        // equates to truncating significant digits to POW_PRECISION + [28, 41],
        // i.e. there will be a minimum of 28 guard digits retained.
        k = mathceil(POW_PRECISION / LOG_BASE + 2);
      }

      if (nIsBig) {
        half = new BigNumber(0.5);
        if (nIsNeg) n.s = 1;
        nIsOdd = isOdd(n);
      } else {
        i = Math.abs(+valueOf(n));
        nIsOdd = i % 2;
      }

      y = new BigNumber(ONE);

      // Performs 54 loop iterations for n of 9007199254740991.
      for (; ;) {

        if (nIsOdd) {
          y = y.times(x);
          if (!y.c) break;

          if (k) {
            if (y.c.length > k) y.c.length = k;
          } else if (isModExp) {
            y = y.mod(m);    //y = y.minus(div(y, m, 0, MODULO_MODE).times(m));
          }
        }

        if (i) {
          i = mathfloor(i / 2);
          if (i === 0) break;
          nIsOdd = i % 2;
        } else {
          n = n.times(half);
          round(n, n.e + 1, 1);

          if (n.e > 14) {
            nIsOdd = isOdd(n);
          } else {
            i = +valueOf(n);
            if (i === 0) break;
            nIsOdd = i % 2;
          }
        }

        x = x.times(x);

        if (k) {
          if (x.c && x.c.length > k) x.c.length = k;
        } else if (isModExp) {
          x = x.mod(m);    //x = x.minus(div(x, m, 0, MODULO_MODE).times(m));
        }
      }

      if (isModExp) return y;
      if (nIsNeg) y = ONE.div(y);

      return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
    };


    /*
     * Return a new BigNumber whose value is the value of this BigNumber rounded to an integer
     * using rounding mode rm, or ROUNDING_MODE if rm is omitted.
     *
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {rm}'
     */
    P.integerValue = function (rm) {
      var n = new BigNumber(this);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);
      return round(n, n.e + 1, rm);
    };


    /*
     * Return true if the value of this BigNumber is equal to the value of BigNumber(y, b),
     * otherwise return false.
     */
    P.isEqualTo = P.eq = function (y, b) {
      return compare(this, new BigNumber(y, b)) === 0;
    };


    /*
     * Return true if the value of this BigNumber is a finite number, otherwise return false.
     */
    P.isFinite = function () {
      return !!this.c;
    };


    /*
     * Return true if the value of this BigNumber is greater than the value of BigNumber(y, b),
     * otherwise return false.
     */
    P.isGreaterThan = P.gt = function (y, b) {
      return compare(this, new BigNumber(y, b)) > 0;
    };


    /*
     * Return true if the value of this BigNumber is greater than or equal to the value of
     * BigNumber(y, b), otherwise return false.
     */
    P.isGreaterThanOrEqualTo = P.gte = function (y, b) {
      return (b = compare(this, new BigNumber(y, b))) === 1 || b === 0;

    };


    /*
     * Return true if the value of this BigNumber is an integer, otherwise return false.
     */
    P.isInteger = function () {
      return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
    };


    /*
     * Return true if the value of this BigNumber is less than the value of BigNumber(y, b),
     * otherwise return false.
     */
    P.isLessThan = P.lt = function (y, b) {
      return compare(this, new BigNumber(y, b)) < 0;
    };


    /*
     * Return true if the value of this BigNumber is less than or equal to the value of
     * BigNumber(y, b), otherwise return false.
     */
    P.isLessThanOrEqualTo = P.lte = function (y, b) {
      return (b = compare(this, new BigNumber(y, b))) === -1 || b === 0;
    };


    /*
     * Return true if the value of this BigNumber is NaN, otherwise return false.
     */
    P.isNaN = function () {
      return !this.s;
    };


    /*
     * Return true if the value of this BigNumber is negative, otherwise return false.
     */
    P.isNegative = function () {
      return this.s < 0;
    };


    /*
     * Return true if the value of this BigNumber is positive, otherwise return false.
     */
    P.isPositive = function () {
      return this.s > 0;
    };


    /*
     * Return true if the value of this BigNumber is 0 or -0, otherwise return false.
     */
    P.isZero = function () {
      return !!this.c && this.c[0] == 0;
    };


    /*
     *  n - 0 = n
     *  n - N = N
     *  n - I = -I
     *  0 - n = -n
     *  0 - 0 = 0
     *  0 - N = N
     *  0 - I = -I
     *  N - n = N
     *  N - 0 = N
     *  N - N = N
     *  N - I = N
     *  I - n = I
     *  I - 0 = I
     *  I - N = N
     *  I - I = N
     *
     * Return a new BigNumber whose value is the value of this BigNumber minus the value of
     * BigNumber(y, b).
     */
    P.minus = function (y, b) {
      var i, j, t, xLTy,
        x = this,
        a = x.s;

      y = new BigNumber(y, b);
      b = y.s;

      // Either NaN?
      if (!a || !b) return new BigNumber(NaN);

      // Signs differ?
      if (a != b) {
        y.s = -b;
        return x.plus(y);
      }

      var xe = x.e / LOG_BASE,
        ye = y.e / LOG_BASE,
        xc = x.c,
        yc = y.c;

      if (!xe || !ye) {

        // Either Infinity?
        if (!xc || !yc) return xc ? (y.s = -b, y) : new BigNumber(yc ? x : NaN);

        // Either zero?
        if (!xc[0] || !yc[0]) {

          // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
          return yc[0] ? (y.s = -b, y) : new BigNumber(xc[0] ? x :

           // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
           ROUNDING_MODE == 3 ? -0 : 0);
        }
      }

      xe = bitFloor(xe);
      ye = bitFloor(ye);
      xc = xc.slice();

      // Determine which is the bigger number.
      if (a = xe - ye) {

        if (xLTy = a < 0) {
          a = -a;
          t = xc;
        } else {
          ye = xe;
          t = yc;
        }

        t.reverse();

        // Prepend zeros to equalise exponents.
        for (b = a; b--; t.push(0));
        t.reverse();
      } else {

        // Exponents equal. Check digit by digit.
        j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;

        for (a = b = 0; b < j; b++) {

          if (xc[b] != yc[b]) {
            xLTy = xc[b] < yc[b];
            break;
          }
        }
      }

      // x < y? Point xc to the array of the bigger number.
      if (xLTy) t = xc, xc = yc, yc = t, y.s = -y.s;

      b = (j = yc.length) - (i = xc.length);

      // Append zeros to xc if shorter.
      // No need to add zeros to yc if shorter as subtract only needs to start at yc.length.
      if (b > 0) for (; b--; xc[i++] = 0);
      b = BASE - 1;

      // Subtract yc from xc.
      for (; j > a;) {

        if (xc[--j] < yc[j]) {
          for (i = j; i && !xc[--i]; xc[i] = b);
          --xc[i];
          xc[j] += BASE;
        }

        xc[j] -= yc[j];
      }

      // Remove leading zeros and adjust exponent accordingly.
      for (; xc[0] == 0; xc.splice(0, 1), --ye);

      // Zero?
      if (!xc[0]) {

        // Following IEEE 754 (2008) 6.3,
        // n - n = +0  but  n - n = -0  when rounding towards -Infinity.
        y.s = ROUNDING_MODE == 3 ? -1 : 1;
        y.c = [y.e = 0];
        return y;
      }

      // No need to check for Infinity as +x - +y != Infinity && -x - -y != Infinity
      // for finite x and y.
      return normalise(y, xc, ye);
    };


    /*
     *   n % 0 =  N
     *   n % N =  N
     *   n % I =  n
     *   0 % n =  0
     *  -0 % n = -0
     *   0 % 0 =  N
     *   0 % N =  N
     *   0 % I =  0
     *   N % n =  N
     *   N % 0 =  N
     *   N % N =  N
     *   N % I =  N
     *   I % n =  N
     *   I % 0 =  N
     *   I % N =  N
     *   I % I =  N
     *
     * Return a new BigNumber whose value is the value of this BigNumber modulo the value of
     * BigNumber(y, b). The result depends on the value of MODULO_MODE.
     */
    P.modulo = P.mod = function (y, b) {
      var q, s,
        x = this;

      y = new BigNumber(y, b);

      // Return NaN if x is Infinity or NaN, or y is NaN or zero.
      if (!x.c || !y.s || y.c && !y.c[0]) {
        return new BigNumber(NaN);

      // Return x if y is Infinity or x is zero.
      } else if (!y.c || x.c && !x.c[0]) {
        return new BigNumber(x);
      }

      if (MODULO_MODE == 9) {

        // Euclidian division: q = sign(y) * floor(x / abs(y))
        // r = x - qy    where  0 <= r < abs(y)
        s = y.s;
        y.s = 1;
        q = div(x, y, 0, 3);
        y.s = s;
        q.s *= s;
      } else {
        q = div(x, y, 0, MODULO_MODE);
      }

      y = x.minus(q.times(y));

      // To match JavaScript %, ensure sign of zero is sign of dividend.
      if (!y.c[0] && MODULO_MODE == 1) y.s = x.s;

      return y;
    };


    /*
     *  n * 0 = 0
     *  n * N = N
     *  n * I = I
     *  0 * n = 0
     *  0 * 0 = 0
     *  0 * N = N
     *  0 * I = N
     *  N * n = N
     *  N * 0 = N
     *  N * N = N
     *  N * I = N
     *  I * n = I
     *  I * 0 = N
     *  I * N = N
     *  I * I = I
     *
     * Return a new BigNumber whose value is the value of this BigNumber multiplied by the value
     * of BigNumber(y, b).
     */
    P.multipliedBy = P.times = function (y, b) {
      var c, e, i, j, k, m, xcL, xlo, xhi, ycL, ylo, yhi, zc,
        base, sqrtBase,
        x = this,
        xc = x.c,
        yc = (y = new BigNumber(y, b)).c;

      // Either NaN, ±Infinity or ±0?
      if (!xc || !yc || !xc[0] || !yc[0]) {

        // Return NaN if either is NaN, or one is 0 and the other is Infinity.
        if (!x.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
          y.c = y.e = y.s = null;
        } else {
          y.s *= x.s;

          // Return ±Infinity if either is ±Infinity.
          if (!xc || !yc) {
            y.c = y.e = null;

          // Return ±0 if either is ±0.
          } else {
            y.c = [0];
            y.e = 0;
          }
        }

        return y;
      }

      e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
      y.s *= x.s;
      xcL = xc.length;
      ycL = yc.length;

      // Ensure xc points to longer array and xcL to its length.
      if (xcL < ycL) zc = xc, xc = yc, yc = zc, i = xcL, xcL = ycL, ycL = i;

      // Initialise the result array with zeros.
      for (i = xcL + ycL, zc = []; i--; zc.push(0));

      base = BASE;
      sqrtBase = SQRT_BASE;

      for (i = ycL; --i >= 0;) {
        c = 0;
        ylo = yc[i] % sqrtBase;
        yhi = yc[i] / sqrtBase | 0;

        for (k = xcL, j = i + k; j > i;) {
          xlo = xc[--k] % sqrtBase;
          xhi = xc[k] / sqrtBase | 0;
          m = yhi * xlo + xhi * ylo;
          xlo = ylo * xlo + ((m % sqrtBase) * sqrtBase) + zc[j] + c;
          c = (xlo / base | 0) + (m / sqrtBase | 0) + yhi * xhi;
          zc[j--] = xlo % base;
        }

        zc[j] = c;
      }

      if (c) {
        ++e;
      } else {
        zc.splice(0, 1);
      }

      return normalise(y, zc, e);
    };


    /*
     * Return a new BigNumber whose value is the value of this BigNumber negated,
     * i.e. multiplied by -1.
     */
    P.negated = function () {
      var x = new BigNumber(this);
      x.s = -x.s || null;
      return x;
    };


    /*
     *  n + 0 = n
     *  n + N = N
     *  n + I = I
     *  0 + n = n
     *  0 + 0 = 0
     *  0 + N = N
     *  0 + I = I
     *  N + n = N
     *  N + 0 = N
     *  N + N = N
     *  N + I = N
     *  I + n = I
     *  I + 0 = I
     *  I + N = N
     *  I + I = I
     *
     * Return a new BigNumber whose value is the value of this BigNumber plus the value of
     * BigNumber(y, b).
     */
    P.plus = function (y, b) {
      var t,
        x = this,
        a = x.s;

      y = new BigNumber(y, b);
      b = y.s;

      // Either NaN?
      if (!a || !b) return new BigNumber(NaN);

      // Signs differ?
       if (a != b) {
        y.s = -b;
        return x.minus(y);
      }

      var xe = x.e / LOG_BASE,
        ye = y.e / LOG_BASE,
        xc = x.c,
        yc = y.c;

      if (!xe || !ye) {

        // Return ±Infinity if either ±Infinity.
        if (!xc || !yc) return new BigNumber(a / 0);

        // Either zero?
        // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
        if (!xc[0] || !yc[0]) return yc[0] ? y : new BigNumber(xc[0] ? x : a * 0);
      }

      xe = bitFloor(xe);
      ye = bitFloor(ye);
      xc = xc.slice();

      // Prepend zeros to equalise exponents. Faster to use reverse then do unshifts.
      if (a = xe - ye) {
        if (a > 0) {
          ye = xe;
          t = yc;
        } else {
          a = -a;
          t = xc;
        }

        t.reverse();
        for (; a--; t.push(0));
        t.reverse();
      }

      a = xc.length;
      b = yc.length;

      // Point xc to the longer array, and b to the shorter length.
      if (a - b < 0) t = yc, yc = xc, xc = t, b = a;

      // Only start adding at yc.length - 1 as the further digits of xc can be ignored.
      for (a = 0; b;) {
        a = (xc[--b] = xc[b] + yc[b] + a) / BASE | 0;
        xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
      }

      if (a) {
        xc = [a].concat(xc);
        ++ye;
      }

      // No need to check for zero, as +x + +y != 0 && -x + -y != 0
      // ye = MAX_EXP + 1 possible
      return normalise(y, xc, ye);
    };


    /*
     * If sd is undefined or null or true or false, return the number of significant digits of
     * the value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
     * If sd is true include integer-part trailing zeros in the count.
     *
     * Otherwise, if sd is a number, return a new BigNumber whose value is the value of this
     * BigNumber rounded to a maximum of sd significant digits using rounding mode rm, or
     * ROUNDING_MODE if rm is omitted.
     *
     * sd {number|boolean} number: significant digits: integer, 1 to MAX inclusive.
     *                     boolean: whether to count integer-part trailing zeros: true or false.
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
     */
    P.precision = P.sd = function (sd, rm) {
      var c, n, v,
        x = this;

      if (sd != null && sd !== !!sd) {
        intCheck(sd, 1, MAX);
        if (rm == null) rm = ROUNDING_MODE;
        else intCheck(rm, 0, 8);

        return round(new BigNumber(x), sd, rm);
      }

      if (!(c = x.c)) return null;
      v = c.length - 1;
      n = v * LOG_BASE + 1;

      if (v = c[v]) {

        // Subtract the number of trailing zeros of the last element.
        for (; v % 10 == 0; v /= 10, n--);

        // Add the number of digits of the first element.
        for (v = c[0]; v >= 10; v /= 10, n++);
      }

      if (sd && x.e + 1 > n) n = x.e + 1;

      return n;
    };


    /*
     * Return a new BigNumber whose value is the value of this BigNumber shifted by k places
     * (powers of 10). Shift to the right if n > 0, and to the left if n < 0.
     *
     * k {number} Integer, -MAX_SAFE_INTEGER to MAX_SAFE_INTEGER inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {k}'
     */
    P.shiftedBy = function (k) {
      intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
      return this.times('1e' + k);
    };


    /*
     *  sqrt(-n) =  N
     *  sqrt(N) =  N
     *  sqrt(-I) =  N
     *  sqrt(I) =  I
     *  sqrt(0) =  0
     *  sqrt(-0) = -0
     *
     * Return a new BigNumber whose value is the square root of the value of this BigNumber,
     * rounded according to DECIMAL_PLACES and ROUNDING_MODE.
     */
    P.squareRoot = P.sqrt = function () {
      var m, n, r, rep, t,
        x = this,
        c = x.c,
        s = x.s,
        e = x.e,
        dp = DECIMAL_PLACES + 4,
        half = new BigNumber('0.5');

      // Negative/NaN/Infinity/zero?
      if (s !== 1 || !c || !c[0]) {
        return new BigNumber(!s || s < 0 && (!c || c[0]) ? NaN : c ? x : 1 / 0);
      }

      // Initial estimate.
      s = Math.sqrt(+valueOf(x));

      // Math.sqrt underflow/overflow?
      // Pass x to Math.sqrt as integer, then adjust the exponent of the result.
      if (s == 0 || s == 1 / 0) {
        n = coeffToString(c);
        if ((n.length + e) % 2 == 0) n += '0';
        s = Math.sqrt(+n);
        e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);

        if (s == 1 / 0) {
          n = '5e' + e;
        } else {
          n = s.toExponential();
          n = n.slice(0, n.indexOf('e') + 1) + e;
        }

        r = new BigNumber(n);
      } else {
        r = new BigNumber(s + '');
      }

      // Check for zero.
      // r could be zero if MIN_EXP is changed after the this value was created.
      // This would cause a division by zero (x/t) and hence Infinity below, which would cause
      // coeffToString to throw.
      if (r.c[0]) {
        e = r.e;
        s = e + dp;
        if (s < 3) s = 0;

        // Newton-Raphson iteration.
        for (; ;) {
          t = r;
          r = half.times(t.plus(div(x, t, dp, 1)));

          if (coeffToString(t.c).slice(0, s) === (n = coeffToString(r.c)).slice(0, s)) {

            // The exponent of r may here be one less than the final result exponent,
            // e.g 0.0009999 (e-4) --> 0.001 (e-3), so adjust s so the rounding digits
            // are indexed correctly.
            if (r.e < e) --s;
            n = n.slice(s - 3, s + 1);

            // The 4th rounding digit may be in error by -1 so if the 4 rounding digits
            // are 9999 or 4999 (i.e. approaching a rounding boundary) continue the
            // iteration.
            if (n == '9999' || !rep && n == '4999') {

              // On the first iteration only, check to see if rounding up gives the
              // exact result as the nines may infinitely repeat.
              if (!rep) {
                round(t, t.e + DECIMAL_PLACES + 2, 0);

                if (t.times(t).eq(x)) {
                  r = t;
                  break;
                }
              }

              dp += 4;
              s += 4;
              rep = 1;
            } else {

              // If rounding digits are null, 0{0,4} or 50{0,3}, check for exact
              // result. If not, then there are further digits and m will be truthy.
              if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

                // Truncate to the first rounding digit.
                round(r, r.e + DECIMAL_PLACES + 2, 1);
                m = !r.times(r).eq(x);
              }

              break;
            }
          }
        }
      }

      return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
    };


    /*
     * Return a string representing the value of this BigNumber in exponential notation and
     * rounded using ROUNDING_MODE to dp fixed decimal places.
     *
     * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
     */
    P.toExponential = function (dp, rm) {
      if (dp != null) {
        intCheck(dp, 0, MAX);
        dp++;
      }
      return format(this, dp, rm, 1);
    };


    /*
     * Return a string representing the value of this BigNumber in fixed-point notation rounding
     * to dp fixed decimal places using rounding mode rm, or ROUNDING_MODE if rm is omitted.
     *
     * Note: as with JavaScript's number type, (-0).toFixed(0) is '0',
     * but e.g. (-0.00001).toFixed(0) is '-0'.
     *
     * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
     */
    P.toFixed = function (dp, rm) {
      if (dp != null) {
        intCheck(dp, 0, MAX);
        dp = dp + this.e + 1;
      }
      return format(this, dp, rm);
    };


    /*
     * Return a string representing the value of this BigNumber in fixed-point notation rounded
     * using rm or ROUNDING_MODE to dp decimal places, and formatted according to the properties
     * of the format or FORMAT object (see BigNumber.set).
     *
     * The formatting object may contain some or all of the properties shown below.
     *
     * FORMAT = {
     *   prefix: '',
     *   groupSize: 3,
     *   secondaryGroupSize: 0,
     *   groupSeparator: ',',
     *   decimalSeparator: '.',
     *   fractionGroupSize: 0,
     *   fractionGroupSeparator: '\xA0',      // non-breaking space
     *   suffix: ''
     * };
     *
     * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     * [format] {object} Formatting options. See FORMAT pbject above.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
     * '[BigNumber Error] Argument not an object: {format}'
     */
    P.toFormat = function (dp, rm, format) {
      var str,
        x = this;

      if (format == null) {
        if (dp != null && rm && typeof rm == 'object') {
          format = rm;
          rm = null;
        } else if (dp && typeof dp == 'object') {
          format = dp;
          dp = rm = null;
        } else {
          format = FORMAT;
        }
      } else if (typeof format != 'object') {
        throw Error
          (bignumberError + 'Argument not an object: ' + format);
      }

      str = x.toFixed(dp, rm);

      if (x.c) {
        var i,
          arr = str.split('.'),
          g1 = +format.groupSize,
          g2 = +format.secondaryGroupSize,
          groupSeparator = format.groupSeparator || '',
          intPart = arr[0],
          fractionPart = arr[1],
          isNeg = x.s < 0,
          intDigits = isNeg ? intPart.slice(1) : intPart,
          len = intDigits.length;

        if (g2) i = g1, g1 = g2, g2 = i, len -= i;

        if (g1 > 0 && len > 0) {
          i = len % g1 || g1;
          intPart = intDigits.substr(0, i);
          for (; i < len; i += g1) intPart += groupSeparator + intDigits.substr(i, g1);
          if (g2 > 0) intPart += groupSeparator + intDigits.slice(i);
          if (isNeg) intPart = '-' + intPart;
        }

        str = fractionPart
         ? intPart + (format.decimalSeparator || '') + ((g2 = +format.fractionGroupSize)
          ? fractionPart.replace(new RegExp('\\d{' + g2 + '}\\B', 'g'),
           '$&' + (format.fractionGroupSeparator || ''))
          : fractionPart)
         : intPart;
      }

      return (format.prefix || '') + str + (format.suffix || '');
    };


    /*
     * Return an array of two BigNumbers representing the value of this BigNumber as a simple
     * fraction with an integer numerator and an integer denominator.
     * The denominator will be a positive non-zero value less than or equal to the specified
     * maximum denominator. If a maximum denominator is not specified, the denominator will be
     * the lowest value necessary to represent the number exactly.
     *
     * [md] {number|string|BigNumber} Integer >= 1, or Infinity. The maximum denominator.
     *
     * '[BigNumber Error] Argument {not an integer|out of range} : {md}'
     */
    P.toFraction = function (md) {
      var d, d0, d1, d2, e, exp, n, n0, n1, q, r, s,
        x = this,
        xc = x.c;

      if (md != null) {
        n = new BigNumber(md);

        // Throw if md is less than one or is not an integer, unless it is Infinity.
        if (!n.isInteger() && (n.c || n.s !== 1) || n.lt(ONE)) {
          throw Error
            (bignumberError + 'Argument ' +
              (n.isInteger() ? 'out of range: ' : 'not an integer: ') + valueOf(n));
        }
      }

      if (!xc) return new BigNumber(x);

      d = new BigNumber(ONE);
      n1 = d0 = new BigNumber(ONE);
      d1 = n0 = new BigNumber(ONE);
      s = coeffToString(xc);

      // Determine initial denominator.
      // d is a power of 10 and the minimum max denominator that specifies the value exactly.
      e = d.e = s.length - x.e - 1;
      d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
      md = !md || n.comparedTo(d) > 0 ? (e > 0 ? d : n1) : n;

      exp = MAX_EXP;
      MAX_EXP = 1 / 0;
      n = new BigNumber(s);

      // n0 = d1 = 0
      n0.c[0] = 0;

      for (; ;)  {
        q = div(n, d, 0, 1);
        d2 = d0.plus(q.times(d1));
        if (d2.comparedTo(md) == 1) break;
        d0 = d1;
        d1 = d2;
        n1 = n0.plus(q.times(d2 = n1));
        n0 = d2;
        d = n.minus(q.times(d2 = d));
        n = d2;
      }

      d2 = div(md.minus(d0), d1, 0, 1);
      n0 = n0.plus(d2.times(n1));
      d0 = d0.plus(d2.times(d1));
      n0.s = n1.s = x.s;
      e = e * 2;

      // Determine which fraction is closer to x, n0/d0 or n1/d1
      r = div(n1, d1, e, ROUNDING_MODE).minus(x).abs().comparedTo(
          div(n0, d0, e, ROUNDING_MODE).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];

      MAX_EXP = exp;

      return r;
    };


    /*
     * Return the value of this BigNumber converted to a number primitive.
     */
    P.toNumber = function () {
      return +valueOf(this);
    };


    /*
     * Return a string representing the value of this BigNumber rounded to sd significant digits
     * using rounding mode rm or ROUNDING_MODE. If sd is less than the number of digits
     * necessary to represent the integer part of the value in fixed-point notation, then use
     * exponential notation.
     *
     * [sd] {number} Significant digits. Integer, 1 to MAX inclusive.
     * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
     *
     * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
     */
    P.toPrecision = function (sd, rm) {
      if (sd != null) intCheck(sd, 1, MAX);
      return format(this, sd, rm, 2);
    };


    /*
     * Return a string representing the value of this BigNumber in base b, or base 10 if b is
     * omitted. If a base is specified, including base 10, round according to DECIMAL_PLACES and
     * ROUNDING_MODE. If a base is not specified, and this BigNumber has a positive exponent
     * that is equal to or greater than TO_EXP_POS, or a negative exponent equal to or less than
     * TO_EXP_NEG, return exponential notation.
     *
     * [b] {number} Integer, 2 to ALPHABET.length inclusive.
     *
     * '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
     */
    P.toString = function (b) {
      var str,
        n = this,
        s = n.s,
        e = n.e;

      // Infinity or NaN?
      if (e === null) {
        if (s) {
          str = 'Infinity';
          if (s < 0) str = '-' + str;
        } else {
          str = 'NaN';
        }
      } else {
        if (b == null) {
          str = e <= TO_EXP_NEG || e >= TO_EXP_POS
           ? toExponential(coeffToString(n.c), e)
           : toFixedPoint(coeffToString(n.c), e, '0');
        } else if (b === 10) {
          n = round(new BigNumber(n), DECIMAL_PLACES + e + 1, ROUNDING_MODE);
          str = toFixedPoint(coeffToString(n.c), n.e, '0');
        } else {
          intCheck(b, 2, ALPHABET.length, 'Base');
          str = convertBase(toFixedPoint(coeffToString(n.c), e, '0'), 10, b, s, true);
        }

        if (s < 0 && n.c[0]) str = '-' + str;
      }

      return str;
    };


    /*
     * Return as toString, but do not accept a base argument, and include the minus sign for
     * negative zero.
     */
    P.valueOf = P.toJSON = function () {
      return valueOf(this);
    };


    P._isBigNumber = true;

    if (configObject != null) BigNumber.set(configObject);

    return BigNumber;
  }


  // PRIVATE HELPER FUNCTIONS

  // These functions don't need access to variables,
  // e.g. DECIMAL_PLACES, in the scope of the `clone` function above.


  function bitFloor(n) {
    var i = n | 0;
    return n > 0 || n === i ? i : i - 1;
  }


  // Return a coefficient array as a string of base 10 digits.
  function coeffToString(a) {
    var s, z,
      i = 1,
      j = a.length,
      r = a[0] + '';

    for (; i < j;) {
      s = a[i++] + '';
      z = LOG_BASE - s.length;
      for (; z--; s = '0' + s);
      r += s;
    }

    // Determine trailing zeros.
    for (j = r.length; r.charCodeAt(--j) === 48;);

    return r.slice(0, j + 1 || 1);
  }


  // Compare the value of BigNumbers x and y.
  function compare(x, y) {
    var a, b,
      xc = x.c,
      yc = y.c,
      i = x.s,
      j = y.s,
      k = x.e,
      l = y.e;

    // Either NaN?
    if (!i || !j) return null;

    a = xc && !xc[0];
    b = yc && !yc[0];

    // Either zero?
    if (a || b) return a ? b ? 0 : -j : i;

    // Signs differ?
    if (i != j) return i;

    a = i < 0;
    b = k == l;

    // Either Infinity?
    if (!xc || !yc) return b ? 0 : !xc ^ a ? 1 : -1;

    // Compare exponents.
    if (!b) return k > l ^ a ? 1 : -1;

    j = (k = xc.length) < (l = yc.length) ? k : l;

    // Compare digit by digit.
    for (i = 0; i < j; i++) if (xc[i] != yc[i]) return xc[i] > yc[i] ^ a ? 1 : -1;

    // Compare lengths.
    return k == l ? 0 : k > l ^ a ? 1 : -1;
  }


  /*
   * Check that n is a primitive number, an integer, and in range, otherwise throw.
   */
  function intCheck(n, min, max, name) {
    if (n < min || n > max || n !== mathfloor(n)) {
      throw Error
       (bignumberError + (name || 'Argument') + (typeof n == 'number'
         ? n < min || n > max ? ' out of range: ' : ' not an integer: '
         : ' not a primitive number: ') + String(n));
    }
  }


  // Assumes finite n.
  function isOdd(n) {
    var k = n.c.length - 1;
    return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
  }


  function toExponential(str, e) {
    return (str.length > 1 ? str.charAt(0) + '.' + str.slice(1) : str) +
     (e < 0 ? 'e' : 'e+') + e;
  }


  function toFixedPoint(str, e, z) {
    var len, zs;

    // Negative exponent?
    if (e < 0) {

      // Prepend zeros.
      for (zs = z + '.'; ++e; zs += z);
      str = zs + str;

    // Positive exponent
    } else {
      len = str.length;

      // Append zeros.
      if (++e > len) {
        for (zs = z, e -= len; --e; zs += z);
        str += zs;
      } else if (e < len) {
        str = str.slice(0, e) + '.' + str.slice(e);
      }
    }

    return str;
  }


  // EXPORT


  BigNumber = clone();
  BigNumber['default'] = BigNumber.BigNumber = BigNumber;

  // AMD.
  if (typeof define == 'function' && define.amd) {
    define(function () { return BigNumber; });

  // Node.js and other environments that support module.exports.
  } else if (typeof module != 'undefined' && module.exports) {
    module.exports = BigNumber;

  // Browser.
  } else {
    if (!globalObject) {
      globalObject = typeof self != 'undefined' && self ? self : window;
    }

    globalObject.BigNumber = BigNumber;
  }
})(this);

},{}],14:[function(require,module,exports){
(function (module, exports) {
  'use strict';

  // Utils
  function assert (val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  // Could use `inherits` module, but don't want to move from single file
  // architecture yet.
  function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  }

  // BN

  function BN (number, base, endian) {
    if (BN.isBN(number)) {
      return number;
    }

    this.negative = 0;
    this.words = null;
    this.length = 0;

    // Reduction context
    this.red = null;

    if (number !== null) {
      if (base === 'le' || base === 'be') {
        endian = base;
        base = 10;
      }

      this._init(number || 0, base || 10, endian || 'be');
    }
  }
  if (typeof module === 'object') {
    module.exports = BN;
  } else {
    exports.BN = BN;
  }

  BN.BN = BN;
  BN.wordSize = 26;

  var Buffer;
  try {
    if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
      Buffer = window.Buffer;
    } else {
      Buffer = require('buffer').Buffer;
    }
  } catch (e) {
  }

  BN.isBN = function isBN (num) {
    if (num instanceof BN) {
      return true;
    }

    return num !== null && typeof num === 'object' &&
      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
  };

  BN.max = function max (left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
  };

  BN.min = function min (left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
  };

  BN.prototype._init = function init (number, base, endian) {
    if (typeof number === 'number') {
      return this._initNumber(number, base, endian);
    }

    if (typeof number === 'object') {
      return this._initArray(number, base, endian);
    }

    if (base === 'hex') {
      base = 16;
    }
    assert(base === (base | 0) && base >= 2 && base <= 36);

    number = number.toString().replace(/\s+/g, '');
    var start = 0;
    if (number[0] === '-') {
      start++;
      this.negative = 1;
    }

    if (start < number.length) {
      if (base === 16) {
        this._parseHex(number, start, endian);
      } else {
        this._parseBase(number, base, start);
        if (endian === 'le') {
          this._initArray(this.toArray(), base, endian);
        }
      }
    }
  };

  BN.prototype._initNumber = function _initNumber (number, base, endian) {
    if (number < 0) {
      this.negative = 1;
      number = -number;
    }
    if (number < 0x4000000) {
      this.words = [ number & 0x3ffffff ];
      this.length = 1;
    } else if (number < 0x10000000000000) {
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff
      ];
      this.length = 2;
    } else {
      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff,
        1
      ];
      this.length = 3;
    }

    if (endian !== 'le') return;

    // Reverse the bytes
    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initArray = function _initArray (number, base, endian) {
    // Perhaps a Uint8Array
    assert(typeof number.length === 'number');
    if (number.length <= 0) {
      this.words = [ 0 ];
      this.length = 1;
      return this;
    }

    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    var off = 0;
    if (endian === 'be') {
      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    } else if (endian === 'le') {
      for (i = 0, j = 0; i < number.length; i += 3) {
        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    }
    return this.strip();
  };

  function parseHex4Bits (string, index) {
    var c = string.charCodeAt(index);
    // 'A' - 'F'
    if (c >= 65 && c <= 70) {
      return c - 55;
    // 'a' - 'f'
    } else if (c >= 97 && c <= 102) {
      return c - 87;
    // '0' - '9'
    } else {
      return (c - 48) & 0xf;
    }
  }

  function parseHexByte (string, lowerBound, index) {
    var r = parseHex4Bits(string, index);
    if (index - 1 >= lowerBound) {
      r |= parseHex4Bits(string, index - 1) << 4;
    }
    return r;
  }

  BN.prototype._parseHex = function _parseHex (number, start, endian) {
    // Create possibly bigger array to ensure that it fits the number
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    // 24-bits chunks
    var off = 0;
    var j = 0;

    var w;
    if (endian === 'be') {
      for (i = number.length - 1; i >= start; i -= 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    } else {
      var parseLength = number.length - start;
      for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    }

    this.strip();
  };

  function parseBase (str, start, end, mul) {
    var r = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r *= mul;

      // 'a'
      if (c >= 49) {
        r += c - 49 + 0xa;

      // 'A'
      } else if (c >= 17) {
        r += c - 17 + 0xa;

      // '0' - '9'
      } else {
        r += c;
      }
    }
    return r;
  }

  BN.prototype._parseBase = function _parseBase (number, base, start) {
    // Initialize as zero
    this.words = [ 0 ];
    this.length = 1;

    // Find length of limb in base
    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
      limbLen++;
    }
    limbLen--;
    limbPow = (limbPow / base) | 0;

    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;

    var word = 0;
    for (var i = start; i < end; i += limbLen) {
      word = parseBase(number, i, i + limbLen, base);

      this.imuln(limbPow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    if (mod !== 0) {
      var pow = 1;
      word = parseBase(number, i, number.length, base);

      for (i = 0; i < mod; i++) {
        pow *= base;
      }

      this.imuln(pow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    this.strip();
  };

  BN.prototype.copy = function copy (dest) {
    dest.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
  };

  BN.prototype.clone = function clone () {
    var r = new BN(null);
    this.copy(r);
    return r;
  };

  BN.prototype._expand = function _expand (size) {
    while (this.length < size) {
      this.words[this.length++] = 0;
    }
    return this;
  };

  // Remove leading `0` from `this`
  BN.prototype.strip = function strip () {
    while (this.length > 1 && this.words[this.length - 1] === 0) {
      this.length--;
    }
    return this._normSign();
  };

  BN.prototype._normSign = function _normSign () {
    // -0 = 0
    if (this.length === 1 && this.words[0] === 0) {
      this.negative = 0;
    }
    return this;
  };

  BN.prototype.inspect = function inspect () {
    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
  };

  /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

  var zeros = [
    '',
    '0',
    '00',
    '000',
    '0000',
    '00000',
    '000000',
    '0000000',
    '00000000',
    '000000000',
    '0000000000',
    '00000000000',
    '000000000000',
    '0000000000000',
    '00000000000000',
    '000000000000000',
    '0000000000000000',
    '00000000000000000',
    '000000000000000000',
    '0000000000000000000',
    '00000000000000000000',
    '000000000000000000000',
    '0000000000000000000000',
    '00000000000000000000000',
    '000000000000000000000000',
    '0000000000000000000000000'
  ];

  var groupSizes = [
    0, 0,
    25, 16, 12, 11, 10, 9, 8,
    8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 6, 5, 5,
    5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5
  ];

  var groupBases = [
    0, 0,
    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
  ];

  BN.prototype.toString = function toString (base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;

    var out;
    if (base === 16 || base === 'hex') {
      out = '';
      var off = 0;
      var carry = 0;
      for (var i = 0; i < this.length; i++) {
        var w = this.words[i];
        var word = (((w << off) | carry) & 0xffffff).toString(16);
        carry = (w >>> (24 - off)) & 0xffffff;
        if (carry !== 0 || i !== this.length - 1) {
          out = zeros[6 - word.length] + word + out;
        } else {
          out = word + out;
        }
        off += 2;
        if (off >= 26) {
          off -= 26;
          i--;
        }
      }
      if (carry !== 0) {
        out = carry.toString(16) + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    if (base === (base | 0) && base >= 2 && base <= 36) {
      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
      var groupSize = groupSizes[base];
      // var groupBase = Math.pow(base, groupSize);
      var groupBase = groupBases[base];
      out = '';
      var c = this.clone();
      c.negative = 0;
      while (!c.isZero()) {
        var r = c.modn(groupBase).toString(base);
        c = c.idivn(groupBase);

        if (!c.isZero()) {
          out = zeros[groupSize - r.length] + r + out;
        } else {
          out = r + out;
        }
      }
      if (this.isZero()) {
        out = '0' + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    assert(false, 'Base should be between 2 and 36');
  };

  BN.prototype.toNumber = function toNumber () {
    var ret = this.words[0];
    if (this.length === 2) {
      ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
      // NOTE: at this stage it is known that the top bit is set
      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
    } else if (this.length > 2) {
      assert(false, 'Number can only safely store up to 53 bits');
    }
    return (this.negative !== 0) ? -ret : ret;
  };

  BN.prototype.toJSON = function toJSON () {
    return this.toString(16);
  };

  BN.prototype.toBuffer = function toBuffer (endian, length) {
    assert(typeof Buffer !== 'undefined');
    return this.toArrayLike(Buffer, endian, length);
  };

  BN.prototype.toArray = function toArray (endian, length) {
    return this.toArrayLike(Array, endian, length);
  };

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    this.strip();
    var littleEndian = endian === 'le';
    var res = new ArrayType(reqLength);

    var b, i;
    var q = this.clone();
    if (!littleEndian) {
      // Assume big-endian
      for (i = 0; i < reqLength - byteLength; i++) {
        res[i] = 0;
      }

      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[reqLength - i - 1] = b;
      }
    } else {
      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[i] = b;
      }

      for (; i < reqLength; i++) {
        res[i] = 0;
      }
    }

    return res;
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }

  BN.prototype._zeroBits = function _zeroBits (w) {
    // Short-cut
    if (w === 0) return 26;

    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
      r += 13;
      t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
      r += 7;
      t >>>= 7;
    }
    if ((t & 0xf) === 0) {
      r += 4;
      t >>>= 4;
    }
    if ((t & 0x3) === 0) {
      r += 2;
      t >>>= 2;
    }
    if ((t & 0x1) === 0) {
      r++;
    }
    return r;
  };

  // Return number of used bits in a BN
  BN.prototype.bitLength = function bitLength () {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
  };

  function toBitArray (num) {
    var w = new Array(num.bitLength());

    for (var bit = 0; bit < w.length; bit++) {
      var off = (bit / 26) | 0;
      var wbit = bit % 26;

      w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
    }

    return w;
  }

  // Number of trailing zero bits
  BN.prototype.zeroBits = function zeroBits () {
    if (this.isZero()) return 0;

    var r = 0;
    for (var i = 0; i < this.length; i++) {
      var b = this._zeroBits(this.words[i]);
      r += b;
      if (b !== 26) break;
    }
    return r;
  };

  BN.prototype.byteLength = function byteLength () {
    return Math.ceil(this.bitLength() / 8);
  };

  BN.prototype.toTwos = function toTwos (width) {
    if (this.negative !== 0) {
      return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
  };

  BN.prototype.fromTwos = function fromTwos (width) {
    if (this.testn(width - 1)) {
      return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
  };

  BN.prototype.isNeg = function isNeg () {
    return this.negative !== 0;
  };

  // Return negative clone of `this`
  BN.prototype.neg = function neg () {
    return this.clone().ineg();
  };

  BN.prototype.ineg = function ineg () {
    if (!this.isZero()) {
      this.negative ^= 1;
    }

    return this;
  };

  // Or `num` with `this` in-place
  BN.prototype.iuor = function iuor (num) {
    while (this.length < num.length) {
      this.words[this.length++] = 0;
    }

    for (var i = 0; i < num.length; i++) {
      this.words[i] = this.words[i] | num.words[i];
    }

    return this.strip();
  };

  BN.prototype.ior = function ior (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuor(num);
  };

  // Or `num` with `this`
  BN.prototype.or = function or (num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
  };

  BN.prototype.uor = function uor (num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
  };

  // And `num` with `this` in-place
  BN.prototype.iuand = function iuand (num) {
    // b = min-length(num, this)
    var b;
    if (this.length > num.length) {
      b = num;
    } else {
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = this.words[i] & num.words[i];
    }

    this.length = b.length;

    return this.strip();
  };

  BN.prototype.iand = function iand (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuand(num);
  };

  // And `num` with `this`
  BN.prototype.and = function and (num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
  };

  BN.prototype.uand = function uand (num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
  };

  // Xor `num` with `this` in-place
  BN.prototype.iuxor = function iuxor (num) {
    // a.length > b.length
    var a;
    var b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = a.words[i] ^ b.words[i];
    }

    if (this !== a) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = a.length;

    return this.strip();
  };

  BN.prototype.ixor = function ixor (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuxor(num);
  };

  // Xor `num` with `this`
  BN.prototype.xor = function xor (num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
  };

  BN.prototype.uxor = function uxor (num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
  };

  // Not ``this`` with ``width`` bitwidth
  BN.prototype.inotn = function inotn (width) {
    assert(typeof width === 'number' && width >= 0);

    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;

    // Extend the buffer with leading zeroes
    this._expand(bytesNeeded);

    if (bitsLeft > 0) {
      bytesNeeded--;
    }

    // Handle complete words
    for (var i = 0; i < bytesNeeded; i++) {
      this.words[i] = ~this.words[i] & 0x3ffffff;
    }

    // Handle the residue
    if (bitsLeft > 0) {
      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
    }

    // And remove leading zeroes
    return this.strip();
  };

  BN.prototype.notn = function notn (width) {
    return this.clone().inotn(width);
  };

  // Set `bit` of `this`
  BN.prototype.setn = function setn (bit, val) {
    assert(typeof bit === 'number' && bit >= 0);

    var off = (bit / 26) | 0;
    var wbit = bit % 26;

    this._expand(off + 1);

    if (val) {
      this.words[off] = this.words[off] | (1 << wbit);
    } else {
      this.words[off] = this.words[off] & ~(1 << wbit);
    }

    return this.strip();
  };

  // Add `num` to `this` in-place
  BN.prototype.iadd = function iadd (num) {
    var r;

    // negative + positive
    if (this.negative !== 0 && num.negative === 0) {
      this.negative = 0;
      r = this.isub(num);
      this.negative ^= 1;
      return this._normSign();

    // positive + negative
    } else if (this.negative === 0 && num.negative !== 0) {
      num.negative = 0;
      r = this.isub(num);
      num.negative = 1;
      return r._normSign();
    }

    // a.length > b.length
    var a, b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }

    this.length = a.length;
    if (carry !== 0) {
      this.words[this.length] = carry;
      this.length++;
    // Copy the rest of the words
    } else if (a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    return this;
  };

  // Add `num` to `this`
  BN.prototype.add = function add (num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
      num.negative = 0;
      res = this.sub(num);
      num.negative ^= 1;
      return res;
    } else if (num.negative === 0 && this.negative !== 0) {
      this.negative = 0;
      res = num.sub(this);
      this.negative = 1;
      return res;
    }

    if (this.length > num.length) return this.clone().iadd(num);

    return num.clone().iadd(this);
  };

  // Subtract `num` from `this` in-place
  BN.prototype.isub = function isub (num) {
    // this - (-num) = this + num
    if (num.negative !== 0) {
      num.negative = 0;
      var r = this.iadd(num);
      num.negative = 1;
      return r._normSign();

    // -this - num = -(this + num)
    } else if (this.negative !== 0) {
      this.negative = 0;
      this.iadd(num);
      this.negative = 1;
      return this._normSign();
    }

    // At this point both numbers are positive
    var cmp = this.cmp(num);

    // Optimization - zeroify
    if (cmp === 0) {
      this.negative = 0;
      this.length = 1;
      this.words[0] = 0;
      return this;
    }

    // a > b
    var a, b;
    if (cmp > 0) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }

    // Copy rest of the words
    if (carry === 0 && i < a.length && a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = Math.max(this.length, i);

    if (a !== this) {
      this.negative = 1;
    }

    return this.strip();
  };

  // Subtract `num` from `this`
  BN.prototype.sub = function sub (num) {
    return this.clone().isub(num);
  };

  function smallMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    var len = (self.length + num.length) | 0;
    out.length = len;
    len = (len - 1) | 0;

    // Peel one iteration (compiler can't do it, because of code complexity)
    var a = self.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;

    var lo = r & 0x3ffffff;
    var carry = (r / 0x4000000) | 0;
    out.words[0] = lo;

    for (var k = 1; k < len; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = carry >>> 26;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = (k - j) | 0;
        a = self.words[i] | 0;
        b = num.words[j] | 0;
        r = a * b + rword;
        ncarry += (r / 0x4000000) | 0;
        rword = r & 0x3ffffff;
      }
      out.words[k] = rword | 0;
      carry = ncarry | 0;
    }
    if (carry !== 0) {
      out.words[k] = carry | 0;
    } else {
      out.length--;
    }

    return out.strip();
  }

  // TODO(indutny): it may be reasonable to omit it for users who don't need
  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
  // multiplication (like elliptic secp256k1).
  var comb10MulTo = function comb10MulTo (self, num, out) {
    var a = self.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;

    out.negative = self.negative ^ num.negative;
    out.length = 19;
    /* k = 0 */
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = (mid + Math.imul(ah0, bl0)) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
    w0 &= 0x3ffffff;
    /* k = 1 */
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = (mid + Math.imul(ah1, bl0)) | 0;
    hi = Math.imul(ah1, bh0);
    lo = (lo + Math.imul(al0, bl1)) | 0;
    mid = (mid + Math.imul(al0, bh1)) | 0;
    mid = (mid + Math.imul(ah0, bl1)) | 0;
    hi = (hi + Math.imul(ah0, bh1)) | 0;
    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
    w1 &= 0x3ffffff;
    /* k = 2 */
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = (mid + Math.imul(ah2, bl0)) | 0;
    hi = Math.imul(ah2, bh0);
    lo = (lo + Math.imul(al1, bl1)) | 0;
    mid = (mid + Math.imul(al1, bh1)) | 0;
    mid = (mid + Math.imul(ah1, bl1)) | 0;
    hi = (hi + Math.imul(ah1, bh1)) | 0;
    lo = (lo + Math.imul(al0, bl2)) | 0;
    mid = (mid + Math.imul(al0, bh2)) | 0;
    mid = (mid + Math.imul(ah0, bl2)) | 0;
    hi = (hi + Math.imul(ah0, bh2)) | 0;
    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
    w2 &= 0x3ffffff;
    /* k = 3 */
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = (mid + Math.imul(ah3, bl0)) | 0;
    hi = Math.imul(ah3, bh0);
    lo = (lo + Math.imul(al2, bl1)) | 0;
    mid = (mid + Math.imul(al2, bh1)) | 0;
    mid = (mid + Math.imul(ah2, bl1)) | 0;
    hi = (hi + Math.imul(ah2, bh1)) | 0;
    lo = (lo + Math.imul(al1, bl2)) | 0;
    mid = (mid + Math.imul(al1, bh2)) | 0;
    mid = (mid + Math.imul(ah1, bl2)) | 0;
    hi = (hi + Math.imul(ah1, bh2)) | 0;
    lo = (lo + Math.imul(al0, bl3)) | 0;
    mid = (mid + Math.imul(al0, bh3)) | 0;
    mid = (mid + Math.imul(ah0, bl3)) | 0;
    hi = (hi + Math.imul(ah0, bh3)) | 0;
    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
    w3 &= 0x3ffffff;
    /* k = 4 */
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = (mid + Math.imul(ah4, bl0)) | 0;
    hi = Math.imul(ah4, bh0);
    lo = (lo + Math.imul(al3, bl1)) | 0;
    mid = (mid + Math.imul(al3, bh1)) | 0;
    mid = (mid + Math.imul(ah3, bl1)) | 0;
    hi = (hi + Math.imul(ah3, bh1)) | 0;
    lo = (lo + Math.imul(al2, bl2)) | 0;
    mid = (mid + Math.imul(al2, bh2)) | 0;
    mid = (mid + Math.imul(ah2, bl2)) | 0;
    hi = (hi + Math.imul(ah2, bh2)) | 0;
    lo = (lo + Math.imul(al1, bl3)) | 0;
    mid = (mid + Math.imul(al1, bh3)) | 0;
    mid = (mid + Math.imul(ah1, bl3)) | 0;
    hi = (hi + Math.imul(ah1, bh3)) | 0;
    lo = (lo + Math.imul(al0, bl4)) | 0;
    mid = (mid + Math.imul(al0, bh4)) | 0;
    mid = (mid + Math.imul(ah0, bl4)) | 0;
    hi = (hi + Math.imul(ah0, bh4)) | 0;
    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
    w4 &= 0x3ffffff;
    /* k = 5 */
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = (mid + Math.imul(ah5, bl0)) | 0;
    hi = Math.imul(ah5, bh0);
    lo = (lo + Math.imul(al4, bl1)) | 0;
    mid = (mid + Math.imul(al4, bh1)) | 0;
    mid = (mid + Math.imul(ah4, bl1)) | 0;
    hi = (hi + Math.imul(ah4, bh1)) | 0;
    lo = (lo + Math.imul(al3, bl2)) | 0;
    mid = (mid + Math.imul(al3, bh2)) | 0;
    mid = (mid + Math.imul(ah3, bl2)) | 0;
    hi = (hi + Math.imul(ah3, bh2)) | 0;
    lo = (lo + Math.imul(al2, bl3)) | 0;
    mid = (mid + Math.imul(al2, bh3)) | 0;
    mid = (mid + Math.imul(ah2, bl3)) | 0;
    hi = (hi + Math.imul(ah2, bh3)) | 0;
    lo = (lo + Math.imul(al1, bl4)) | 0;
    mid = (mid + Math.imul(al1, bh4)) | 0;
    mid = (mid + Math.imul(ah1, bl4)) | 0;
    hi = (hi + Math.imul(ah1, bh4)) | 0;
    lo = (lo + Math.imul(al0, bl5)) | 0;
    mid = (mid + Math.imul(al0, bh5)) | 0;
    mid = (mid + Math.imul(ah0, bl5)) | 0;
    hi = (hi + Math.imul(ah0, bh5)) | 0;
    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
    w5 &= 0x3ffffff;
    /* k = 6 */
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = (mid + Math.imul(ah6, bl0)) | 0;
    hi = Math.imul(ah6, bh0);
    lo = (lo + Math.imul(al5, bl1)) | 0;
    mid = (mid + Math.imul(al5, bh1)) | 0;
    mid = (mid + Math.imul(ah5, bl1)) | 0;
    hi = (hi + Math.imul(ah5, bh1)) | 0;
    lo = (lo + Math.imul(al4, bl2)) | 0;
    mid = (mid + Math.imul(al4, bh2)) | 0;
    mid = (mid + Math.imul(ah4, bl2)) | 0;
    hi = (hi + Math.imul(ah4, bh2)) | 0;
    lo = (lo + Math.imul(al3, bl3)) | 0;
    mid = (mid + Math.imul(al3, bh3)) | 0;
    mid = (mid + Math.imul(ah3, bl3)) | 0;
    hi = (hi + Math.imul(ah3, bh3)) | 0;
    lo = (lo + Math.imul(al2, bl4)) | 0;
    mid = (mid + Math.imul(al2, bh4)) | 0;
    mid = (mid + Math.imul(ah2, bl4)) | 0;
    hi = (hi + Math.imul(ah2, bh4)) | 0;
    lo = (lo + Math.imul(al1, bl5)) | 0;
    mid = (mid + Math.imul(al1, bh5)) | 0;
    mid = (mid + Math.imul(ah1, bl5)) | 0;
    hi = (hi + Math.imul(ah1, bh5)) | 0;
    lo = (lo + Math.imul(al0, bl6)) | 0;
    mid = (mid + Math.imul(al0, bh6)) | 0;
    mid = (mid + Math.imul(ah0, bl6)) | 0;
    hi = (hi + Math.imul(ah0, bh6)) | 0;
    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
    w6 &= 0x3ffffff;
    /* k = 7 */
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = (mid + Math.imul(ah7, bl0)) | 0;
    hi = Math.imul(ah7, bh0);
    lo = (lo + Math.imul(al6, bl1)) | 0;
    mid = (mid + Math.imul(al6, bh1)) | 0;
    mid = (mid + Math.imul(ah6, bl1)) | 0;
    hi = (hi + Math.imul(ah6, bh1)) | 0;
    lo = (lo + Math.imul(al5, bl2)) | 0;
    mid = (mid + Math.imul(al5, bh2)) | 0;
    mid = (mid + Math.imul(ah5, bl2)) | 0;
    hi = (hi + Math.imul(ah5, bh2)) | 0;
    lo = (lo + Math.imul(al4, bl3)) | 0;
    mid = (mid + Math.imul(al4, bh3)) | 0;
    mid = (mid + Math.imul(ah4, bl3)) | 0;
    hi = (hi + Math.imul(ah4, bh3)) | 0;
    lo = (lo + Math.imul(al3, bl4)) | 0;
    mid = (mid + Math.imul(al3, bh4)) | 0;
    mid = (mid + Math.imul(ah3, bl4)) | 0;
    hi = (hi + Math.imul(ah3, bh4)) | 0;
    lo = (lo + Math.imul(al2, bl5)) | 0;
    mid = (mid + Math.imul(al2, bh5)) | 0;
    mid = (mid + Math.imul(ah2, bl5)) | 0;
    hi = (hi + Math.imul(ah2, bh5)) | 0;
    lo = (lo + Math.imul(al1, bl6)) | 0;
    mid = (mid + Math.imul(al1, bh6)) | 0;
    mid = (mid + Math.imul(ah1, bl6)) | 0;
    hi = (hi + Math.imul(ah1, bh6)) | 0;
    lo = (lo + Math.imul(al0, bl7)) | 0;
    mid = (mid + Math.imul(al0, bh7)) | 0;
    mid = (mid + Math.imul(ah0, bl7)) | 0;
    hi = (hi + Math.imul(ah0, bh7)) | 0;
    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
    w7 &= 0x3ffffff;
    /* k = 8 */
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = (mid + Math.imul(ah8, bl0)) | 0;
    hi = Math.imul(ah8, bh0);
    lo = (lo + Math.imul(al7, bl1)) | 0;
    mid = (mid + Math.imul(al7, bh1)) | 0;
    mid = (mid + Math.imul(ah7, bl1)) | 0;
    hi = (hi + Math.imul(ah7, bh1)) | 0;
    lo = (lo + Math.imul(al6, bl2)) | 0;
    mid = (mid + Math.imul(al6, bh2)) | 0;
    mid = (mid + Math.imul(ah6, bl2)) | 0;
    hi = (hi + Math.imul(ah6, bh2)) | 0;
    lo = (lo + Math.imul(al5, bl3)) | 0;
    mid = (mid + Math.imul(al5, bh3)) | 0;
    mid = (mid + Math.imul(ah5, bl3)) | 0;
    hi = (hi + Math.imul(ah5, bh3)) | 0;
    lo = (lo + Math.imul(al4, bl4)) | 0;
    mid = (mid + Math.imul(al4, bh4)) | 0;
    mid = (mid + Math.imul(ah4, bl4)) | 0;
    hi = (hi + Math.imul(ah4, bh4)) | 0;
    lo = (lo + Math.imul(al3, bl5)) | 0;
    mid = (mid + Math.imul(al3, bh5)) | 0;
    mid = (mid + Math.imul(ah3, bl5)) | 0;
    hi = (hi + Math.imul(ah3, bh5)) | 0;
    lo = (lo + Math.imul(al2, bl6)) | 0;
    mid = (mid + Math.imul(al2, bh6)) | 0;
    mid = (mid + Math.imul(ah2, bl6)) | 0;
    hi = (hi + Math.imul(ah2, bh6)) | 0;
    lo = (lo + Math.imul(al1, bl7)) | 0;
    mid = (mid + Math.imul(al1, bh7)) | 0;
    mid = (mid + Math.imul(ah1, bl7)) | 0;
    hi = (hi + Math.imul(ah1, bh7)) | 0;
    lo = (lo + Math.imul(al0, bl8)) | 0;
    mid = (mid + Math.imul(al0, bh8)) | 0;
    mid = (mid + Math.imul(ah0, bl8)) | 0;
    hi = (hi + Math.imul(ah0, bh8)) | 0;
    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
    w8 &= 0x3ffffff;
    /* k = 9 */
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = (mid + Math.imul(ah9, bl0)) | 0;
    hi = Math.imul(ah9, bh0);
    lo = (lo + Math.imul(al8, bl1)) | 0;
    mid = (mid + Math.imul(al8, bh1)) | 0;
    mid = (mid + Math.imul(ah8, bl1)) | 0;
    hi = (hi + Math.imul(ah8, bh1)) | 0;
    lo = (lo + Math.imul(al7, bl2)) | 0;
    mid = (mid + Math.imul(al7, bh2)) | 0;
    mid = (mid + Math.imul(ah7, bl2)) | 0;
    hi = (hi + Math.imul(ah7, bh2)) | 0;
    lo = (lo + Math.imul(al6, bl3)) | 0;
    mid = (mid + Math.imul(al6, bh3)) | 0;
    mid = (mid + Math.imul(ah6, bl3)) | 0;
    hi = (hi + Math.imul(ah6, bh3)) | 0;
    lo = (lo + Math.imul(al5, bl4)) | 0;
    mid = (mid + Math.imul(al5, bh4)) | 0;
    mid = (mid + Math.imul(ah5, bl4)) | 0;
    hi = (hi + Math.imul(ah5, bh4)) | 0;
    lo = (lo + Math.imul(al4, bl5)) | 0;
    mid = (mid + Math.imul(al4, bh5)) | 0;
    mid = (mid + Math.imul(ah4, bl5)) | 0;
    hi = (hi + Math.imul(ah4, bh5)) | 0;
    lo = (lo + Math.imul(al3, bl6)) | 0;
    mid = (mid + Math.imul(al3, bh6)) | 0;
    mid = (mid + Math.imul(ah3, bl6)) | 0;
    hi = (hi + Math.imul(ah3, bh6)) | 0;
    lo = (lo + Math.imul(al2, bl7)) | 0;
    mid = (mid + Math.imul(al2, bh7)) | 0;
    mid = (mid + Math.imul(ah2, bl7)) | 0;
    hi = (hi + Math.imul(ah2, bh7)) | 0;
    lo = (lo + Math.imul(al1, bl8)) | 0;
    mid = (mid + Math.imul(al1, bh8)) | 0;
    mid = (mid + Math.imul(ah1, bl8)) | 0;
    hi = (hi + Math.imul(ah1, bh8)) | 0;
    lo = (lo + Math.imul(al0, bl9)) | 0;
    mid = (mid + Math.imul(al0, bh9)) | 0;
    mid = (mid + Math.imul(ah0, bl9)) | 0;
    hi = (hi + Math.imul(ah0, bh9)) | 0;
    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
    w9 &= 0x3ffffff;
    /* k = 10 */
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = (mid + Math.imul(ah9, bl1)) | 0;
    hi = Math.imul(ah9, bh1);
    lo = (lo + Math.imul(al8, bl2)) | 0;
    mid = (mid + Math.imul(al8, bh2)) | 0;
    mid = (mid + Math.imul(ah8, bl2)) | 0;
    hi = (hi + Math.imul(ah8, bh2)) | 0;
    lo = (lo + Math.imul(al7, bl3)) | 0;
    mid = (mid + Math.imul(al7, bh3)) | 0;
    mid = (mid + Math.imul(ah7, bl3)) | 0;
    hi = (hi + Math.imul(ah7, bh3)) | 0;
    lo = (lo + Math.imul(al6, bl4)) | 0;
    mid = (mid + Math.imul(al6, bh4)) | 0;
    mid = (mid + Math.imul(ah6, bl4)) | 0;
    hi = (hi + Math.imul(ah6, bh4)) | 0;
    lo = (lo + Math.imul(al5, bl5)) | 0;
    mid = (mid + Math.imul(al5, bh5)) | 0;
    mid = (mid + Math.imul(ah5, bl5)) | 0;
    hi = (hi + Math.imul(ah5, bh5)) | 0;
    lo = (lo + Math.imul(al4, bl6)) | 0;
    mid = (mid + Math.imul(al4, bh6)) | 0;
    mid = (mid + Math.imul(ah4, bl6)) | 0;
    hi = (hi + Math.imul(ah4, bh6)) | 0;
    lo = (lo + Math.imul(al3, bl7)) | 0;
    mid = (mid + Math.imul(al3, bh7)) | 0;
    mid = (mid + Math.imul(ah3, bl7)) | 0;
    hi = (hi + Math.imul(ah3, bh7)) | 0;
    lo = (lo + Math.imul(al2, bl8)) | 0;
    mid = (mid + Math.imul(al2, bh8)) | 0;
    mid = (mid + Math.imul(ah2, bl8)) | 0;
    hi = (hi + Math.imul(ah2, bh8)) | 0;
    lo = (lo + Math.imul(al1, bl9)) | 0;
    mid = (mid + Math.imul(al1, bh9)) | 0;
    mid = (mid + Math.imul(ah1, bl9)) | 0;
    hi = (hi + Math.imul(ah1, bh9)) | 0;
    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
    w10 &= 0x3ffffff;
    /* k = 11 */
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = (mid + Math.imul(ah9, bl2)) | 0;
    hi = Math.imul(ah9, bh2);
    lo = (lo + Math.imul(al8, bl3)) | 0;
    mid = (mid + Math.imul(al8, bh3)) | 0;
    mid = (mid + Math.imul(ah8, bl3)) | 0;
    hi = (hi + Math.imul(ah8, bh3)) | 0;
    lo = (lo + Math.imul(al7, bl4)) | 0;
    mid = (mid + Math.imul(al7, bh4)) | 0;
    mid = (mid + Math.imul(ah7, bl4)) | 0;
    hi = (hi + Math.imul(ah7, bh4)) | 0;
    lo = (lo + Math.imul(al6, bl5)) | 0;
    mid = (mid + Math.imul(al6, bh5)) | 0;
    mid = (mid + Math.imul(ah6, bl5)) | 0;
    hi = (hi + Math.imul(ah6, bh5)) | 0;
    lo = (lo + Math.imul(al5, bl6)) | 0;
    mid = (mid + Math.imul(al5, bh6)) | 0;
    mid = (mid + Math.imul(ah5, bl6)) | 0;
    hi = (hi + Math.imul(ah5, bh6)) | 0;
    lo = (lo + Math.imul(al4, bl7)) | 0;
    mid = (mid + Math.imul(al4, bh7)) | 0;
    mid = (mid + Math.imul(ah4, bl7)) | 0;
    hi = (hi + Math.imul(ah4, bh7)) | 0;
    lo = (lo + Math.imul(al3, bl8)) | 0;
    mid = (mid + Math.imul(al3, bh8)) | 0;
    mid = (mid + Math.imul(ah3, bl8)) | 0;
    hi = (hi + Math.imul(ah3, bh8)) | 0;
    lo = (lo + Math.imul(al2, bl9)) | 0;
    mid = (mid + Math.imul(al2, bh9)) | 0;
    mid = (mid + Math.imul(ah2, bl9)) | 0;
    hi = (hi + Math.imul(ah2, bh9)) | 0;
    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
    w11 &= 0x3ffffff;
    /* k = 12 */
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = (mid + Math.imul(ah9, bl3)) | 0;
    hi = Math.imul(ah9, bh3);
    lo = (lo + Math.imul(al8, bl4)) | 0;
    mid = (mid + Math.imul(al8, bh4)) | 0;
    mid = (mid + Math.imul(ah8, bl4)) | 0;
    hi = (hi + Math.imul(ah8, bh4)) | 0;
    lo = (lo + Math.imul(al7, bl5)) | 0;
    mid = (mid + Math.imul(al7, bh5)) | 0;
    mid = (mid + Math.imul(ah7, bl5)) | 0;
    hi = (hi + Math.imul(ah7, bh5)) | 0;
    lo = (lo + Math.imul(al6, bl6)) | 0;
    mid = (mid + Math.imul(al6, bh6)) | 0;
    mid = (mid + Math.imul(ah6, bl6)) | 0;
    hi = (hi + Math.imul(ah6, bh6)) | 0;
    lo = (lo + Math.imul(al5, bl7)) | 0;
    mid = (mid + Math.imul(al5, bh7)) | 0;
    mid = (mid + Math.imul(ah5, bl7)) | 0;
    hi = (hi + Math.imul(ah5, bh7)) | 0;
    lo = (lo + Math.imul(al4, bl8)) | 0;
    mid = (mid + Math.imul(al4, bh8)) | 0;
    mid = (mid + Math.imul(ah4, bl8)) | 0;
    hi = (hi + Math.imul(ah4, bh8)) | 0;
    lo = (lo + Math.imul(al3, bl9)) | 0;
    mid = (mid + Math.imul(al3, bh9)) | 0;
    mid = (mid + Math.imul(ah3, bl9)) | 0;
    hi = (hi + Math.imul(ah3, bh9)) | 0;
    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
    w12 &= 0x3ffffff;
    /* k = 13 */
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = (mid + Math.imul(ah9, bl4)) | 0;
    hi = Math.imul(ah9, bh4);
    lo = (lo + Math.imul(al8, bl5)) | 0;
    mid = (mid + Math.imul(al8, bh5)) | 0;
    mid = (mid + Math.imul(ah8, bl5)) | 0;
    hi = (hi + Math.imul(ah8, bh5)) | 0;
    lo = (lo + Math.imul(al7, bl6)) | 0;
    mid = (mid + Math.imul(al7, bh6)) | 0;
    mid = (mid + Math.imul(ah7, bl6)) | 0;
    hi = (hi + Math.imul(ah7, bh6)) | 0;
    lo = (lo + Math.imul(al6, bl7)) | 0;
    mid = (mid + Math.imul(al6, bh7)) | 0;
    mid = (mid + Math.imul(ah6, bl7)) | 0;
    hi = (hi + Math.imul(ah6, bh7)) | 0;
    lo = (lo + Math.imul(al5, bl8)) | 0;
    mid = (mid + Math.imul(al5, bh8)) | 0;
    mid = (mid + Math.imul(ah5, bl8)) | 0;
    hi = (hi + Math.imul(ah5, bh8)) | 0;
    lo = (lo + Math.imul(al4, bl9)) | 0;
    mid = (mid + Math.imul(al4, bh9)) | 0;
    mid = (mid + Math.imul(ah4, bl9)) | 0;
    hi = (hi + Math.imul(ah4, bh9)) | 0;
    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
    w13 &= 0x3ffffff;
    /* k = 14 */
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = (mid + Math.imul(ah9, bl5)) | 0;
    hi = Math.imul(ah9, bh5);
    lo = (lo + Math.imul(al8, bl6)) | 0;
    mid = (mid + Math.imul(al8, bh6)) | 0;
    mid = (mid + Math.imul(ah8, bl6)) | 0;
    hi = (hi + Math.imul(ah8, bh6)) | 0;
    lo = (lo + Math.imul(al7, bl7)) | 0;
    mid = (mid + Math.imul(al7, bh7)) | 0;
    mid = (mid + Math.imul(ah7, bl7)) | 0;
    hi = (hi + Math.imul(ah7, bh7)) | 0;
    lo = (lo + Math.imul(al6, bl8)) | 0;
    mid = (mid + Math.imul(al6, bh8)) | 0;
    mid = (mid + Math.imul(ah6, bl8)) | 0;
    hi = (hi + Math.imul(ah6, bh8)) | 0;
    lo = (lo + Math.imul(al5, bl9)) | 0;
    mid = (mid + Math.imul(al5, bh9)) | 0;
    mid = (mid + Math.imul(ah5, bl9)) | 0;
    hi = (hi + Math.imul(ah5, bh9)) | 0;
    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
    w14 &= 0x3ffffff;
    /* k = 15 */
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = (mid + Math.imul(ah9, bl6)) | 0;
    hi = Math.imul(ah9, bh6);
    lo = (lo + Math.imul(al8, bl7)) | 0;
    mid = (mid + Math.imul(al8, bh7)) | 0;
    mid = (mid + Math.imul(ah8, bl7)) | 0;
    hi = (hi + Math.imul(ah8, bh7)) | 0;
    lo = (lo + Math.imul(al7, bl8)) | 0;
    mid = (mid + Math.imul(al7, bh8)) | 0;
    mid = (mid + Math.imul(ah7, bl8)) | 0;
    hi = (hi + Math.imul(ah7, bh8)) | 0;
    lo = (lo + Math.imul(al6, bl9)) | 0;
    mid = (mid + Math.imul(al6, bh9)) | 0;
    mid = (mid + Math.imul(ah6, bl9)) | 0;
    hi = (hi + Math.imul(ah6, bh9)) | 0;
    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
    w15 &= 0x3ffffff;
    /* k = 16 */
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = (mid + Math.imul(ah9, bl7)) | 0;
    hi = Math.imul(ah9, bh7);
    lo = (lo + Math.imul(al8, bl8)) | 0;
    mid = (mid + Math.imul(al8, bh8)) | 0;
    mid = (mid + Math.imul(ah8, bl8)) | 0;
    hi = (hi + Math.imul(ah8, bh8)) | 0;
    lo = (lo + Math.imul(al7, bl9)) | 0;
    mid = (mid + Math.imul(al7, bh9)) | 0;
    mid = (mid + Math.imul(ah7, bl9)) | 0;
    hi = (hi + Math.imul(ah7, bh9)) | 0;
    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
    w16 &= 0x3ffffff;
    /* k = 17 */
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = (mid + Math.imul(ah9, bl8)) | 0;
    hi = Math.imul(ah9, bh8);
    lo = (lo + Math.imul(al8, bl9)) | 0;
    mid = (mid + Math.imul(al8, bh9)) | 0;
    mid = (mid + Math.imul(ah8, bl9)) | 0;
    hi = (hi + Math.imul(ah8, bh9)) | 0;
    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
    w17 &= 0x3ffffff;
    /* k = 18 */
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = (mid + Math.imul(ah9, bl9)) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
      o[19] = c;
      out.length++;
    }
    return out;
  };

  // Polyfill comb
  if (!Math.imul) {
    comb10MulTo = smallMulTo;
  }

  function bigMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    out.length = self.length + num.length;

    var carry = 0;
    var hncarry = 0;
    for (var k = 0; k < out.length - 1; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = hncarry;
      hncarry = 0;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = k - j;
        var a = self.words[i] | 0;
        var b = num.words[j] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
        lo = (lo + rword) | 0;
        rword = lo & 0x3ffffff;
        ncarry = (ncarry + (lo >>> 26)) | 0;

        hncarry += ncarry >>> 26;
        ncarry &= 0x3ffffff;
      }
      out.words[k] = rword;
      carry = ncarry;
      ncarry = hncarry;
    }
    if (carry !== 0) {
      out.words[k] = carry;
    } else {
      out.length--;
    }

    return out.strip();
  }

  function jumboMulTo (self, num, out) {
    var fftm = new FFTM();
    return fftm.mulp(self, num, out);
  }

  BN.prototype.mulTo = function mulTo (num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
      res = comb10MulTo(this, num, out);
    } else if (len < 63) {
      res = smallMulTo(this, num, out);
    } else if (len < 1024) {
      res = bigMulTo(this, num, out);
    } else {
      res = jumboMulTo(this, num, out);
    }

    return res;
  };

  // Cooley-Tukey algorithm for FFT
  // slightly revisited to rely on looping instead of recursion

  function FFTM (x, y) {
    this.x = x;
    this.y = y;
  }

  FFTM.prototype.makeRBT = function makeRBT (N) {
    var t = new Array(N);
    var l = BN.prototype._countBits(N) - 1;
    for (var i = 0; i < N; i++) {
      t[i] = this.revBin(i, l, N);
    }

    return t;
  };

  // Returns binary-reversed representation of `x`
  FFTM.prototype.revBin = function revBin (x, l, N) {
    if (x === 0 || x === N - 1) return x;

    var rb = 0;
    for (var i = 0; i < l; i++) {
      rb |= (x & 1) << (l - i - 1);
      x >>= 1;
    }

    return rb;
  };

  // Performs "tweedling" phase, therefore 'emulating'
  // behaviour of the recursive algorithm
  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
    for (var i = 0; i < N; i++) {
      rtws[i] = rws[rbt[i]];
      itws[i] = iws[rbt[i]];
    }
  };

  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
    this.permute(rbt, rws, iws, rtws, itws, N);

    for (var s = 1; s < N; s <<= 1) {
      var l = s << 1;

      var rtwdf = Math.cos(2 * Math.PI / l);
      var itwdf = Math.sin(2 * Math.PI / l);

      for (var p = 0; p < N; p += l) {
        var rtwdf_ = rtwdf;
        var itwdf_ = itwdf;

        for (var j = 0; j < s; j++) {
          var re = rtws[p + j];
          var ie = itws[p + j];

          var ro = rtws[p + j + s];
          var io = itws[p + j + s];

          var rx = rtwdf_ * ro - itwdf_ * io;

          io = rtwdf_ * io + itwdf_ * ro;
          ro = rx;

          rtws[p + j] = re + ro;
          itws[p + j] = ie + io;

          rtws[p + j + s] = re - ro;
          itws[p + j + s] = ie - io;

          /* jshint maxdepth : false */
          if (j !== l) {
            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
            rtwdf_ = rx;
          }
        }
      }
    }
  };

  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
    var N = Math.max(m, n) | 1;
    var odd = N & 1;
    var i = 0;
    for (N = N / 2 | 0; N; N = N >>> 1) {
      i++;
    }

    return 1 << i + 1 + odd;
  };

  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
    if (N <= 1) return;

    for (var i = 0; i < N / 2; i++) {
      var t = rws[i];

      rws[i] = rws[N - i - 1];
      rws[N - i - 1] = t;

      t = iws[i];

      iws[i] = -iws[N - i - 1];
      iws[N - i - 1] = -t;
    }
  };

  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
    var carry = 0;
    for (var i = 0; i < N / 2; i++) {
      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
        Math.round(ws[2 * i] / N) +
        carry;

      ws[i] = w & 0x3ffffff;

      if (w < 0x4000000) {
        carry = 0;
      } else {
        carry = w / 0x4000000 | 0;
      }
    }

    return ws;
  };

  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
    var carry = 0;
    for (var i = 0; i < len; i++) {
      carry = carry + (ws[i] | 0);

      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
    }

    // Pad with zeroes
    for (i = 2 * len; i < N; ++i) {
      rws[i] = 0;
    }

    assert(carry === 0);
    assert((carry & ~0x1fff) === 0);
  };

  FFTM.prototype.stub = function stub (N) {
    var ph = new Array(N);
    for (var i = 0; i < N; i++) {
      ph[i] = 0;
    }

    return ph;
  };

  FFTM.prototype.mulp = function mulp (x, y, out) {
    var N = 2 * this.guessLen13b(x.length, y.length);

    var rbt = this.makeRBT(N);

    var _ = this.stub(N);

    var rws = new Array(N);
    var rwst = new Array(N);
    var iwst = new Array(N);

    var nrws = new Array(N);
    var nrwst = new Array(N);
    var niwst = new Array(N);

    var rmws = out.words;
    rmws.length = N;

    this.convert13b(x.words, x.length, rws, N);
    this.convert13b(y.words, y.length, nrws, N);

    this.transform(rws, _, rwst, iwst, N, rbt);
    this.transform(nrws, _, nrwst, niwst, N, rbt);

    for (var i = 0; i < N; i++) {
      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
      rwst[i] = rx;
    }

    this.conjugate(rwst, iwst, N);
    this.transform(rwst, iwst, rmws, _, N, rbt);
    this.conjugate(rmws, _, N);
    this.normalize13b(rmws, N);

    out.negative = x.negative ^ y.negative;
    out.length = x.length + y.length;
    return out.strip();
  };

  // Multiply `this` by `num`
  BN.prototype.mul = function mul (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
  };

  // Multiply employing FFT
  BN.prototype.mulf = function mulf (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
  };

  // In-place Multiplication
  BN.prototype.imul = function imul (num) {
    return this.clone().mulTo(num, this);
  };

  BN.prototype.imuln = function imuln (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);

    // Carry
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = (this.words[i] | 0) * num;
      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
      carry >>= 26;
      carry += (w / 0x4000000) | 0;
      // NOTE: lo is 27bit maximum
      carry += lo >>> 26;
      this.words[i] = lo & 0x3ffffff;
    }

    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }

    return this;
  };

  BN.prototype.muln = function muln (num) {
    return this.clone().imuln(num);
  };

  // `this` * `this`
  BN.prototype.sqr = function sqr () {
    return this.mul(this);
  };

  // `this` * `this` in-place
  BN.prototype.isqr = function isqr () {
    return this.imul(this.clone());
  };

  // Math.pow(`this`, `num`)
  BN.prototype.pow = function pow (num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);

    // Skip leading zeroes
    var res = this;
    for (var i = 0; i < w.length; i++, res = res.sqr()) {
      if (w[i] !== 0) break;
    }

    if (++i < w.length) {
      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
        if (w[i] === 0) continue;

        res = res.mul(q);
      }
    }

    return res;
  };

  // Shift-left in-place
  BN.prototype.iushln = function iushln (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
    var i;

    if (r !== 0) {
      var carry = 0;

      for (i = 0; i < this.length; i++) {
        var newCarry = this.words[i] & carryMask;
        var c = ((this.words[i] | 0) - newCarry) << r;
        this.words[i] = c | carry;
        carry = newCarry >>> (26 - r);
      }

      if (carry) {
        this.words[i] = carry;
        this.length++;
      }
    }

    if (s !== 0) {
      for (i = this.length - 1; i >= 0; i--) {
        this.words[i + s] = this.words[i];
      }

      for (i = 0; i < s; i++) {
        this.words[i] = 0;
      }

      this.length += s;
    }

    return this.strip();
  };

  BN.prototype.ishln = function ishln (bits) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushln(bits);
  };

  // Shift-right in-place
  // NOTE: `hint` is a lowest bit before trailing zeroes
  // NOTE: if `extended` is present - it will be filled with destroyed bits
  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
    assert(typeof bits === 'number' && bits >= 0);
    var h;
    if (hint) {
      h = (hint - (hint % 26)) / 26;
    } else {
      h = 0;
    }

    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    var maskedWords = extended;

    h -= s;
    h = Math.max(0, h);

    // Extended mode, copy masked part
    if (maskedWords) {
      for (var i = 0; i < s; i++) {
        maskedWords.words[i] = this.words[i];
      }
      maskedWords.length = s;
    }

    if (s === 0) {
      // No-op, we should not move anything at all
    } else if (this.length > s) {
      this.length -= s;
      for (i = 0; i < this.length; i++) {
        this.words[i] = this.words[i + s];
      }
    } else {
      this.words[0] = 0;
      this.length = 1;
    }

    var carry = 0;
    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
      var word = this.words[i] | 0;
      this.words[i] = (carry << (26 - r)) | (word >>> r);
      carry = word & mask;
    }

    // Push carried bits as a mask
    if (maskedWords && carry !== 0) {
      maskedWords.words[maskedWords.length++] = carry;
    }

    if (this.length === 0) {
      this.words[0] = 0;
      this.length = 1;
    }

    return this.strip();
  };

  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushrn(bits, hint, extended);
  };

  // Shift-left
  BN.prototype.shln = function shln (bits) {
    return this.clone().ishln(bits);
  };

  BN.prototype.ushln = function ushln (bits) {
    return this.clone().iushln(bits);
  };

  // Shift-right
  BN.prototype.shrn = function shrn (bits) {
    return this.clone().ishrn(bits);
  };

  BN.prototype.ushrn = function ushrn (bits) {
    return this.clone().iushrn(bits);
  };

  // Test if n bit is set
  BN.prototype.testn = function testn (bit) {
    assert(typeof bit === 'number' && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) return false;

    // Check bit and return
    var w = this.words[s];

    return !!(w & q);
  };

  // Return only lowers bits of number (in-place)
  BN.prototype.imaskn = function imaskn (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;

    assert(this.negative === 0, 'imaskn works only with positive numbers');

    if (this.length <= s) {
      return this;
    }

    if (r !== 0) {
      s++;
    }
    this.length = Math.min(s, this.length);

    if (r !== 0) {
      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
      this.words[this.length - 1] &= mask;
    }

    return this.strip();
  };

  // Return only lowers bits of number
  BN.prototype.maskn = function maskn (bits) {
    return this.clone().imaskn(bits);
  };

  // Add plain number `num` to `this`
  BN.prototype.iaddn = function iaddn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.isubn(-num);

    // Possible sign change
    if (this.negative !== 0) {
      if (this.length === 1 && (this.words[0] | 0) < num) {
        this.words[0] = num - (this.words[0] | 0);
        this.negative = 0;
        return this;
      }

      this.negative = 0;
      this.isubn(num);
      this.negative = 1;
      return this;
    }

    // Add without checks
    return this._iaddn(num);
  };

  BN.prototype._iaddn = function _iaddn (num) {
    this.words[0] += num;

    // Carry
    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
      this.words[i] -= 0x4000000;
      if (i === this.length - 1) {
        this.words[i + 1] = 1;
      } else {
        this.words[i + 1]++;
      }
    }
    this.length = Math.max(this.length, i + 1);

    return this;
  };

  // Subtract plain number `num` from `this`
  BN.prototype.isubn = function isubn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);

    if (this.negative !== 0) {
      this.negative = 0;
      this.iaddn(num);
      this.negative = 1;
      return this;
    }

    this.words[0] -= num;

    if (this.length === 1 && this.words[0] < 0) {
      this.words[0] = -this.words[0];
      this.negative = 1;
    } else {
      // Carry
      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
        this.words[i] += 0x4000000;
        this.words[i + 1] -= 1;
      }
    }

    return this.strip();
  };

  BN.prototype.addn = function addn (num) {
    return this.clone().iaddn(num);
  };

  BN.prototype.subn = function subn (num) {
    return this.clone().isubn(num);
  };

  BN.prototype.iabs = function iabs () {
    this.negative = 0;

    return this;
  };

  BN.prototype.abs = function abs () {
    return this.clone().iabs();
  };

  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
    var len = num.length + shift;
    var i;

    this._expand(len);

    var w;
    var carry = 0;
    for (i = 0; i < num.length; i++) {
      w = (this.words[i + shift] | 0) + carry;
      var right = (num.words[i] | 0) * mul;
      w -= right & 0x3ffffff;
      carry = (w >> 26) - ((right / 0x4000000) | 0);
      this.words[i + shift] = w & 0x3ffffff;
    }
    for (; i < this.length - shift; i++) {
      w = (this.words[i + shift] | 0) + carry;
      carry = w >> 26;
      this.words[i + shift] = w & 0x3ffffff;
    }

    if (carry === 0) return this.strip();

    // Subtraction overflow
    assert(carry === -1);
    carry = 0;
    for (i = 0; i < this.length; i++) {
      w = -(this.words[i] | 0) + carry;
      carry = w >> 26;
      this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;

    return this.strip();
  };

  BN.prototype._wordDiv = function _wordDiv (num, mode) {
    var shift = this.length - num.length;

    var a = this.clone();
    var b = num;

    // Normalize
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
      b = b.ushln(shift);
      a.iushln(shift);
      bhi = b.words[b.length - 1] | 0;
    }

    // Initialize quotient
    var m = a.length - b.length;
    var q;

    if (mode !== 'mod') {
      q = new BN(null);
      q.length = m + 1;
      q.words = new Array(q.length);
      for (var i = 0; i < q.length; i++) {
        q.words[i] = 0;
      }
    }

    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
      a = diff;
      if (q) {
        q.words[m] = 1;
      }
    }

    for (var j = m - 1; j >= 0; j--) {
      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
        (a.words[b.length + j - 1] | 0);

      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
      // (0x7ffffff)
      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

      a._ishlnsubmul(b, qj, j);
      while (a.negative !== 0) {
        qj--;
        a.negative = 0;
        a._ishlnsubmul(b, 1, j);
        if (!a.isZero()) {
          a.negative ^= 1;
        }
      }
      if (q) {
        q.words[j] = qj;
      }
    }
    if (q) {
      q.strip();
    }
    a.strip();

    // Denormalize
    if (mode !== 'div' && shift !== 0) {
      a.iushrn(shift);
    }

    return {
      div: q || null,
      mod: a
    };
  };

  // NOTE: 1) `mode` can be set to `mod` to request mod only,
  //       to `div` to request div only, or be absent to
  //       request both div & mod
  //       2) `positive` is true if unsigned mod is requested
  BN.prototype.divmod = function divmod (num, mode, positive) {
    assert(!num.isZero());

    if (this.isZero()) {
      return {
        div: new BN(0),
        mod: new BN(0)
      };
    }

    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
      res = this.neg().divmod(num, mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.iadd(num);
        }
      }

      return {
        div: div,
        mod: mod
      };
    }

    if (this.negative === 0 && num.negative !== 0) {
      res = this.divmod(num.neg(), mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      return {
        div: div,
        mod: res.mod
      };
    }

    if ((this.negative & num.negative) !== 0) {
      res = this.neg().divmod(num.neg(), mode);

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.isub(num);
        }
      }

      return {
        div: res.div,
        mod: mod
      };
    }

    // Both numbers are positive at this point

    // Strip both numbers to approximate shift value
    if (num.length > this.length || this.cmp(num) < 0) {
      return {
        div: new BN(0),
        mod: this
      };
    }

    // Very short reduction
    if (num.length === 1) {
      if (mode === 'div') {
        return {
          div: this.divn(num.words[0]),
          mod: null
        };
      }

      if (mode === 'mod') {
        return {
          div: null,
          mod: new BN(this.modn(num.words[0]))
        };
      }

      return {
        div: this.divn(num.words[0]),
        mod: new BN(this.modn(num.words[0]))
      };
    }

    return this._wordDiv(num, mode);
  };

  // Find `this` / `num`
  BN.prototype.div = function div (num) {
    return this.divmod(num, 'div', false).div;
  };

  // Find `this` % `num`
  BN.prototype.mod = function mod (num) {
    return this.divmod(num, 'mod', false).mod;
  };

  BN.prototype.umod = function umod (num) {
    return this.divmod(num, 'mod', true).mod;
  };

  // Find Round(`this` / `num`)
  BN.prototype.divRound = function divRound (num) {
    var dm = this.divmod(num);

    // Fast case - exact division
    if (dm.mod.isZero()) return dm.div;

    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);

    // Round down
    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

    // Round up
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
  };

  BN.prototype.modn = function modn (num) {
    assert(num <= 0x3ffffff);
    var p = (1 << 26) % num;

    var acc = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      acc = (p * acc + (this.words[i] | 0)) % num;
    }

    return acc;
  };

  // In-place division by number
  BN.prototype.idivn = function idivn (num) {
    assert(num <= 0x3ffffff);

    var carry = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var w = (this.words[i] | 0) + carry * 0x4000000;
      this.words[i] = (w / num) | 0;
      carry = w % num;
    }

    return this.strip();
  };

  BN.prototype.divn = function divn (num) {
    return this.clone().idivn(num);
  };

  BN.prototype.egcd = function egcd (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var x = this;
    var y = p.clone();

    if (x.negative !== 0) {
      x = x.umod(p);
    } else {
      x = x.clone();
    }

    // A * x + B * y = x
    var A = new BN(1);
    var B = new BN(0);

    // C * x + D * y = y
    var C = new BN(0);
    var D = new BN(1);

    var g = 0;

    while (x.isEven() && y.isEven()) {
      x.iushrn(1);
      y.iushrn(1);
      ++g;
    }

    var yp = y.clone();
    var xp = x.clone();

    while (!x.isZero()) {
      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        x.iushrn(i);
        while (i-- > 0) {
          if (A.isOdd() || B.isOdd()) {
            A.iadd(yp);
            B.isub(xp);
          }

          A.iushrn(1);
          B.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        y.iushrn(j);
        while (j-- > 0) {
          if (C.isOdd() || D.isOdd()) {
            C.iadd(yp);
            D.isub(xp);
          }

          C.iushrn(1);
          D.iushrn(1);
        }
      }

      if (x.cmp(y) >= 0) {
        x.isub(y);
        A.isub(C);
        B.isub(D);
      } else {
        y.isub(x);
        C.isub(A);
        D.isub(B);
      }
    }

    return {
      a: C,
      b: D,
      gcd: y.iushln(g)
    };
  };

  // This is reduced incarnation of the binary EEA
  // above, designated to invert members of the
  // _prime_ fields F(p) at a maximal speed
  BN.prototype._invmp = function _invmp (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var a = this;
    var b = p.clone();

    if (a.negative !== 0) {
      a = a.umod(p);
    } else {
      a = a.clone();
    }

    var x1 = new BN(1);
    var x2 = new BN(0);

    var delta = b.clone();

    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        a.iushrn(i);
        while (i-- > 0) {
          if (x1.isOdd()) {
            x1.iadd(delta);
          }

          x1.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        b.iushrn(j);
        while (j-- > 0) {
          if (x2.isOdd()) {
            x2.iadd(delta);
          }

          x2.iushrn(1);
        }
      }

      if (a.cmp(b) >= 0) {
        a.isub(b);
        x1.isub(x2);
      } else {
        b.isub(a);
        x2.isub(x1);
      }
    }

    var res;
    if (a.cmpn(1) === 0) {
      res = x1;
    } else {
      res = x2;
    }

    if (res.cmpn(0) < 0) {
      res.iadd(p);
    }

    return res;
  };

  BN.prototype.gcd = function gcd (num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();

    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;

    // Remove common factor of two
    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
      a.iushrn(1);
      b.iushrn(1);
    }

    do {
      while (a.isEven()) {
        a.iushrn(1);
      }
      while (b.isEven()) {
        b.iushrn(1);
      }

      var r = a.cmp(b);
      if (r < 0) {
        // Swap `a` and `b` to make `a` always bigger than `b`
        var t = a;
        a = b;
        b = t;
      } else if (r === 0 || b.cmpn(1) === 0) {
        break;
      }

      a.isub(b);
    } while (true);

    return b.iushln(shift);
  };

  // Invert number in the field F(num)
  BN.prototype.invm = function invm (num) {
    return this.egcd(num).a.umod(num);
  };

  BN.prototype.isEven = function isEven () {
    return (this.words[0] & 1) === 0;
  };

  BN.prototype.isOdd = function isOdd () {
    return (this.words[0] & 1) === 1;
  };

  // And first word and num
  BN.prototype.andln = function andln (num) {
    return this.words[0] & num;
  };

  // Increment at the bit position in-line
  BN.prototype.bincn = function bincn (bit) {
    assert(typeof bit === 'number');
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) {
      this._expand(s + 1);
      this.words[s] |= q;
      return this;
    }

    // Add bit and propagate, if needed
    var carry = q;
    for (var i = s; carry !== 0 && i < this.length; i++) {
      var w = this.words[i] | 0;
      w += carry;
      carry = w >>> 26;
      w &= 0x3ffffff;
      this.words[i] = w;
    }
    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }
    return this;
  };

  BN.prototype.isZero = function isZero () {
    return this.length === 1 && this.words[0] === 0;
  };

  BN.prototype.cmpn = function cmpn (num) {
    var negative = num < 0;

    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;

    this.strip();

    var res;
    if (this.length > 1) {
      res = 1;
    } else {
      if (negative) {
        num = -num;
      }

      assert(num <= 0x3ffffff, 'Number is too big');

      var w = this.words[0] | 0;
      res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Compare two numbers and return:
  // 1 - if `this` > `num`
  // 0 - if `this` == `num`
  // -1 - if `this` < `num`
  BN.prototype.cmp = function cmp (num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;

    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Unsigned comparison
  BN.prototype.ucmp = function ucmp (num) {
    // At this point both numbers have the same sign
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;

    var res = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var a = this.words[i] | 0;
      var b = num.words[i] | 0;

      if (a === b) continue;
      if (a < b) {
        res = -1;
      } else if (a > b) {
        res = 1;
      }
      break;
    }
    return res;
  };

  BN.prototype.gtn = function gtn (num) {
    return this.cmpn(num) === 1;
  };

  BN.prototype.gt = function gt (num) {
    return this.cmp(num) === 1;
  };

  BN.prototype.gten = function gten (num) {
    return this.cmpn(num) >= 0;
  };

  BN.prototype.gte = function gte (num) {
    return this.cmp(num) >= 0;
  };

  BN.prototype.ltn = function ltn (num) {
    return this.cmpn(num) === -1;
  };

  BN.prototype.lt = function lt (num) {
    return this.cmp(num) === -1;
  };

  BN.prototype.lten = function lten (num) {
    return this.cmpn(num) <= 0;
  };

  BN.prototype.lte = function lte (num) {
    return this.cmp(num) <= 0;
  };

  BN.prototype.eqn = function eqn (num) {
    return this.cmpn(num) === 0;
  };

  BN.prototype.eq = function eq (num) {
    return this.cmp(num) === 0;
  };

  //
  // A reduce context, could be using montgomery or something better, depending
  // on the `m` itself.
  //
  BN.red = function red (num) {
    return new Red(num);
  };

  BN.prototype.toRed = function toRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    assert(this.negative === 0, 'red works only with positives');
    return ctx.convertTo(this)._forceRed(ctx);
  };

  BN.prototype.fromRed = function fromRed () {
    assert(this.red, 'fromRed works only with numbers in reduction context');
    return this.red.convertFrom(this);
  };

  BN.prototype._forceRed = function _forceRed (ctx) {
    this.red = ctx;
    return this;
  };

  BN.prototype.forceRed = function forceRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    return this._forceRed(ctx);
  };

  BN.prototype.redAdd = function redAdd (num) {
    assert(this.red, 'redAdd works only with red numbers');
    return this.red.add(this, num);
  };

  BN.prototype.redIAdd = function redIAdd (num) {
    assert(this.red, 'redIAdd works only with red numbers');
    return this.red.iadd(this, num);
  };

  BN.prototype.redSub = function redSub (num) {
    assert(this.red, 'redSub works only with red numbers');
    return this.red.sub(this, num);
  };

  BN.prototype.redISub = function redISub (num) {
    assert(this.red, 'redISub works only with red numbers');
    return this.red.isub(this, num);
  };

  BN.prototype.redShl = function redShl (num) {
    assert(this.red, 'redShl works only with red numbers');
    return this.red.shl(this, num);
  };

  BN.prototype.redMul = function redMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.mul(this, num);
  };

  BN.prototype.redIMul = function redIMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.imul(this, num);
  };

  BN.prototype.redSqr = function redSqr () {
    assert(this.red, 'redSqr works only with red numbers');
    this.red._verify1(this);
    return this.red.sqr(this);
  };

  BN.prototype.redISqr = function redISqr () {
    assert(this.red, 'redISqr works only with red numbers');
    this.red._verify1(this);
    return this.red.isqr(this);
  };

  // Square root over p
  BN.prototype.redSqrt = function redSqrt () {
    assert(this.red, 'redSqrt works only with red numbers');
    this.red._verify1(this);
    return this.red.sqrt(this);
  };

  BN.prototype.redInvm = function redInvm () {
    assert(this.red, 'redInvm works only with red numbers');
    this.red._verify1(this);
    return this.red.invm(this);
  };

  // Return negative clone of `this` % `red modulo`
  BN.prototype.redNeg = function redNeg () {
    assert(this.red, 'redNeg works only with red numbers');
    this.red._verify1(this);
    return this.red.neg(this);
  };

  BN.prototype.redPow = function redPow (num) {
    assert(this.red && !num.red, 'redPow(normalNum)');
    this.red._verify1(this);
    return this.red.pow(this, num);
  };

  // Prime numbers with efficient reduction
  var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
  };

  // Pseudo-Mersenne prime
  function MPrime (name, p) {
    // P = 2 ^ N - K
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);

    this.tmp = this._tmp();
  }

  MPrime.prototype._tmp = function _tmp () {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
  };

  MPrime.prototype.ireduce = function ireduce (num) {
    // Assumes that `num` is less than `P^2`
    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
    var r = num;
    var rlen;

    do {
      this.split(r, this.tmp);
      r = this.imulK(r);
      r = r.iadd(this.tmp);
      rlen = r.bitLength();
    } while (rlen > this.n);

    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
      r.words[0] = 0;
      r.length = 1;
    } else if (cmp > 0) {
      r.isub(this.p);
    } else {
      if (r.strip !== undefined) {
        // r is BN v4 instance
        r.strip();
      } else {
        // r is BN v5 instance
        r._strip();
      }
    }

    return r;
  };

  MPrime.prototype.split = function split (input, out) {
    input.iushrn(this.n, 0, out);
  };

  MPrime.prototype.imulK = function imulK (num) {
    return num.imul(this.k);
  };

  function K256 () {
    MPrime.call(
      this,
      'k256',
      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
  }
  inherits(K256, MPrime);

  K256.prototype.split = function split (input, output) {
    // 256 = 9 * 26 + 22
    var mask = 0x3fffff;

    var outLen = Math.min(input.length, 9);
    for (var i = 0; i < outLen; i++) {
      output.words[i] = input.words[i];
    }
    output.length = outLen;

    if (input.length <= 9) {
      input.words[0] = 0;
      input.length = 1;
      return;
    }

    // Shift by 9 limbs
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;

    for (i = 10; i < input.length; i++) {
      var next = input.words[i] | 0;
      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
      prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
      input.length -= 10;
    } else {
      input.length -= 9;
    }
  };

  K256.prototype.imulK = function imulK (num) {
    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;

    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
    var lo = 0;
    for (var i = 0; i < num.length; i++) {
      var w = num.words[i] | 0;
      lo += w * 0x3d1;
      num.words[i] = lo & 0x3ffffff;
      lo = w * 0x40 + ((lo / 0x4000000) | 0);
    }

    // Fast length reduction
    if (num.words[num.length - 1] === 0) {
      num.length--;
      if (num.words[num.length - 1] === 0) {
        num.length--;
      }
    }
    return num;
  };

  function P224 () {
    MPrime.call(
      this,
      'p224',
      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
  }
  inherits(P224, MPrime);

  function P192 () {
    MPrime.call(
      this,
      'p192',
      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
  }
  inherits(P192, MPrime);

  function P25519 () {
    // 2 ^ 255 - 19
    MPrime.call(
      this,
      '25519',
      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
  }
  inherits(P25519, MPrime);

  P25519.prototype.imulK = function imulK (num) {
    // K = 0x13
    var carry = 0;
    for (var i = 0; i < num.length; i++) {
      var hi = (num.words[i] | 0) * 0x13 + carry;
      var lo = hi & 0x3ffffff;
      hi >>>= 26;

      num.words[i] = lo;
      carry = hi;
    }
    if (carry !== 0) {
      num.words[num.length++] = carry;
    }
    return num;
  };

  // Exported mostly for testing purposes, use plain name instead
  BN._prime = function prime (name) {
    // Cached version of prime
    if (primes[name]) return primes[name];

    var prime;
    if (name === 'k256') {
      prime = new K256();
    } else if (name === 'p224') {
      prime = new P224();
    } else if (name === 'p192') {
      prime = new P192();
    } else if (name === 'p25519') {
      prime = new P25519();
    } else {
      throw new Error('Unknown prime ' + name);
    }
    primes[name] = prime;

    return prime;
  };

  //
  // Base reduction engine
  //
  function Red (m) {
    if (typeof m === 'string') {
      var prime = BN._prime(m);
      this.m = prime.p;
      this.prime = prime;
    } else {
      assert(m.gtn(1), 'modulus must be greater than 1');
      this.m = m;
      this.prime = null;
    }
  }

  Red.prototype._verify1 = function _verify1 (a) {
    assert(a.negative === 0, 'red works only with positives');
    assert(a.red, 'red works only with red numbers');
  };

  Red.prototype._verify2 = function _verify2 (a, b) {
    assert((a.negative | b.negative) === 0, 'red works only with positives');
    assert(a.red && a.red === b.red,
      'red works only with red numbers');
  };

  Red.prototype.imod = function imod (a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
    return a.umod(this.m)._forceRed(this);
  };

  Red.prototype.neg = function neg (a) {
    if (a.isZero()) {
      return a.clone();
    }

    return this.m.sub(a)._forceRed(this);
  };

  Red.prototype.add = function add (a, b) {
    this._verify2(a, b);

    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.iadd = function iadd (a, b) {
    this._verify2(a, b);

    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res;
  };

  Red.prototype.sub = function sub (a, b) {
    this._verify2(a, b);

    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.isub = function isub (a, b) {
    this._verify2(a, b);

    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res;
  };

  Red.prototype.shl = function shl (a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
  };

  Red.prototype.imul = function imul (a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
  };

  Red.prototype.mul = function mul (a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
  };

  Red.prototype.isqr = function isqr (a) {
    return this.imul(a, a.clone());
  };

  Red.prototype.sqr = function sqr (a) {
    return this.mul(a, a);
  };

  Red.prototype.sqrt = function sqrt (a) {
    if (a.isZero()) return a.clone();

    var mod3 = this.m.andln(3);
    assert(mod3 % 2 === 1);

    // Fast case
    if (mod3 === 3) {
      var pow = this.m.add(new BN(1)).iushrn(2);
      return this.pow(a, pow);
    }

    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
    //
    // Find Q and S, that Q * 2 ^ S = (P - 1)
    var q = this.m.subn(1);
    var s = 0;
    while (!q.isZero() && q.andln(1) === 0) {
      s++;
      q.iushrn(1);
    }
    assert(!q.isZero());

    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();

    // Find quadratic non-residue
    // NOTE: Max is such because of generalized Riemann hypothesis.
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);

    while (this.pow(z, lpow).cmp(nOne) !== 0) {
      z.redIAdd(nOne);
    }

    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while (t.cmp(one) !== 0) {
      var tmp = t;
      for (var i = 0; tmp.cmp(one) !== 0; i++) {
        tmp = tmp.redSqr();
      }
      assert(i < m);
      var b = this.pow(c, new BN(1).iushln(m - i - 1));

      r = r.redMul(b);
      c = b.redSqr();
      t = t.redMul(c);
      m = i;
    }

    return r;
  };

  Red.prototype.invm = function invm (a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
      inv.negative = 0;
      return this.imod(inv).redNeg();
    } else {
      return this.imod(inv);
    }
  };

  Red.prototype.pow = function pow (a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();

    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for (var i = 2; i < wnd.length; i++) {
      wnd[i] = this.mul(wnd[i - 1], a);
    }

    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
      start = 26;
    }

    for (i = num.length - 1; i >= 0; i--) {
      var word = num.words[i];
      for (var j = start - 1; j >= 0; j--) {
        var bit = (word >> j) & 1;
        if (res !== wnd[0]) {
          res = this.sqr(res);
        }

        if (bit === 0 && current === 0) {
          currentLen = 0;
          continue;
        }

        current <<= 1;
        current |= bit;
        currentLen++;
        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

        res = this.mul(res, wnd[current]);
        currentLen = 0;
        current = 0;
      }
      start = 26;
    }

    return res;
  };

  Red.prototype.convertTo = function convertTo (num) {
    var r = num.umod(this.m);

    return r === num ? r.clone() : r;
  };

  Red.prototype.convertFrom = function convertFrom (num) {
    var res = num.clone();
    res.red = null;
    return res;
  };

  //
  // Montgomery method engine
  //

  BN.mont = function mont (num) {
    return new Mont(num);
  };

  function Mont (m) {
    Red.call(this, m);

    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
      this.shift += 26 - (this.shift % 26);
    }

    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);

    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
  }
  inherits(Mont, Red);

  Mont.prototype.convertTo = function convertTo (num) {
    return this.imod(num.ushln(this.shift));
  };

  Mont.prototype.convertFrom = function convertFrom (num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
  };

  Mont.prototype.imul = function imul (a, b) {
    if (a.isZero() || b.isZero()) {
      a.words[0] = 0;
      a.length = 1;
      return a;
    }

    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;

    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.mul = function mul (a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.invm = function invm (a) {
    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
  };
})(typeof module === 'undefined' || module, this);

},{"buffer":15}],15:[function(require,module,exports){

},{}],16:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":12,"buffer":16,"ieee754":18}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],18:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],19:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLength = exports.decode = exports.encode = void 0;
var BN = require("bn.js");
/**
 * RLP Encoding based on: https://github.com/ethereum/wiki/wiki/%5BEnglish%5D-RLP
 * This function takes in a data, convert it to buffer if not, and a length for recursion
 * @param input - will be converted to buffer
 * @returns returns buffer of encoded data
 **/
function encode(input) {
    if (Array.isArray(input)) {
        var output = [];
        for (var i = 0; i < input.length; i++) {
            output.push(encode(input[i]));
        }
        var buf = Buffer.concat(output);
        return Buffer.concat([encodeLength(buf.length, 192), buf]);
    }
    else {
        var inputBuf = toBuffer(input);
        return inputBuf.length === 1 && inputBuf[0] < 128
            ? inputBuf
            : Buffer.concat([encodeLength(inputBuf.length, 128), inputBuf]);
    }
}
exports.encode = encode;
/**
 * Parse integers. Check if there is no leading zeros
 * @param v The value to parse
 * @param base The base to parse the integer into
 */
function safeParseInt(v, base) {
    if (v.slice(0, 2) === '00') {
        throw new Error('invalid RLP: extra zeros');
    }
    return parseInt(v, base);
}
function encodeLength(len, offset) {
    if (len < 56) {
        return Buffer.from([len + offset]);
    }
    else {
        var hexLength = intToHex(len);
        var lLength = hexLength.length / 2;
        var firstByte = intToHex(offset + 55 + lLength);
        return Buffer.from(firstByte + hexLength, 'hex');
    }
}
function decode(input, stream) {
    if (stream === void 0) { stream = false; }
    if (!input || input.length === 0) {
        return Buffer.from([]);
    }
    var inputBuffer = toBuffer(input);
    var decoded = _decode(inputBuffer);
    if (stream) {
        return decoded;
    }
    if (decoded.remainder.length !== 0) {
        throw new Error('invalid remainder');
    }
    return decoded.data;
}
exports.decode = decode;
/**
 * Get the length of the RLP input
 * @param input
 * @returns The length of the input or an empty Buffer if no input
 */
function getLength(input) {
    if (!input || input.length === 0) {
        return Buffer.from([]);
    }
    var inputBuffer = toBuffer(input);
    var firstByte = inputBuffer[0];
    if (firstByte <= 0x7f) {
        return inputBuffer.length;
    }
    else if (firstByte <= 0xb7) {
        return firstByte - 0x7f;
    }
    else if (firstByte <= 0xbf) {
        return firstByte - 0xb6;
    }
    else if (firstByte <= 0xf7) {
        // a list between  0-55 bytes long
        return firstByte - 0xbf;
    }
    else {
        // a list  over 55 bytes long
        var llength = firstByte - 0xf6;
        var length = safeParseInt(inputBuffer.slice(1, llength).toString('hex'), 16);
        return llength + length;
    }
}
exports.getLength = getLength;
/** Decode an input with RLP */
function _decode(input) {
    var length, llength, data, innerRemainder, d;
    var decoded = [];
    var firstByte = input[0];
    if (firstByte <= 0x7f) {
        // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
        return {
            data: input.slice(0, 1),
            remainder: input.slice(1),
        };
    }
    else if (firstByte <= 0xb7) {
        // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
        // The range of the first byte is [0x80, 0xb7]
        length = firstByte - 0x7f;
        // set 0x80 null to 0
        if (firstByte === 0x80) {
            data = Buffer.from([]);
        }
        else {
            data = input.slice(1, length);
        }
        if (length === 2 && data[0] < 0x80) {
            throw new Error('invalid rlp encoding: byte must be less 0x80');
        }
        return {
            data: data,
            remainder: input.slice(length),
        };
    }
    else if (firstByte <= 0xbf) {
        // string is greater than 55 bytes long. A single byte with the value (0xb7 plus the length of the length),
        // followed by the length, followed by the string
        llength = firstByte - 0xb6;
        if (input.length - 1 < llength) {
            throw new Error('invalid RLP: not enough bytes for string length');
        }
        length = safeParseInt(input.slice(1, llength).toString('hex'), 16);
        if (length <= 55) {
            throw new Error('invalid RLP: expected string length to be greater than 55');
        }
        data = input.slice(llength, length + llength);
        if (data.length < length) {
            throw new Error('invalid RLP: not enough bytes for string');
        }
        return {
            data: data,
            remainder: input.slice(length + llength),
        };
    }
    else if (firstByte <= 0xf7) {
        // a list between  0-55 bytes long
        length = firstByte - 0xbf;
        innerRemainder = input.slice(1, length);
        while (innerRemainder.length) {
            d = _decode(innerRemainder);
            decoded.push(d.data);
            innerRemainder = d.remainder;
        }
        return {
            data: decoded,
            remainder: input.slice(length),
        };
    }
    else {
        // a list  over 55 bytes long
        llength = firstByte - 0xf6;
        length = safeParseInt(input.slice(1, llength).toString('hex'), 16);
        var totalLength = llength + length;
        if (totalLength > input.length) {
            throw new Error('invalid rlp: total length is larger than the data');
        }
        innerRemainder = input.slice(llength, totalLength);
        if (innerRemainder.length === 0) {
            throw new Error('invalid rlp, List has a invalid length');
        }
        while (innerRemainder.length) {
            d = _decode(innerRemainder);
            decoded.push(d.data);
            innerRemainder = d.remainder;
        }
        return {
            data: decoded,
            remainder: input.slice(totalLength),
        };
    }
}
/** Check if a string is prefixed by 0x */
function isHexPrefixed(str) {
    return str.slice(0, 2) === '0x';
}
/** Removes 0x from a given String */
function stripHexPrefix(str) {
    if (typeof str !== 'string') {
        return str;
    }
    return isHexPrefixed(str) ? str.slice(2) : str;
}
/** Transform an integer into its hexadecimal value */
function intToHex(integer) {
    if (integer < 0) {
        throw new Error('Invalid integer as argument, must be unsigned!');
    }
    var hex = integer.toString(16);
    return hex.length % 2 ? "0" + hex : hex;
}
/** Pad a string to be even */
function padToEven(a) {
    return a.length % 2 ? "0" + a : a;
}
/** Transform an integer into a Buffer */
function intToBuffer(integer) {
    var hex = intToHex(integer);
    return Buffer.from(hex, 'hex');
}
/** Transform anything into a Buffer */
function toBuffer(v) {
    if (!Buffer.isBuffer(v)) {
        if (typeof v === 'string') {
            if (isHexPrefixed(v)) {
                return Buffer.from(padToEven(stripHexPrefix(v)), 'hex');
            }
            else {
                return Buffer.from(v);
            }
        }
        else if (typeof v === 'number' || typeof v === 'bigint') {
            if (!v) {
                return Buffer.from([]);
            }
            else {
                return intToBuffer(v);
            }
        }
        else if (v === null || v === undefined) {
            return Buffer.from([]);
        }
        else if (v instanceof Uint8Array) {
            return Buffer.from(v);
        }
        else if (BN.isBN(v)) {
            // converts a BN to a Buffer
            return Buffer.from(v.toArray());
        }
        else {
            throw new Error('invalid type');
        }
    }
    return v;
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"bn.js":14,"buffer":16}],20:[function(require,module,exports){
'use strict';
module.exports = require( './lib/u2f-api' );
},{"./lib/u2f-api":22}],21:[function(require,module,exports){
// Copyright 2014 Google Inc. All rights reserved
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

/**
 * @fileoverview The U2F api.
 */

'use strict';

/** Namespace for the U2F api.
 * @type {Object}
 */
var u2f = u2f || {};

module.exports = u2f; // Adaptation for u2f-api package

/**
 * The U2F extension id
 * @type {string}
 * @const
 */
u2f.EXTENSION_ID = 'kmendfapggjehodndflmmgagdbamhnfd';

/**
 * Message types for messsages to/from the extension
 * @const
 * @enum {string}
 */
u2f.MessageTypes = {
  'U2F_REGISTER_REQUEST': 'u2f_register_request',
  'U2F_SIGN_REQUEST': 'u2f_sign_request',
  'U2F_REGISTER_RESPONSE': 'u2f_register_response',
  'U2F_SIGN_RESPONSE': 'u2f_sign_response'
};

/**
 * Response status codes
 * @const
 * @enum {number}
 */
u2f.ErrorCodes = {
  'OK': 0,
  'OTHER_ERROR': 1,
  'BAD_REQUEST': 2,
  'CONFIGURATION_UNSUPPORTED': 3,
  'DEVICE_INELIGIBLE': 4,
  'TIMEOUT': 5
};

/**
 * A message type for registration requests
 * @typedef {{
 *   type: u2f.MessageTypes,
 *   signRequests: Array.<u2f.SignRequest>,
 *   registerRequests: ?Array.<u2f.RegisterRequest>,
 *   timeoutSeconds: ?number,
 *   requestId: ?number
 * }}
 */
u2f.Request;

/**
 * A message for registration responses
 * @typedef {{
 *   type: u2f.MessageTypes,
 *   responseData: (u2f.Error | u2f.RegisterResponse | u2f.SignResponse),
 *   requestId: ?number
 * }}
 */
u2f.Response;

/**
 * An error object for responses
 * @typedef {{
 *   errorCode: u2f.ErrorCodes,
 *   errorMessage: ?string
 * }}
 */
u2f.Error;

/**
 * Data object for a single sign request.
 * @typedef {{
 *   version: string,
 *   challenge: string,
 *   keyHandle: string,
 *   appId: string
 * }}
 */
u2f.SignRequest;

/**
 * Data object for a sign response.
 * @typedef {{
 *   keyHandle: string,
 *   signatureData: string,
 *   clientData: string
 * }}
 */
u2f.SignResponse;

/**
 * Data object for a registration request.
 * @typedef {{
 *   version: string,
 *   challenge: string,
 *   appId: string
 * }}
 */
u2f.RegisterRequest;

/**
 * Data object for a registration response.
 * @typedef {{
 *   registrationData: string,
 *   clientData: string
 * }}
 */
u2f.RegisterResponse;


// Low level MessagePort API support

/**
 * Call MessagePort disconnect
 */
u2f.disconnect = function() {
  if (u2f.port_ && u2f.port_.port_) {
    u2f.port_.port_.disconnect();
    u2f.port_ = null;
  }
};

/**
 * Sets up a MessagePort to the U2F extension using the
 * available mechanisms.
 * @param {function((MessagePort|u2f.WrappedChromeRuntimePort_))} callback
 */
u2f.getMessagePort = function(callback) {
  if (typeof chrome != 'undefined' && chrome.runtime) {
    // The actual message here does not matter, but we need to get a reply
    // for the callback to run. Thus, send an empty signature request
    // in order to get a failure response.
    var msg = {
      type: u2f.MessageTypes.U2F_SIGN_REQUEST,
      signRequests: []
    };
    chrome.runtime.sendMessage(u2f.EXTENSION_ID, msg, function() {
      if (!chrome.runtime.lastError) {
        // We are on a whitelisted origin and can talk directly
        // with the extension.
        u2f.getChromeRuntimePort_(callback);
      } else {
        // chrome.runtime was available, but we couldn't message
        // the extension directly, use iframe
        u2f.getIframePort_(callback);
      }
    });
  } else {
    // chrome.runtime was not available at all, which is normal
    // when this origin doesn't have access to any extensions.
    u2f.getIframePort_(callback);
  }
};

/**
 * Connects directly to the extension via chrome.runtime.connect
 * @param {function(u2f.WrappedChromeRuntimePort_)} callback
 * @private
 */
u2f.getChromeRuntimePort_ = function(callback) {
  var port = chrome.runtime.connect(u2f.EXTENSION_ID,
    {'includeTlsChannelId': true});
  setTimeout(function() {
    callback(null, new u2f.WrappedChromeRuntimePort_(port));
  }, 0);
};

/**
 * A wrapper for chrome.runtime.Port that is compatible with MessagePort.
 * @param {Port} port
 * @constructor
 * @private
 */
u2f.WrappedChromeRuntimePort_ = function(port) {
  this.port_ = port;
};

/**
 * Posts a message on the underlying channel.
 * @param {Object} message
 */
u2f.WrappedChromeRuntimePort_.prototype.postMessage = function(message) {
  this.port_.postMessage(message);
};

/**
 * Emulates the HTML 5 addEventListener interface. Works only for the
 * onmessage event, which is hooked up to the chrome.runtime.Port.onMessage.
 * @param {string} eventName
 * @param {function({data: Object})} handler
 */
u2f.WrappedChromeRuntimePort_.prototype.addEventListener =
    function(eventName, handler) {
  var name = eventName.toLowerCase();
  if (name == 'message' || name == 'onmessage') {
    this.port_.onMessage.addListener(function(message) {
      // Emulate a minimal MessageEvent object
      handler({'data': message});
    });
  } else {
    console.error('WrappedChromeRuntimePort only supports onMessage');
  }
};

/**
 * Sets up an embedded trampoline iframe, sourced from the extension.
 * @param {function(MessagePort)} callback
 * @private
 */
u2f.getIframePort_ = function(callback) {
  // Create the iframe
  var iframeOrigin = 'chrome-extension://' + u2f.EXTENSION_ID;
  var iframe = document.createElement('iframe');
  iframe.src = iframeOrigin + '/u2f-comms.html';
  iframe.setAttribute('style', 'display:none');
  document.body.appendChild(iframe);

  var hasCalledBack = false;

  var channel = new MessageChannel();
  var ready = function(message) {
    if (message.data == 'ready') {
      channel.port1.removeEventListener('message', ready);
      if (!hasCalledBack)
      {
        hasCalledBack = true;
        callback(null, channel.port1);
      }
    } else {
      console.error('First event on iframe port was not "ready"');
    }
  };
  channel.port1.addEventListener('message', ready);
  channel.port1.start();

  iframe.addEventListener('load', function() {
    // Deliver the port to the iframe and initialize
    iframe.contentWindow.postMessage('init', iframeOrigin, [channel.port2]);
  });

  // Give this 200ms to initialize, after that, we treat this method as failed
  setTimeout(function() {
    if (!hasCalledBack)
    {
      hasCalledBack = true;
      callback(new Error("IFrame extension not supported"));
    }
  }, 200);
};


// High-level JS API

/**
 * Default extension response timeout in seconds.
 * @const
 */
u2f.EXTENSION_TIMEOUT_SEC = 30;

/**
 * A singleton instance for a MessagePort to the extension.
 * @type {MessagePort|u2f.WrappedChromeRuntimePort_}
 * @private
 */
u2f.port_ = null;

/**
 * Callbacks waiting for a port
 * @type {Array.<function((MessagePort|u2f.WrappedChromeRuntimePort_))>}
 * @private
 */
u2f.waitingForPort_ = [];

/**
 * A counter for requestIds.
 * @type {number}
 * @private
 */
u2f.reqCounter_ = 0;

/**
 * A map from requestIds to client callbacks
 * @type {Object.<number,(function((u2f.Error|u2f.RegisterResponse))
 *                       |function((u2f.Error|u2f.SignResponse)))>}
 * @private
 */
u2f.callbackMap_ = {};

/**
 * Creates or retrieves the MessagePort singleton to use.
 * @param {function((MessagePort|u2f.WrappedChromeRuntimePort_))} callback
 * @private
 */
u2f.getPortSingleton_ = function(callback) {
  if (u2f.port_) {
    callback(null, u2f.port_);
  } else {
    if (u2f.waitingForPort_.length == 0) {
      u2f.getMessagePort(function(err, port) {
        if (!err) {
          u2f.port_ = port;
          u2f.port_.addEventListener('message',
            /** @type {function(Event)} */ (u2f.responseHandler_));
        }

        // Careful, here be async callbacks. Maybe.
        while (u2f.waitingForPort_.length)
          u2f.waitingForPort_.shift()(err, port);
      });
    }
    u2f.waitingForPort_.push(callback);
  }
};

/**
 * Handles response messages from the extension.
 * @param {MessageEvent.<u2f.Response>} message
 * @private
 */
u2f.responseHandler_ = function(message) {
  var response = message.data;
  var reqId = response['requestId'];
  if (!reqId || !u2f.callbackMap_[reqId]) {
    console.error('Unknown or missing requestId in response.');
    return;
  }
  var cb = u2f.callbackMap_[reqId];
  delete u2f.callbackMap_[reqId];
  cb(null, response['responseData']);
};

/**
 * Calls the callback with true or false as first and only argument
 * @param {Function} callback
 */
u2f.isSupported = function(callback) {
  u2f.getPortSingleton_(function(err, port) {
    callback(!err);
  });
}

/**
 * Dispatches an array of sign requests to available U2F tokens.
 * @param {Array.<u2f.SignRequest>} signRequests
 * @param {function((u2f.Error|u2f.SignResponse))} callback
 * @param {number=} opt_timeoutSeconds
 */
u2f.sign = function(signRequests, callback, opt_timeoutSeconds) {
  u2f.getPortSingleton_(function(err, port) {
    if (err)
      return callback(err);

    var reqId = ++u2f.reqCounter_;
    u2f.callbackMap_[reqId] = callback;
    var req = {
      type: u2f.MessageTypes.U2F_SIGN_REQUEST,
      signRequests: signRequests,
      timeoutSeconds: (typeof opt_timeoutSeconds !== 'undefined' ?
        opt_timeoutSeconds : u2f.EXTENSION_TIMEOUT_SEC),
      requestId: reqId
    };
    port.postMessage(req);
  });
};

/**
 * Dispatches register requests to available U2F tokens. An array of sign
 * requests identifies already registered tokens.
 * @param {Array.<u2f.RegisterRequest>} registerRequests
 * @param {Array.<u2f.SignRequest>} signRequests
 * @param {function((u2f.Error|u2f.RegisterResponse))} callback
 * @param {number=} opt_timeoutSeconds
 */
u2f.register = function(registerRequests, signRequests,
    callback, opt_timeoutSeconds) {
  u2f.getPortSingleton_(function(err, port) {
    if (err)
      return callback(err);

    var reqId = ++u2f.reqCounter_;
    u2f.callbackMap_[reqId] = callback;
    var req = {
      type: u2f.MessageTypes.U2F_REGISTER_REQUEST,
      signRequests: signRequests,
      registerRequests: registerRequests,
      timeoutSeconds: (typeof opt_timeoutSeconds !== 'undefined' ?
        opt_timeoutSeconds : u2f.EXTENSION_TIMEOUT_SEC),
      requestId: reqId
    };
    port.postMessage(req);
  });
};

},{}],22:[function(require,module,exports){
(function (global){(function (){
'use strict';

module.exports = API;

var chromeApi = require( './google-u2f-api' );

// Feature detection (yes really)
var isBrowser = ( typeof navigator !== 'undefined' ) && !!navigator.userAgent;
var isSafari = isBrowser && navigator.userAgent.match( /Safari\// )
	&& !navigator.userAgent.match( /Chrome\// );
var isEDGE = isBrowser && navigator.userAgent.match( /Edge\/1[2345]/ );

var _backend = null;
function getBackend( Promise )
{
	if ( !_backend )
		_backend = new Promise( function( resolve, reject )
		{
			function notSupported( )
			{
				// Note; {native: true} means *not* using Google's hack
				resolve( { u2f: null, native: true } );
			}

			if ( !isBrowser )
				return notSupported( );

			if ( isSafari )
				// Safari doesn't support U2F, and the Safari-FIDO-U2F
				// extension lacks full support (Multi-facet apps), so we
				// block it until proper support.
				return notSupported( );

			var hasNativeSupport =
				( typeof window.u2f !== 'undefined' ) &&
				( typeof window.u2f.sign === 'function' );

			if ( hasNativeSupport )
				resolve( { u2f: window.u2f, native: true } );

			if ( isEDGE )
				// We don't want to check for Google's extension hack on EDGE
				// as it'll cause trouble (popups, etc)
				return notSupported( );

			if ( location.protocol === 'http:' )
				// U2F isn't supported over http, only https
				return notSupported( );

			if ( typeof MessageChannel === 'undefined' )
				// Unsupported browser, the chrome hack would throw
				return notSupported( );

			// Test for google extension support
			chromeApi.isSupported( function( ok )
			{
				if ( ok )
					resolve( { u2f: chromeApi, native: false } );
				else
					notSupported( );
			} );
		} );

	return _backend;
}

function API( Promise )
{
	return {
		isSupported   : isSupported.bind( Promise ),
		ensureSupport : ensureSupport.bind( Promise ),
		register      : register.bind( Promise ),
		sign          : sign.bind( Promise ),
		ErrorCodes    : API.ErrorCodes,
		ErrorNames    : API.ErrorNames
	};
}

API.ErrorCodes = {
	CANCELLED: -1,
	OK: 0,
	OTHER_ERROR: 1,
	BAD_REQUEST: 2,
	CONFIGURATION_UNSUPPORTED: 3,
	DEVICE_INELIGIBLE: 4,
	TIMEOUT: 5
};
API.ErrorNames = {
	"-1": "CANCELLED",
	"0": "OK",
	"1": "OTHER_ERROR",
	"2": "BAD_REQUEST",
	"3": "CONFIGURATION_UNSUPPORTED",
	"4": "DEVICE_INELIGIBLE",
	"5": "TIMEOUT"
};

function makeError( msg, err )
{
	var code = err != null ? err.errorCode : 1; // Default to OTHER_ERROR
	var type = API.ErrorNames[ '' + code ];
	var error = new Error( msg );
	error.metaData = {
		type: type,
		code: code
	}
	return error;
}

function deferPromise( Promise, promise )
{
	var ret = { };
	ret.promise = new Promise( function( resolve, reject ) {
		ret.resolve = resolve;
		ret.reject = reject;
		promise.then( resolve, reject );
	} );
	/**
	 * Reject request promise and disconnect port if 'disconnect' flag is true
	 * @param {string} msg
	 * @param {boolean} disconnect
	 */
	ret.promise.cancel = function( msg, disconnect )
	{
		getBackend( Promise )
		.then( function( backend )
		{
			if ( disconnect && !backend.native )
				backend.u2f.disconnect( );

			ret.reject( makeError( msg, { errorCode: -1 } ) );
		} );
	};
	return ret;
}

function defer( Promise, fun )
{
	return deferPromise( Promise, new Promise( function( resolve, reject )
	{
		try
		{
			fun && fun( resolve, reject );
		}
		catch ( err )
		{
			reject( err );
		}
	} ) );
}

function isSupported( )
{
	var Promise = this;

	return getBackend( Promise )
	.then( function( backend )
	{
		return !!backend.u2f;
	} );
}

function _ensureSupport( backend )
{
	if ( !backend.u2f )
	{
		if ( location.protocol === 'http:' )
			throw new Error( "U2F isn't supported over http, only https" );
		throw new Error( "U2F not supported" );
	}
}

function ensureSupport( )
{
	var Promise = this;

	return getBackend( Promise )
	.then( _ensureSupport );
}

function register( registerRequests, signRequests /* = null */, timeout )
{
	var Promise = this;

	if ( !Array.isArray( registerRequests ) )
		registerRequests = [ registerRequests ];

	if ( typeof signRequests === 'number' && typeof timeout === 'undefined' )
	{
		timeout = signRequests;
		signRequests = null;
	}

	if ( !signRequests )
		signRequests = [ ];

	return deferPromise( Promise, getBackend( Promise )
	.then( function( backend )
	{
		_ensureSupport( backend );

		var native = backend.native;
		var u2f = backend.u2f;

		return new Promise( function( resolve, reject )
		{
			function cbNative( response )
			{
				if ( response.errorCode )
					reject( makeError( "Registration failed", response ) );
				else
				{
					delete response.errorCode;
					resolve( response );
				}
			}

			function cbChrome( err, response )
			{
				if ( err )
					reject( err );
				else if ( response.errorCode )
					reject( makeError( "Registration failed", response ) );
				else
					resolve( response );
			}

			if ( native )
			{
				var appId = registerRequests[ 0 ].appId;

				u2f.register(
					appId, registerRequests, signRequests, cbNative, timeout );
			}
			else
			{
				u2f.register(
					registerRequests, signRequests, cbChrome, timeout );
			}
		} );
	} ) ).promise;
}

function sign( signRequests, timeout )
{
	var Promise = this;

	if ( !Array.isArray( signRequests ) )
		signRequests = [ signRequests ];

	return deferPromise( Promise, getBackend( Promise )
	.then( function( backend )
	{
		_ensureSupport( backend );

		var native = backend.native;
		var u2f = backend.u2f;

		return new Promise( function( resolve, reject )
		{
			function cbNative( response )
			{
				if ( response.errorCode )
					reject( makeError( "Sign failed", response ) );
				else
				{
					delete response.errorCode;
					resolve( response );
				}
			}

			function cbChrome( err, response )
			{
				if ( err )
					reject( err );
				else if ( response.errorCode )
					reject( makeError( "Sign failed", response ) );
				else
					resolve( response );
			}

			if ( native )
			{
				var appId = signRequests[ 0 ].appId;
				var challenge = signRequests[ 0 ].challenge;

				u2f.sign( appId, challenge, signRequests, cbNative, timeout );
			}
			else
			{
				u2f.sign( signRequests, cbChrome, timeout );
			}
		} );
	} ) ).promise;
}

function makeDefault( func )
{
	API[ func ] = function( )
	{
		if ( !global.Promise )
			// This is very unlikely to ever happen, since browsers
			// supporting U2F will most likely support Promises.
			throw new Error( "The platform doesn't natively support promises" );

		var args = [ ].slice.call( arguments );
		return API( global.Promise )[ func ].apply( null, args );
	};
}

// Provide default functions using the built-in Promise if available.
makeDefault( 'isSupported' );
makeDefault( 'ensureSupport' );
makeDefault( 'register' );
makeDefault( 'sign' );

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./google-u2f-api":21}]},{},[2]);
