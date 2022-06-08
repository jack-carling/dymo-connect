# Dymo Connect

For usage with [DYMO](https://www.dymo.com/) LabelWriters to print labels.
DYMO Connect software for Windows or Mac needs to be installed and running in the background.

### Install

```
npm install dymo-connect
```

### Usage

```javascript
const Dymo = require('dymo-connect');

Dymo.getPrinters(); // use with await or .then()

// Returns an array (promise) of every connected printer with their names, models and if the printer is connected (true/false)

// {
//   success: true,
//   data: [
//     {
//       name: 'DYMO LabelWriter 450',
//       model: 'DYMO LabelWriter 450',
//       connected: true,
//     }
//   ]
// }
```

### Render label preview

```javascript
Dymo.renderLabel(xml); // use with await or .then()

// Returns a base64 encoded png string
```

### Printing

```javascript
Dymo.printLabel('DYMO LabelWriter 450', xml);

// Will print the xml provided to a printer named "DYMO LabelWriter 450"
```

### Sample xml

```xml
<DieCutLabel Version="8.0" Units="twips">
   <PaperOrientation>Portrait</PaperOrientation>
   <Id>Small30334</Id>
   <PaperName>30334 2-1/4 in x 1-1/4 in</PaperName>
   <DrawCommands>
      <RoundRectangle X="0" Y="0" Width="3240" Height="1800" Rx="270" Ry="270" />
   </DrawCommands>
   <ObjectInfo>
      <TextObject>
         <Name>Text</Name>
         <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
         <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
         <LinkedObjectName />
         <Rotation>Rotation0</Rotation>
         <IsMirrored>False</IsMirrored>
         <IsVariable>True</IsVariable>
         <HorizontalAlignment>Center</HorizontalAlignment>
         <VerticalAlignment>Middle</VerticalAlignment>
         <TextFitMode>ShrinkToFit</TextFitMode>
         <UseFullFontHeight>False</UseFullFontHeight>
         <Verticalized>False</Verticalized>
         <StyledText>
            <Element>
               <String>Hello, World!</String>
               <Attributes>
                  <Font Family="Arial" Size="10" Bold="True" Italic="False" Underline="False" Strikeout="False" />
                  <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
               </Attributes>
            </Element>
         </StyledText>
      </TextObject>
      <Bounds X="0" Y="0" Width="3240" Height="1800" />
   </ObjectInfo>
</DieCutLabel>
```

This sample XML code will print "Hello, World!" in the center of a 2&#188;" x 1&#188;" - 57mm x 37mm label (DYMO LabelWriter Multi-Purpose item #30334).
