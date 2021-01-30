# Change Log

All notable changes to the "fuchsiaware" extension will be documented in this file.

## [0.0.1]

- Initial release: Document Links
  * Links Fuchsia component URLs (beginning with `fuchsia-pkg://fuchsia.com/...`) in a document text
    to component manifests (files with extensions .cml or .cmx).

## [0.0.2]

- New feature: References
  * Provides references to a given manifest, via matching component URLs in other files.

## [0.0.3]

- New feature: Settings
  * Provides settings to override the default location for the `fuchsia` source tree, and now also
    now uses an environment variable (`$FUCHSIA_DIR` or `$FUCHSIA_ROOT`, if either is set) as a
    fallback, if the current workspace does not include a folder rooted at the `fuchsia` directory.
- Fixes:
  * The data extraction patterns have improved, enabling a significant number of additional package
    links.

## [0.0.4]

- New feature: Terminal Links
  * Links Fuchsia component URLs (beginning with `fuchsia-pkg://fuchsia.com/...`) in the terminal
    to component manifests (files with extensions .cml or .cmx).
