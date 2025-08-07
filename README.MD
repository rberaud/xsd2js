# XSD to JavaScript Code Generator

This command-line tool generates JavaScript classes from an XML Schema Definition (XSD) file. It supports customization via template files and several options to control code generation.

## 📦 Installation

Clone the repository and install dependencies (if any):

```bash
git clone <your-repo-url>
cd <your-project-folder>
npm install
```

## 🚀 Usage

```bash
node index.js -i <input.xsd> -o <output_path> [options]
```

## 📚 Options

| Option                     | Alias | Type      | Required | Default | Description                                                         |
| -------------------------- | ----- | --------- | -------- | ------- | ------------------------------------------------------------------- |
| `--input`                  | `-i`  | `string`  | ✅       |         | Path to the input XSD file.                                         |
| `--output`                 | `-o`  | `string`  | ✅       |         | Output path (file or directory).                                    |
| `--multiple-files`         | `-m`  | `boolean` | ❌       | `false` | Generate a separate file for each class.                            |
| `--base`                   | `-b`  | `string`  | ❌       |         | Path to a custom `Base.js` file used as base class.                 |
| `--XSD-type`               |       | `boolean` | ❌       | `false` | Track the original XSD type for each field.                         |
| `--XML-type`               |       | `boolean` | ❌       | `false` | Track whether a field is an XML attribute.                          |
| `--transparent-attributes` |       | `boolean` | ❌       | `false` | Expose XML attributes as normal properties (no `@_` prefix).        |
| `--template-file`          |       | `string`  | ❌       |         | Path to a custom template file for class generation.                |
| `--template-tag-body`      |       | `string`  | ❌       |         | Tag in the template used for constructor body (e.g., `"tag-body"`). |
| `--template-tag-meta`      |       | `string`  | ❌       |         | Tag in the template used for metadata section (e.g., `"tag-meta"`). |
| `--template-tag-header`    |       | `string`  | ❌       |         | Tag in the template used for header (e.g., `"tag-header"`).         |

## 🛠 Example

Generate a single file from an XSD:

```bash
node index.js -i schema.xsd -o output.js
```

Generate multiple class files:

```bash
node index.js -i schema.xsd -o ./output-directory -m
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

## 📎 Notes

- XML attributes are prefixed with `@_` by default unless `--transparent-attributes` is enabled.
- Templates should contain placeholders (`template-tag-*`) which will be replaced by generated code.
- If you use `--XSD-type` or `--XML-type`, the metadata will include this information for introspection or validation purposes.

## 📤 Output

Depending on your options, the output will be:

- A single `.js` file with all generated classes.
- Multiple `.js` files in a directory (when `--multiple-files` is enabled).
- Each class will be based on a default or custom `Base.js` class, if provided.
