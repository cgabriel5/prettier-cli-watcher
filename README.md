# prettier-cli-watcher

Runs [prettier](https://github.com/prettier/prettier) from CLI on project files when modified.

<!-- <img src="/src/assets/img/example-output.png" width="65%"> -->

<a name="install"></a>

### Install

Locally per project:

```sh
$ npm install prettier-cli-watcher --save-dev
# or
$ yarn add prettier-cli-watcher --dev
```

Or globally:

```sh
$ sudo npm install -g prettier-cli-watcher
# or
$ yarn global add prettier-cli-watcher
```

<a name="how-to-use"></a>

### How To Use

```sh
$ prettier-cli-watcher
```

Or use a `package.json` script:

```json
...
"scripts": {
  "pretty": "prettier-cli-watcher"
}
...
```

Then run via `$ npm run pretty` or `$ yarn run pretty`.

<a name="options"></a>

### Options

- `--dir`: The absolute path of directory to watch (default: `process.cwd()`).
- `--config`: The project's prettier config is automatically [located](#configfiles) and used via [cosmiconfig](https://github.com/davidtheclark/cosmiconfig).
  - Or provide the file's absolute path or relative path to `--dir`.
- `--ignore`: Like the prettier config, the project's [`.prettierignore`](https://prettier.io/docs/en/ignore.html#ignoring-files) file is also located and used.
  - Or provide the file's absolute path or relative path to `--dir`.
  - **Note:** By default the entire `--dir` directory is watched. Make sure to use a [`.prettierignore`](https://prettier.io/docs/en/ignore.html#ignoring-files) file to ignore paths like `node_modules/`, `.git/`, and `dist/`, for example.
- `--notify`: Enable OS notifications when prettier errors.
- `--quiet`: Disable output.
- `--setup`: List setup details.
- `--dry`: Run prettier without saving changes (for ignore test runs).
<!-- - `--dtime`: Deflection time in milliseconds (default: `500`). -->
- `--version`: List prettier-cli-watcher version.

<!-- - `--watcher`: File watcher to use (default: [`chokidar`](https://github.com/paulmillr/chokidar), or [`hound`](https://github.com/gforceg/node-hound)). -->

<a name="configfiles"></a>

### Configuration Files

<details><summary>Expand section</summary>

<br>

[cosmiconfig](https://github.com/davidtheclark/cosmiconfig) is used to locate the project's prettier configuration file if one is not explicitly provided. Going from top to bottom, the following places are searched until a prettier configuration file is found. If one is not found the default prettier settings are used.

```
[
  'package.json',
  '.prettierrc',
  'configs/.prettierrc',
  '.prettierrc.json',
  'configs/.prettierrc.json',
  '.prettierrc.yaml',
  'configs/.prettierrc.yaml',
  '.prettierrc.yml',
  'configs/.prettierrc.yml',
  '.prettierrc.js',
  'configs/.prettierrc.js',
  'prettier.config.js',
  'configs/prettier.config.json',
  'configs/prettier.config.js',
  '.prettierrc.toml',
  'configs/.prettierrc.toml'
]
```

Likewise, the project's [`.prettierignore`](https://prettier.io/docs/en/ignore.html#ignoring-files) is looked for at the following locations. By default the entire `--dir` directory is watched so ensure to use a [`.prettierignore`](https://prettier.io/docs/en/ignore.html#ignoring-files) file to ignore paths like `node_modules/`, `.git/`, and `dist/`, for example.

```
[
  '.prettierignore',
  'configs/.prettierignore',
  'configs/prettierignore'
]
```

</details>

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
