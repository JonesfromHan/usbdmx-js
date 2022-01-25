const { UsbDmx, UsbDmxMode } = require("./lib/index");
//const HID = require("node-hid");

const devices = UsbDmx.GetAllConnectedInterfaces();

const device = new UsbDmx(devices[0], UsbDmxMode.PcInPcOut);

let counter = 0;

setInterval(() => {
  device.SetChannel(1, counter);

  counter++;

  if (counter > 20) {
    device.Close(() => {
      process.exit(0);
    });
  }
}, 100);

/*var device = new HID.HID(devices[0].path);

device.on("data", (data) => {
  console.log(data);
  console.log(data.length);
});

const mode = Buffer.alloc(34, 0);
mode[1] = 16;
mode[2] = 6;

console.log("premode");

device.write(mode);

console.log("postmode");

const output = Buffer.alloc(34, 255);
output[0] = 0;

for (let i = 0; i < 16; i++) {
  output[1] = i;
  device.write(output);
}

console.log("postdefault");

let counter = 0;

output[1] = 0;

setInterval(() => {
  device.write(output);

  counter++;

  if (counter > 50) {
    mode[2] = 0;
    device.write(mode);
    device.close();
    process.exit(0);
  }
}, 10);*/
