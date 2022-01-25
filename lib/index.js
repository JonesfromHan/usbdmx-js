"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbDmx = exports.UsbDmxMode = void 0;
var HID = require("node-hid");
var EventEmitter = require("events");
var UsbDmxMode;
(function (UsbDmxMode) {
    UsbDmxMode[UsbDmxMode["Standby"] = 0] = "Standby";
    UsbDmxMode[UsbDmxMode["Pass"] = 1] = "Pass";
    UsbDmxMode[UsbDmxMode["PcOut"] = 2] = "PcOut";
    UsbDmxMode[UsbDmxMode["PcOutMerge"] = 3] = "PcOutMerge";
    UsbDmxMode[UsbDmxMode["PcIn"] = 4] = "PcIn";
    UsbDmxMode[UsbDmxMode["PassPcIn"] = 5] = "PassPcIn";
    UsbDmxMode[UsbDmxMode["PcInPcOut"] = 6] = "PcInPcOut";
    UsbDmxMode[UsbDmxMode["PcOutMergePcIn"] = 7] = "PcOutMergePcIn";
})(UsbDmxMode = exports.UsbDmxMode || (exports.UsbDmxMode = {}));
var UsbDmxState;
(function (UsbDmxState) {
    UsbDmxState[UsbDmxState["Running"] = 0] = "Running";
    UsbDmxState[UsbDmxState["Stopping"] = 1] = "Stopping";
    UsbDmxState[UsbDmxState["Stopped"] = 2] = "Stopped";
})(UsbDmxState || (UsbDmxState = {}));
var UsbDmx = /** @class */ (function (_super) {
    __extends(UsbDmx, _super);
    function UsbDmx(device, mode) {
        var _this = _super.call(this) || this;
        _this._Input = function (data) {
            if (data instanceof Buffer) {
                console.log(data);
            }
        };
        _this._SetMode = function (mode) {
            var request = Buffer.alloc(34, 0);
            request.writeUInt8(16, 1);
            request.writeUInt8(mode, 2);
            _this.device.write(request);
        };
        _this._Worker = function () {
            var inputReceived = false;
            if (_this.state === UsbDmxState.Stopping) {
                _this._SetMode(UsbDmxMode.Standby);
                _this.device.close();
                _this.state = UsbDmxState.Stopped;
                return;
            }
            if (_this.currentMode !== _this.requestedMode) {
                _this._SetMode(UsbDmxMode.Standby);
                _this.currentMode = _this.requestedMode;
            }
            if (_this.outChanged) {
                //Output buffer changed, write to device
                var request = Buffer.alloc(34);
                for (var i = 0; i < 16; i++) {
                    var curPart = _this.out.slice(32 * i, 32 * (i + 1));
                    var chaPart = _this.outChanges.slice(32 * i, 32 * (i + 1));
                    if (Buffer.compare(curPart, chaPart) !== 0) {
                        request.writeUInt8(0, 0);
                        request.writeUInt8(i, 1);
                        chaPart.copy(request, 2);
                        _this.device.write(request);
                    }
                }
                _this.outChanged = false;
                _this.outChanges.copy(_this.out);
            }
            setTimeout(function () {
                _this._Worker();
            }, 10);
        };
        _this.SetChannel = function (channel, value) {
            if (channel < 1 || channel > 512) {
                throw new Error("DMX channel out of bound");
            }
            if (value < 0 || value > 255) {
                throw new Error("DMX value out of bound");
            }
            _this.outChanges.writeUInt8(value, channel - 1);
            _this.outChanged = true;
        };
        _this.SetInterfaceMode = function (mode) {
            _this.requestedMode = mode;
        };
        _this.Close = function (cb) {
            _this.state = UsbDmxState.Stopping;
            if (cb !== undefined) {
                setTimeout(function () {
                    cb();
                }, 50);
            }
        };
        if (device === undefined) {
            var devices = UsbDmx.GetAllConnectedInterfaces();
            if (devices.length === 0) {
                throw new Error("No interface found!");
            }
            device = devices[0];
        }
        if (UsbDmx.openDevices.includes(device)) {
            throw new Error("Device already opened!");
        }
        _this.device = new HID.HID(device.path);
        _this.device.on("data", _this._Input);
        UsbDmx.openDevices.push(device);
        _this.out = Buffer.alloc(512, 0);
        _this.in = Buffer.alloc(512, 0);
        _this.outChanges = Buffer.alloc(512, 0);
        _this.outChanged = false;
        _this._SetMode(mode);
        var request = Buffer.alloc(34, 0);
        for (var i = 0; i < 16; i++) {
            request.writeUInt8(i, 1);
            _this.device.write(request);
        }
        _this.currentMode = mode;
        _this.requestedMode = mode;
        setTimeout(_this._Worker, 10);
        _this.state = UsbDmxState.Running;
        return _this;
    }
    UsbDmx.GetAllOpenedInterfaces = function () {
        return this.openDevices;
    };
    UsbDmx.GetAllConnectedInterfaces = function () {
        var result = [];
        var devices = HID.devices();
        for (var _i = 0, devices_1 = devices; _i < devices_1.length; _i++) {
            var dev = devices_1[_i];
            if (dev.vendorId === 5840 && dev.productId === 2096) {
                if (dev.serialNumber !== undefined && dev.path !== undefined) {
                    result.push({
                        vendorId: dev.vendorId,
                        productId: dev.productId,
                        serialNumber: dev.serialNumber,
                        path: dev.path,
                    });
                }
            }
        }
        return result;
    };
    UsbDmx.openDevices = [];
    return UsbDmx;
}(EventEmitter));
exports.UsbDmx = UsbDmx;
