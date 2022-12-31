# Contributing

## Getting Started

1. Clone this repository
2. `npm install` to install dependencies
3. Open this folder in VS Code and start the debugger (`F5`).

## Updating the config

The contributions in the package.json file are generated from the TypeScript types. Don't update them manually.

Run `npm run build` to update them.

## Testing

### Unit tests

Run unit tests with `npm test`.

### Manual tests

To test the general behavior of the extension, launch the debugger (`F5`).

General testing involves:

1. Update the config in the [test workspace](test/extension-test-workspace.code-workspace)
2. View the effects in the [test file](test/test-sample.md)

## Roadmap

1. Documentation, showing example usage, nested regex, etc
2. Add a keyboard shortcut for expanding all inline replacements
3. Make the tree view display matches for all files in the workspace
4. Make it work for multi-root workspaces
5. Test and document overlapping styles (not nested, but overlapping)