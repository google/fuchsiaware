# Test and Release Process

This is an informal document to capture the steps to prepare and release a new
patch or release of FuchsiAware.

## Contributing a Change

A code change (bug fix or new feature) should be submitted under its own Pull
Request, _without_ changing the version in `package.json`. (This way, multiple
code changes can be bundled into a new release, if desired.) See the
[CONTRIBUTING](CONTRIBUTING.md) page.

Most changes should be accompanied by a brief [CHANGELOG](CHANGELOG.md) entry.
If you are contributing a change but will not be publishing the change (which
requires admin rights for the Visual Studio Marketplace), add a bullet item at
the bottom of the CHANGELOG, under the heading "`## [NEXT]`". (Add this heading,
if not already present.)

## Preparing a New Release

1. Determine the new version ID (**_but do not update `package.json` yet!_**) by
   deciding if the release is only a patch, a minor release, or a major release.
	For example, if the current release is `0.2.1`:

	 * A patch will result in a new version ID `0.2.2`. A patch is typically used
	   if there is no code change to the extension itself (perhaps only changing
		or adding a test, or changing documentation); or the patch results in a
		minor, optional behavior change.
	 * A minor release will result in a new version ID `0.3.0` (note the patch ID
	   is reset to `0`). A minor release typically represents a significant code
		change, change in behavior, a fix to a bug that inhibits end-user features,
		or a new feature.
	 * A major release is rare, and typically involves a high bar of release
	   criteria and feedback (if not approval) from major stakeholders.

2. Fetch all recently merged changes, and start a new branch, named for the new
   version ID. From the toplevel of your cloned, forked repo:

   ```shell
   # One-time setup:
	 # $ git remote add upstream git@github.com:google/fuchsiaware.git
   $ git fetch upstream main
   $ NEW_VERSION="0.2.2" # or whatever the new version will be
   $ git checkout -b $NEW_VERSION upstream/main
   ```

3. Confirm the tests still pass. (If not, start a new branch, push, and merge a
   new pull request with a fix.)

   ```shell
   $ npm run test
   ...
   ```

4. Add the new version ID and a brief description of each change to the
   [CHANGELOG](CHANGELOG.md). Then push the change to your fork.

   ```shell
   $ git add ...
   $ git commit [--amend]
   $ git push --set-upstream origin $NEW_VERSION
   ```

   Create a pull request, and verify the GitHub checks pass.

   DO NOT merge the change yet.

	_Your new version is **not yet published** to the VS Code Marketplace_

5. Use `vsce` to generate the `.vsix` file for the new version, and then publish
   the new version, with the new version ID.

   ```shell
   $ vsce package
   $ vsce publish <patch or minor or simply $NEW_VERSION> --githubBranch=main
   ```

   This should update the version in `package.json` and `package-lock.json`, and
	automatically generate a new local commit in your branch.

   Additional information on the publishing commands, including how to install
	vsce and/or login as the required "publisher" ("RichKadel"), if necessary, is
	available in the VS Code documentation for
	[Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

6. Push the package version changes made by `vsce publish` to your pull request
   and verify the pull request in GitHub includes the additional commit, and
   the `package.json` file (and lock file) have the correct version.

   ```shell
   $ git push --force-with-lease
   ```

   Once the GitHub checks pass, merge the pull request.

7. Tag the release (via the GitHub UI, apply a new Release/Tag named using the
   new version ID)
