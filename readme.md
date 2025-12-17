# Fusez Map Editor

This repository ports the [simonseidel/Map-Editor-V3](https://github.com/simonseidel/Map-Editor-V3), written using [infernus-starter](https://github.com/dockfries/infernus-starter).

## Get Started

```sh
# if you are using the x86 version of samp-node
export npm_config_arch=ia32
export npm_config_target_arch=ia32

# powershell env
# $env:npm_config_arch="ia32";
# $env:npm_config_target_arch="ia32";

# cmd env
# set npm_config_arch=ia32
# set npm_config_target_arch=ia32

pnpm dlx @infernus/create-app@latest install

pnpm install --dev # ensure node-gyp install first

pnpm install

pnpm build
pnpm serve
```

## Difference

- Standalone GameMode rather than a FilterScript

## License

[MIT](./LICENSE) License © 2025-PRESENT Carl You
