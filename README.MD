# XSD to JavaScript Code Generator

This command-line tool generates JavaScript classes from an XML Schema Definition (XSD) file. It supports customization via template files and several options to control code generation.

## 📦 Installation

Clone the repository and install dependencies (if any):

```bash
git clone https://github.com/rberaud/xsd2js
cd xsd2js
npm install
```

you can also install the tool from npm

```bash
npm install xsd2js -g
```

## 🚀 Usage

```bash
xsd2js -i <input.xsd> -o <output_path> [options]
```

Please note that the `xsd2js` shortcut is bound to `node ./src/main.js`

## 📚 Options

| Option                     | Alias | Type      | Required | Default | Description                                                                                                                        |
| -------------------------- | ----- | --------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--input`                  | `-i`  | `string`  | ✅       |         | Path to the input XSD file.                                                                                                        |
| `--output`                 | `-o`  | `string`  | ✅       |         | Output path (file or directory).                                                                                                   |
| `--multiple-files`         | `-m`  | `boolean` | ❌       | `false` | Generate a separate file for each class.                                                                                           |
| `--base`                   | `-b`  | `string`  | ❌       |         | Path to a custom `Base.js` file used as base class.                                                                                |
| `--XSD-type`               |       | `boolean` | ❌       | `false` | Track the original XSD type for each field.                                                                                        |
| `--XML-type`               |       | `boolean` | ❌       | `false` | Track whether a field is an XML attribute.                                                                                         |
| `--transparent-attributes` |       | `boolean` | ❌       | `false` | Expose XML attributes as normal properties (no `@_` prefix).                                                                       |
| `--template-file`          |       | `string`  | ❌       |         | Path to a custom template file for class generation.                                                                               |
| `--template-tag-body`      |       | `string`  | ❌       |         | Tag in the template used for constructor body (e.g., `"tag-body"`).                                                                |
| `--template-tag-meta`      |       | `string`  | ❌       |         | Tag in the template used for metadata section (e.g., `"tag-meta"`).                                                                |
| `--template-tag-header`    |       | `string`  | ❌       |         | Tag in the template used for header (e.g., `"tag-header"`).                                                                        |
| `--generate-accessors`     |       | `boolean` | ❌       | `true`  | When true generated classes expose properties through getters/setters backed by hidden fields (useful to prevent direct mutation). |
| `--accessors-notification` |       | `boolean` | ❌       | `true`  | When true (and when `--generate-accessors` is enabled) setters will emit change notifications to subscribers on the instance.      |

## 🛠 Example

Generate a single file from an XSD:

```bash
node index.js -i schema.xsd -o output.js
```

Generate multiple class files:

```bash
node index.js -i schema.xsd -o ./output-directory -m
```

Generate classes using accessor-backed properties and notifications (both enabled by default):

```bash
node src/main.js -i schema.xsd -o ./generated -m --generate-accessors --accessors-notification
```

Disable accessor notifications while keeping accessors enabled:

```bash
node src/main.js -i schema.xsd -o ./generated -m --generate-accessors --no-accessors-notification
```

Use a custom template:

```bash
node index.js -i schema.xsd -o ./output -m \
  --template-file template.txt \
  --template-tag-body "%%BODY%%" \
  --template-tag-meta "%%META%%" \
  --template-tag-header "%%HEADER%%"
```

Use a custom base class:

```bash
xsd2js -i schema.xsd -o ./output -b ./Base.js
```

## 📎 How to use the generated files

Unless you provide your own template file using options like `--template-file`, you can reuse the generated files with the `./template/base.js` file provided. This class is a root class for every generated class, and it provides basic marshalling/unmarshalling features to/from XML

## 📎 Notes

- XML attributes are prefixed with `@_` by default unless `--transparent-attributes` is enabled.
- Templates should contain placeholders (`template-tag-*`) which will be replaced by generated code.
- If you use `--XSD-type` or `--XML-type`, the metadata will include this information for introspection or validation purposes.

## 🔔 Notifications (accessors)

When generated with `--generate-accessors` (default) and `--accessors-notification` (default), each generated class instance exposes a subscription API implemented on `Base`.

- `const token = instance.subscribe(listener)` — subscribe to events on this instance. `listener` can be either:
  - a function that will be called with an event object, or
  - an object that implements `onPropertyChange(event)` (this allows adding other future event handler methods on the same listener object).
- `instance.unsubscribe(token)` — remove the subscription.

For property changes the event object has the shape: `{ target, property, oldValue, newValue }`. The template exposes this via a method named `_notifyPropertyChanged` (called by generated setters).

Examples:

Function listener:

```javascript
import { UADataType } from "./generated/UADataType.js";

const n = new UADataType({
  /* initial data */
});

const token = n.subscribe(({ target, property, oldValue, newValue }) => {
  console.log(
    `Property ${property} changed from`,
    oldValue,
    "to",
    newValue,
    "on",
    target
  );
});

n.Definition = {
  /* new value */
};

// Unsubscribe when done
n.unsubscribe(token);
```

Object listener:

```javascript
const listener = {
  onPropertyChange({ target, property, oldValue, newValue }) {
    console.log(
      "object listener",
      property,
      oldValue,
      newValue,
      target.constructor.name
    );
  },
};

const token2 = n.subscribe(listener);
n.Purpose = "some purpose";
n.unsubscribe(token2);
```

## 📤 Output

Depending on your options, the output will be:

- A single `.js` file with all generated classes.
- Multiple `.js` files in a directory (when `--multiple-files` is enabled).
- Each class will be based on a default or custom `Base.js` class, if provided.

## 🛠 Tests

```bash
cd examples
xsd2js --i ./UANodeSet.xsd -o ./references --m --transparent-attributes --XSD-type--XML-type
```

A set of OPC-UA js files should be generated in the `examples/references` folder.
