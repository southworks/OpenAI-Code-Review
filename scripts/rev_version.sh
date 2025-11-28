#!/bin/bash

# Update version across all package.json, vss-extension.json, and task.json files
# Usage: ./rev_version.sh [n.n.n]
#   If version is not provided, it will read from root package.json and bump the patch version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Files to update
ROOT_PACKAGE_JSON="$REPO_ROOT/package.json"
AI_PACKAGE_JSON="$REPO_ROOT/ai-code-review/package.json"
VSS_EXTENSION_JSON="$REPO_ROOT/vss-extension.json"
TASK_JSON="$REPO_ROOT/ai-code-review/task.json"

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install jq to use this script."
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    exit 1
fi

validate_version() {
    local version=$1
    if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Invalid version format '$version'. Expected format: n.n.n (e.g., 1.0.17)"
        exit 1
    fi
}

get_current_version() {
    if [ ! -f "$ROOT_PACKAGE_JSON" ]; then
        echo "Error: Root package.json not found at $ROOT_PACKAGE_JSON"
        exit 1
    fi

    jq -r '.version' "$ROOT_PACKAGE_JSON"
}

bump_patch_version() {
    local version=$1
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    local patch=$(echo "$version" | cut -d. -f3)

    patch=$((patch + 1))
    echo "$major.$minor.$patch"
}

update_json_version() {
    local file=$1
    local new_version=$2

    if [ ! -f "$file" ]; then
        echo "Warning: File not found: $file"
        return
    fi

    jq --arg version "$new_version" '.version = $version' "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"

    echo "Updated $file to version $new_version"
}

update_task_json_version() {
    local file=$1
    local new_version=$2

    if [ ! -f "$file" ]; then
        echo "Warning: File not found: $file"
        return
    fi

    local major=$(echo "$new_version" | cut -d. -f1)
    local minor=$(echo "$new_version" | cut -d. -f2)
    local patch=$(echo "$new_version" | cut -d. -f3)

    jq --argjson major "$major" --argjson minor "$minor" --argjson patch "$patch" \
       '.version.Major = $major | .version.Minor = $minor | .version.Patch = $patch' \
       "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"

    echo "Updated $file to version $new_version (Major: $major, Minor: $minor, Patch: $patch)"
}

main() {
    local new_version

    if [ -n "$1" ]; then
        new_version=$1
        validate_version "$new_version"
        echo "Using provided version: $new_version"
    else
        local current_version=$(get_current_version)
        new_version=$(bump_patch_version "$current_version")
        echo "Current version: $current_version"
        echo "Bumping to version: $new_version"
    fi

    echo ""
    echo "Updating version to $new_version in all files..."
    echo ""

    update_json_version "$ROOT_PACKAGE_JSON" "$new_version"
    update_json_version "$AI_PACKAGE_JSON" "$new_version"
    update_json_version "$VSS_EXTENSION_JSON" "$new_version"
    update_task_json_version "$TASK_JSON" "$new_version"

    echo ""
    echo "Version update complete! All files updated to version $new_version"
}

main "$@"
