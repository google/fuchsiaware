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

## [0.0.5]

- Fixes:
  * Added more patterns and heuristics to resolve more component URLs to their manifests.

## [0.1.0]

- Initial public release, published to the Visual Studio Marketplace.

## [0.2.0]

- New feature: Linkifies fxrev.dev and fxbug.dev links
  * Activates `fxrev.dev/[revision ID]` (and legacy `fxr/[revision ID]`) links
  * Activates `fxbug.dev/[bug ID]` (and legacy `fxb/[bug ID]`) links

## [0.3.0]

- Fixes:
  * Added more patterns and heuristics to resolve more component URLs to their manifests.
    (Heuristics can be turned off in "Settings", if desired.) This release applies a best effort
    match of otherwise unresolved component URL links to manifests with matching component names.
    Since the same component can be in more than one package, this will not always be valid, but
    for most users that would have to search manually, this seems to be more helpful. In addition,
    to searching based on matching names, matches are also attempted after removing some common
    built-time-appended suffixes (such as "_test").
