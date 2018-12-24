# prettier-cli-watcher

### Overview

Runs [prettier](https://github.com/prettier/prettier) (from CLI) on project files when modified.

<img src="/src/assets/img/example-output.png" width="65%">

### Features

- Runs prettier on file when modified.
  - Pressing <kbd>ctrl</kbd> + <kbd>s</kbd> in rapid succession on a file runs prettier only on the last save.
- Sends OS notification and logs location of error when prettier fails to format file.
  - Logging/notifications on by default (can be disabled).
- [Per-extension prettier configurations.](#Extension-Specific-Configurations)
  - Have different prettier configurations for different file extensions.
  - For example, have a universal configuration for all allowed files but a different one for `.md` files.

### Install

```shell
# npm
npm install prettier-cli-watcher --save-dev

# yarn
yarn add prettier-cli-watcher --dev
```

### How To Use

```json5
// Add following script to your package.json scripts. Make sure to provide the
// actual path to your prettier config file.
...
"scripts": {
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json'"
}
...
```

```shell
# Then run with npm:
npm run pretty

# or yarn:
yarn run pretty
```

### Options

Available parameters (_supplied via script command - see examples_):

- `--dir="."`
  - The directory to watch.
  - By default watches entire project for file changes.
- `--configpath="path/to/prettier.config.json"` (`required`)
  - The path to your prettier config file.
- `--ignoredirs="node_modules|bower_components|.git|dist"`
  - The folders to ignore file changes from.
  - Folders shown above are the default ignored folders.
  - Pass in custom list to override defaults.
- `--extensions="js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql"`
  - The file extensions to watch out for. _Must also be allowed by prettier_.
  - Extensions shown above are the default allowed extensions.
  - Pass in custom list to override defaults.
- `--nonotify`
  - Provide to disable OS notifications.
- `--nolog`
  - Provide to disable command line output.

### Examples

```json5
...
"scripts": {
  // Default setup...
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --dir='.' --ignoredirs='node_modules|bower_components|.git|dist' --extensions='js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql'",
  // ...is the same as:
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json'",

  // Example 1:
  // Disable OS notifications while keeping --dir, --ignoredirs, and --extensions defaults.
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --nonotify",

  // Example 2:
  // Only watch for ./src file changes made to .js files. Notifications and logging is left on.
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --dir='./src' --extensions='js'"
}
...
```

### Extension Specific Configurations

The following configuration will be applied to all allowed file extensions (universal configuration).

```json5
{ // prettier.config.json
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "printWidth": 80,
  "semi": true
  ...other settings
}
```

Per-extension configuration file, must be supplied in the following manner:

- `*`: The universal prettier configuration (`required`).
- `md`: Configuration for `.md` files.

```json5
{ // prettier.config.json
  "*": { // "*" → Universal configuration to apply to all allowed file extensions.
    "bracketSpacing": true,
    "jsxBracketSameLine": false,
    "printWidth": 80,
    "semi": true
    ...other settings
  },
  "md": { // Prettier configuration only applied to .md files.
    "bracketSpacing": true,
    "jsxBracketSameLine": false,
    "printWidth": 120,
    "semi": true,
    "singleQuote": false,
    "tabWidth": 2,
    "trailingComma": "none",
    "useTabs": false
  }
}
```

When using a per-extension configuration file the used prettier configuration will get logged as shown.

<img src="/src/assets/img/example-output-multi-config.png" width="65%">

### Miscellaneous

- Made using Node.js `v8.14.0` on a Linux machine running `Ubuntu 16.04.5 LTS`.

### Contributing

Contributions are welcome! Found a bug, feel like documentation is lacking/confusing and needs an update, have performance/feature suggestions or simply found a typo? Let me know! :)

See how to contribute [here](/CONTRIBUTING.md).

### Attribution

- <div>
  		The error notification icon was made by
  		<a href="https://www.flaticon.com/authors/roundicons" title="Roundicons">
  			Roundicons
  		</a>
  		from
  		<a href="https://www.flaticon.com/" title="Flaticon">
  			www.flaticon.com
  		</a>
  		and is licensed under
  		<a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">
  			CC 3.0 BY</a>.
  	</div>

### License

This project uses the [MIT License](/LICENSE.txt).
