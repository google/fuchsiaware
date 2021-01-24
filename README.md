# FuchsiAware - Fuchsia OS Source Tree Browsing Assistance

This extension recognizes Fuchsia-specific artifacts in the Fuchsia Git-based source repository and
adds links and references to help navigate them.

* Converts fuchsia comonent URLs (beginning with the `fuchsia-pkg` scheme), in any file, to links
  that open the component's manifest source (either `.cml` or `.cmx`).

![example-links](images/preview-links.png)

* Supports the inverse action by finding references to an open manifest, via it's component URL.
  Right-click a file and select menu option "Go to References" or "Find References".

![example-references](images/preview-references.png)

## Extension Settings

There are currently no settings specific to this extension.

## Release Notes

See the [CHANGELOG](CHANGELOG.md)
