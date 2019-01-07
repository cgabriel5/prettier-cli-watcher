# prettier-cli-watcher

##### Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Install](#install)
- [How To Use](#how-to-use)
  - [Ubuntu/macOS](#how-to-use-non-windows)
  - [Windows](#how-to-use-windows)
- [Options](#options)
- [Examples](#examples)
- [Per-extension Configurations](#per-extension-configurations)
- [OS Support](#os-support)
- [Contributing](#contributing)
- [Attribution](#attribution)
- [License](#license)

<a name="overview"></a>

### Overview

Runs [prettier](https://github.com/prettier/prettier) (from CLI) on project files when modified.

<img src="/src/assets/img/example-output.png" width="65%">

<a name="features"></a>

### Features

- Runs prettier on file when modified.
  - Pressing <kbd>ctrl</kbd> + <kbd>s</kbd> in rapid succession on a file runs prettier only on the last save.
- Sends OS notification and logs location of error when prettier fails to format file.
  - Logging/notifications on by default (can be disabled).
- [Per-extension prettier configurations.](#per-extension-configurations)
  - Have different prettier configurations for different file extensions.
  - For example, have a universal configuration for all allowed files but a different one for `.md` files.

<a name="install"></a>

### Install

```shell
# npm
npm install prettier-cli-watcher --save-dev

# yarn
yarn add prettier-cli-watcher --dev
```

<a name="how-to-use"></a>

### How To Use

<a name="how-to-use-non-windows"></a>

#### Ubuntu/macOS

```json5
// Add following script to your package.json scripts. Make sure to provide the
// actual path to your prettier config file.
...
"scripts": {
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json'"
}
...
```

<a name="how-to-use-windows"></a>

#### Windows

```json5
// If using Windows escape (\") options where needed or don't use (') as shown:
...
"scripts": {
  // Surround value with \" to escape:
  "pretty": "prettier-cli-watcher --configpath=\"/configs/prettier.config.json\"",

  // Or don't use apostrophes ('):
  "pretty": "prettier-cli-watcher --configpath=/configs/prettier.config.json"
}
...
```

```shell
# Then run with npm:
npm run pretty

# or yarn:
yarn run pretty
```

<a name="options"></a>

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
- `--watcher="chokidar|hound"`
  - The file watcher to use.
  - By default uses [`chokidar`](https://github.com/paulmillr/chokidar) but can also use [`hound`](https://github.com/gforceg/node-hound).
- `--dtime=500` (_deflect time_)
  - The amount of time, in milliseconds, to deflect and ignore rapid file modifications.
    - A larger time allows for more rapid file changes to be caught and ignored.
  - By default `--dtime=500` is used (500 milliseconds).
    - `--dtime=0` disables deflection check logic all together.

<a name="examples"></a>

### Examples

```json5
...
"scripts": {
  // Default setup...
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --dir='.' --ignoredirs='node_modules|bower_components|.git|dist' --extensions='js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql' --watcher='chokidar' --dtime='500'",
  // ...is the same as:
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json'",

  // Example 1:
  // Disable OS notifications while keeping --dir, --ignoredirs, and --extensions defaults.
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --nonotify",

  // Example 2:
  // Only watch for ./src file changes made to .js files. Notifications and logging is left on.
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --dir='./src' --extensions='js'",

  // Example 3:
  // Use all defaults but change file watcher to hound.
  "pretty": "prettier-cli-watcher --configpath='path/to/prettier.config.json' --watcher='hound'"
}
...
```

<a name="extension-specific-configurations"></a>

### Per-extension Configurations

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

Example per-extension configuration file:

- `*`: The universal prettier configuration (`required`).
- `md`: Configuration for `.md` files.
- Other needed file extension configurations.

```json5
{ // prettier.config.json
  "*": { // Universal configuration to apply to all allowed file extensions.
    "bracketSpacing": true,
    "jsxBracketSameLine": false,
    "printWidth": 80,
    "semi": true
    ...other settings
  },
  "md": { // This configuration is only applied to .md files.
    "bracketSpacing": true,
    "jsxBracketSameLine": false,
    "printWidth": 120,
    "semi": true,
    "singleQuote": false,
    "tabWidth": 2,
    "trailingComma": "none",
    "useTabs": false
  }
  ...any other extension configurations...
  "json": {
    ...settings
  },
  "html": {
    ...settings
  }
  ...
}
```

When using a per-extension configuration file the used prettier configuration will get logged as shown.

<img src="/src/assets/img/example-output-multi-config.png" width="65%">

<a name="os-support"></a>

### OS Support

- Made using Node.js `v8.14.0` on a Linux machine running `Ubuntu 16.04.5 LTS`.
- Tested and working on:
  - `macOS High Sierra (v10.13)`.
  - `Windows 10 (v1703 OS Build: 15063.674)`.

<a name="contributing"></a>

### Contributing

Contributions are welcome! Found a bug, feel like documentation is lacking/confusing and needs an update, have performance/feature suggestions or simply found a typo? Let me know! :)

See how to contribute [here](/CONTRIBUTING.md).

<a name="attribution"></a>

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

<a name="license"></a>

### License

This project uses the [MIT License](/LICENSE.txt).
