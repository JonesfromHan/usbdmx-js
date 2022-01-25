import * as HID from "node-hid";
import * as EventEmitter from "events";

export interface device_t {
  vendorId: number;
  productId: number;
  path: string;
  serialNumber: string;
}

export enum UsbDmxMode {
  Standby = 0,
  Pass = 1,
  PcOut = 2,
  PcOutMerge = 3,
  PcIn = 4,
  PassPcIn = 5,
  PcInPcOut = 6,
  PcOutMergePcIn = 7,
}

enum UsbDmxState {
  Running,
  Stopping,
  Stopped,
}

export class UsbDmx extends EventEmitter {
  private static openDevices: device_t[] = [];

  private device: HID.HID;

  private out: Buffer;
  private in: Buffer;
  private outChanges: Buffer;
  private outChanged: boolean;

  private currentMode: UsbDmxMode;
  private requestedMode: UsbDmxMode;

  private state: UsbDmxState;

  static GetAllOpenedInterfaces(): device_t[] {
    return this.openDevices;
  }

  static GetAllConnectedInterfaces(): device_t[] {
    const result: device_t[] = [];
    const devices: HID.Device[] = HID.devices();

    for (const dev of devices) {
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
  }

  public constructor(device: device_t | undefined, mode: UsbDmxMode) {
    super();

    if (device === undefined) {
      const devices = UsbDmx.GetAllConnectedInterfaces();

      if (devices.length === 0) {
        throw new Error("No interface found!");
      }

      device = devices[0];
    }

    if (UsbDmx.openDevices.includes(device)) {
      throw new Error("Device already opened!");
    }

    this.device = new HID.HID(device.path);

    this.device.on("data", this._Input);

    UsbDmx.openDevices.push(device);

    this.out = Buffer.alloc(512, 0);
    this.in = Buffer.alloc(512, 0);
    this.outChanges = Buffer.alloc(512, 0);
    this.outChanged = false;

    this._SetMode(mode);

    const request = Buffer.alloc(34, 0);
    for (let i = 0; i < 16; i++) {
      request.writeUInt8(i, 1);
      this.device.write(request);
    }

    this.currentMode = mode;
    this.requestedMode = mode;

    setTimeout(this._Worker, 10);

    this.state = UsbDmxState.Running;
  }

  private _Input = (data: any) => {
    if (data instanceof Buffer) {
      console.log(data);
    }
  };

  private _SetMode = (mode: UsbDmxMode) => {
    const request = Buffer.alloc(34, 0);

    request.writeUInt8(16, 1);
    request.writeUInt8(mode, 2);

    this.device.write(request);
  };

  private _Worker = () => {
    let inputReceived: boolean = false;

    if (this.state === UsbDmxState.Stopping) {
      this._SetMode(UsbDmxMode.Standby);
      this.device.close();
      this.state = UsbDmxState.Stopped;
      return;
    }

    if (this.currentMode !== this.requestedMode) {
      this._SetMode(UsbDmxMode.Standby);
      this.currentMode = this.requestedMode;
    }

    if (this.outChanged) {
      //Output buffer changed, write to device
      const request = Buffer.alloc(34);

      for (let i = 0; i < 16; i++) {
        const curPart: Buffer = this.out.slice(32 * i, 32 * (i + 1));
        const chaPart: Buffer = this.outChanges.slice(32 * i, 32 * (i + 1));
        if (Buffer.compare(curPart, chaPart) !== 0) {
          request.writeUInt8(0, 0);
          request.writeUInt8(i, 1);
          chaPart.copy(request, 2);
          this.device.write(request);
        }
      }

      this.outChanged = false;
      this.outChanges.copy(this.out);
    }

    setTimeout(() => {
      this._Worker();
    }, 10);
  };

  public SetChannel = (channel: number, value: number) => {
    if (channel < 1 || channel > 512) {
      throw new Error("DMX channel out of bound");
    }

    if (value < 0 || value > 255) {
      throw new Error("DMX value out of bound");
    }

    this.outChanges.writeUInt8(value, channel - 1);
    this.outChanged = true;
  };

  public SetInterfaceMode = (mode: UsbDmxMode) => {
    this.requestedMode = mode;
  };

  public Close = (cb: () => void | undefined) => {
    this.state = UsbDmxState.Stopping;

    if (cb !== undefined) {
      setTimeout(() => {
        cb();
      }, 50);
    }
  };
}
