#!/bin/sh
# Start the app against a Postgres database that lives in .local-review/.
# Downloads Node into that folder when node is missing or older than 20.
# Does not use Homebrew or Docker.
set -eu

cd "$(dirname "$0")/.."
ROOT=$(pwd)
NODE_VERSION=v22.21.0

node_is_new_enough() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const major = Number(process.versions.node.split(".")[0]); if (!(major >= 20)) process.exit(1)'
}

if node_is_new_enough; then
  echo "Using Node $(node -v) from PATH."
else
  os=$(uname -s)
  arch=$(uname -m)
  case "$os-$arch" in
    Darwin-arm64) target=darwin-arm64; sha=dbc1a17024a32827adb23b5b11ce98cefcd783145a30fe41bb2845be711e9742 ;;
    Darwin-x86_64) target=darwin-x64; sha=756674542a28207515cdd22ca290e53a9c1fb7b903603047278d339164eb376f ;;
    Linux-x86_64) target=linux-x64; sha=262b84b02f7e2bc017d4bdb81fec85ca0d6190a5cd0781d2d6e84317c08871f8 ;;
    Linux-aarch64|Linux-arm64) target=linux-arm64; sha=5180e74f2cdea6142548bd827249da32c0e86ba2581d6241e2f2761f957b9ed1 ;;
    *)
      echo "This script cannot download Node for $os $arch."
      echo "Install Node 20 or newer, put it on PATH, and run this again."
      exit 1
      ;;
  esac

  name="node-${NODE_VERSION}-${target}"
  cache="$ROOT/.local-review/cache"
  tarball="$cache/${name}.tar.gz"
  home="$cache/$name"
  mkdir -p "$cache"

  if [ ! -x "$home/bin/node" ]; then
    echo "Downloading Node ${NODE_VERSION} for ${target} into .local-review/cache."
    url="https://nodejs.org/dist/${NODE_VERSION}/${name}.tar.gz"
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$url" -o "$tarball"
    elif [ -x /usr/bin/curl ]; then
      /usr/bin/curl -fsSL "$url" -o "$tarball"
    else
      echo "curl is required to download Node. macOS includes /usr/bin/curl."
      exit 1
    fi
    if command -v sha256sum >/dev/null 2>&1; then
      echo "$sha  $tarball" | sha256sum -c -
    else
      echo "$sha  $tarball" | shasum -a 256 -c -
    fi
    tar -xzf "$tarball" -C "$cache"
  fi

  export PATH="$home/bin:$PATH"
  hash -r 2>/dev/null || true
  echo "Using Node $(node -v) from .local-review/cache."
fi

exec node scripts/local-review.mjs "$@"
