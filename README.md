# prettier-cli-watch

### Overview

Runs [prettier](https://github.com/prettier/prettier) (from CLI) on project files when modified.

### Features

-   Runs prettier on file when modified.
    -   Pressing <kbd>ctrl</kbd> + <kbd>s</kbd> in rapid succession on a file runs prettier only on the last save.
-   Sends OS notification and logs location of error when prettier fails to format file.
    -   Logging/notifications on by default (can be disabled).

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
  "pretty": "prettier-cli-watcher --configpath ./path/to/prettier.config.json"
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

-   `--dir="."`
    -   The directory to watch.
    -   By default watches entire project for file changes.
-   `--configpath="./path/to/prettier.config.json"` (`required`)
    -   The path to your prettier config file.
-   `--ignoredirs="node_modules|bower_components|.git|dist"`
    -   The folders to ignore file changes from.
    -   Folders shown above are the default ignored folders.
    -   Pass in custom list to override defaults.
-   `--extensions="js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql"`
    -   The file extensions to watch out. _Must also be allowed by prettier_.
    -   Extensions shown above are the default allowed extensions.
    -   Pass in custom list to override defaults.
-   `--nonotify`
    -   Provide to disable OS notifications.
-   `--nolog`
    -   Provide to disable command line output.

### Examples

```json5
...
"scripts": {
  // Default setup:
  "pretty": "prettier-cli-watcher --dir='.' --configpath='./path/to/prettier.config.json' --ignoredirs='node_modules|bower_components|.git|dist' --extensions='js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql'",
  // Same as:
  "pretty": "prettier-cli-watcher --configpath='./path/to/prettier.config.json'",

  // Example 1:
  // Disable OS notifications while keeping --dir, --ignoredirs, and --extensions defaults.
  "pretty": "prettier-cli-watcher --configpath='./path/to/prettier.config.json' --nonotify",

  // Example 2:
  // Only watch for ./src file changes that are made to .js files. Notifications and logging is left on.
  "pretty": "prettier-cli-watcher --dir='./src' --configpath='./path/to/prettier.config.json' --extensions='js'",
}
...
```

### Example Output

![Example Output](/src/assets/img/example-output.png)

### Miscellaneous

-   Made using Node.js `v8.14.0` on a Linux machine running `Ubuntu 16.04.5 LTS`.

### Contributing

Contributions are welcome! Found a bug, feel like documentation is lacking/confusing and needs an update, have performance/feature suggestions or simply found a typo? Let me know! :)

See how to contribute [here](/CONTRIBUTING.md).

### Attribution

-   <div>
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
