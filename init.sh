#!/bin/bash

set -e

NODE_VERSIONS=("v14.9.0" "v16.20.2" "v20.20.1")
TARGET_NODE_VERSION="v14.9.0"

ask_yes_no() {
    local prompt="$1"
    local answer

    read -r -p "$prompt (yes/y or no/n): " answer
    answer=$(printf '%s' "$answer" | tr '[:upper:]' '[:lower:]')

    case "$answer" in
        y|yes)
            return 0
            ;;
        n|no)
            return 1
            ;;
        *)
            echo "請輸入 yes/y 或 no/n。"
            ask_yes_no "$prompt"
            return $?
            ;;
    esac
}

load_nvm() {
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    if [ -s "$NVM_DIR/nvm.sh" ]; then
        # shellcheck disable=SC1090
        . "$NVM_DIR/nvm.sh"
        return 0
    fi

    if command -v brew >/dev/null 2>&1; then
        local brew_nvm
        brew_nvm="$(brew --prefix nvm 2>/dev/null || true)"
        if [ -n "$brew_nvm" ] && [ -s "$brew_nvm/nvm.sh" ]; then
            # shellcheck disable=SC1090
            . "$brew_nvm/nvm.sh"
            return 0
        fi
    fi

    return 1
}

install_nvm() {
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
}

ensure_nvm() {
    if load_nvm && command -v nvm >/dev/null 2>&1; then
        return 0
    fi

    echo "目前尚未安裝 nvm。"
    if ! ask_yes_no "是否幫你安裝 nvm"; then
        echo "未安裝 nvm，初始化失敗。"
        exit 1
    fi

    install_nvm

    if ! load_nvm || ! command -v nvm >/dev/null 2>&1; then
        echo "nvm 安裝失敗，初始化失敗。"
        exit 1
    fi
}

has_node_version() {
    local version="$1"
    [ "$(nvm version "$version")" = "$version" ]
}

ensure_node_versions() {
    local missing_versions=()
    local version

    for version in "${NODE_VERSIONS[@]}"; do
        if ! has_node_version "$version"; then
            missing_versions+=("$version")
        fi
    done

    if [ "${#missing_versions[@]}" -eq 0 ]; then
        return 0
    fi

    echo "以下 Node.js 版本尚未安裝: ${missing_versions[*]}"
    if ! ask_yes_no "是否幫你用 nvm 安裝以下版本: ${missing_versions[*]}"; then
        echo "未安裝 v14.9.0、v16.20.2、v20.20.1，初始化失敗。"
        exit 1
    fi

    for version in "${missing_versions[@]}"; do
        nvm install "$version"
    done
}

ensure_nvm
ensure_node_versions
nvm use "$TARGET_NODE_VERSION"

git checkout develop
git submodule update --init
npm install
npm update