/// <reference types="node" />
import * as EventEmitter from "events";
export interface device_t {
    vendorId: number;
    productId: number;
    path: string;
    serialNumber: string;
}
export declare enum UsbDmxMode {
    Standby = 0,
    Pass = 1,
    PcOut = 2,
    PcOutMerge = 3,
    PcIn = 4,
    PassPcIn = 5,
    PcInPcOut = 6,
    PcOutMergePcIn = 7
}
export declare class UsbDmx extends EventEmitter {
    private static openDevices;
    private device;
    private out;
    private in;
    private outChanges;
    private outChanged;
    private currentMode;
    private requestedMode;
    private state;
    static GetAllOpenedInterfaces(): device_t[];
    static GetAllConnectedInterfaces(): device_t[];
    constructor(device: device_t | undefined, mode: UsbDmxMode);
    private _Input;
    private _SetMode;
    private _Worker;
    SetChannel: (channel: number, value: number) => void;
    SetInterfaceMode: (mode: UsbDmxMode) => void;
    Close: (cb: () => void | undefined) => void;
}
