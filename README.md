# Fuchsia Component Manifest Browser

This extension converts fuchsia comonent URLs (beginning with the `fuchsia-pkg` scheme),
in any file, to links that open the component's manifest source (either `.cml` or `.cmx`).

![example](preview.png)

## Running the Sample from the VS Code extension source

* `npm install` to initialize the project
* `npm run watch` to start the compiler in watch mode
* open this folder in VS Code and press `F5`
* this will open the `[Extension Development Host]` window, running the extension:
  * Run `fx set ...` and ensure the `out/*/toolchain.ninja` file has been generated. (The
    relationships between packaged components and their sources are derived from here.)
  * Open any document that contains a `fuchsia-pkg` URL (assuming it's source is in the fuchsia
    source tree).
  * The extension will linkify (indicated with an underline) each traversable component URL.
