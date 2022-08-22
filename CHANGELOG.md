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

## [0.4.0]

- Fixes:
  * A recent change to `fx set` appears to now populate `.fx-build-dir` with an absolute path name.
    This version supports an absolute path name, as long as it is a descendent directory of
    `$FUCHSIA_DIR`. This should resolve errors related to the recent change. If support for absolute
    paths external to `$FUCHSIA_DIR` is also necessary, additional changes will be required.

## [0.4.1]

- Documentation:
  * Adds instructions for publishing new releases, in [RELEASING.md](RELEASING.md).

## [0.4.2]

- UI:
  * Updates the VS Code extension icon to a more current Fuchsia logo. (Note:
    the version of the logo image in this release did not work well with dark
    themes, and had to be fixed in version 0.4.3.)

- Test regression:
  * A test is no longer passing, even though the source has not changed. Until
    this issue can be corrected, I had to comment out the broken test. See issue
    (#13)[https://github.com/google/fuchsiaware/issues/13] for details.

## [0.4.2]

- UI:
  * Replace the new VS Code extension icon with one that is more visible on top
    of dark themes in VS Code and web pages.

- Documentation:
  * Improved steps in the [RELEASING][RELEASING.md] document to ensure the
    package.json version change is included in the pull request with its
    corresponding changes.

## [0.5.0]

- Fixes:
  * Updated the regular expression for extracting packages, and updated tests to
    match the revised ninja build command to build packages. The commands for
    building packages recently changed, and the packages could not be extracted.
    This generated a VS Code error dialog when loading FuchsiAware, and
    FuchsiAware was not able to generate some cross-references.

## [0.5.1]

- Fixes:
  * Adjust additional regular expressions to adapt to build rule changes, to
    fix extracted names and paths. This corrects missing and/or invalid
    document links from component URLs to CML manifest sources.
