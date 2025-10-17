# Dymo Connect

For usage with [DYMO](https://www.dymo.com/) LabelWriters to print labels.
DYMO Connect software for Windows or Mac needs to be installed and running in the background.

### Install

```
npm install dymo-connect
```

### Usage

```javascript
import Dymo from 'dymo-connect';

const dymo = new Dymo();
```

Default hostname and port for DYMO Connect Service is `127.0.0.1` and `41951` respectively. If you would like to change one or both, they can be passed as an object to the constructor.

```javascript
const options = {
  hostname: '192.168.1.100',
  port: 41999,
};

const dymo = new Dymo(options);
```

### Get printers

```javascript
await dymo.getPrinters();

// Returns an array of every connected printer with their names, models and if the printer is connected, local and twinTurbo

// {
//   success: true,
//   data: [
//     {
//       name: 'DYMO LabelWriter 550',
//       model: 'DYMO LabelWriter 550',
//       connected: true,
//       local: true,
//       twinTurbo: false,
//     },
//   ],
// }
```

### Render label preview

```javascript
await dymo.renderLabel(xml);

// Returns a base64 encoded png string
```

### Printing

```javascript
await dymo.printLabel('DYMO LabelWriter 550', xml);

// Will print the xml provided to a printer named DYMO LabelWriter 550
```

An optional third parameter can be passed to the printLabel method to provide additional label parameters.

```javascript
const parameters = { copies: 10 };

await dymo.printLabel('DYMO LabelWriter 550', xml, parameters);
```

| Property        | Type                                                                  | Optional | Description                                    |
| --------------- | --------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `copies`        | `number`                                                              | Yes      | Number of copies to print                      |
| `jobTitle`      | `string`                                                              | Yes      | Job title for the label                        |
| `flowDirection` | `'LeftToRight'` \| `'TopToBottom'`                                    | Yes      | Direction in which labels flow                 |
| `printQuality`  | `'Text'` \| `'Barcode'` \| `'Graphics'`                               | Yes      | Quality mode for printing                      |
| `twinTurboRoll` | `'None'` \| `'Left'` \| `'Right'`                                     | Yes      | Which roll to use (if any)                     |
| `rotation`      | `'Rotation0'` \| `'Rotation90'` \| `'Rotation180'` \| `'Rotation270'` | Yes      | Label rotation angle                           |
| `isTwinTurbo`   | `boolean`                                                             | Yes      | If a Twin Turbo printer is used                |
| `isAutoCut`     | `boolean`                                                             | Yes      | Whether auto-cutting is enabled (if supported) |

### How to get XML

Open the DYMO Connect software, design your label, and save it. The saved file (with a `.dymo` extension) is essentially an XML file, which you can open in a browser or an IDE. You can then replace parts of the XML with your dynamic values.

### Get consumable info

The LabelWriter 550 series printers support label recognition, which allows DYMO software to receive information about the inserted labels, such as the label size and the number of labels remaining on the roll. You can call this method to retrieve the SKU (stock keeping unit) and the remaining label count.

```javascript
await dymo.getConsumableInfo('DYMO LabelWriter 550');

// {
//   success: true,
//   data: {
//     sku: 'S0722540',
//     labelsRemaining: 985,
//   },
// }
```

### Security

DYMO uses a self-signed certificate for the internal endpoints we rely on. To enable secure communication in Node.js, we bundle this certificate and include it in the HTTPS requests to DYMO. This allows the connection to be trusted without disabling certificate verification.
