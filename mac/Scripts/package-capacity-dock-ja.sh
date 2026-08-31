#!/usr/bin/env bash
# Standalone, CLI-free Capacity Dock. Each run creates a new output directory.
# Does not install, launch, stop apps, or change login items / security settings.
set -euo pipefail

if [[ "$(uname -m)" != "arm64" ]]; then
  echo 'This packaging script currently supports Apple Silicon (arm64) only.' >&2
  exit 1
fi

version="${1:-0.9.23}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Version must be major.minor.patch' >&2
  exit 1
fi
repo_dir="$(cd "$(dirname "$0")/../.." && pwd)"
mac_dir="${repo_dir}/mac"
scratch_dir="${mac_dir}/.build-capacity-ja"
swift build --package-path "$mac_dir" --scratch-path "$scratch_dir" -c release -Xswiftc -DCAPACITY_DOCK_ONLY --jobs 4
bin_dir="$(swift build --package-path "$mac_dir" --scratch-path "$scratch_dir" -c release -Xswiftc -DCAPACITY_DOCK_ONLY --show-bin-path)"
mkdir -p "${mac_dir}/release-capacity"
output_dir="$(mktemp -d "${mac_dir}/release-capacity/${version}-XXXXXX")"
stage_dir="${output_dir}/image"
bundle="${stage_dir}/Capacity Dock.app"
mkdir -p "${bundle}/Contents/MacOS" "${bundle}/Contents/Resources"
cp "${bin_dir}/CodeBurnMenubar" "${bundle}/Contents/MacOS/CapacityDock"
cp -R "${bin_dir}/CodeBurnMenubar_CodeBurnMenubar.bundle" "${bundle}/Contents/Resources/"
cp "${repo_dir}/LICENSE" "${bundle}/Contents/Resources/LICENSE.txt"
cp "${repo_dir}/THIRD_PARTY_NOTICES.md" "${bundle}/Contents/Resources/THIRD_PARTY_NOTICES.md"

cat > "${bundle}/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDevelopmentRegion</key><string>ja</string>
<key>CFBundleLocalizations</key><array><string>ja</string></array>
<key>CFBundleDisplayName</key><string>Capacity Dock 日本語版</string>
<key>CFBundleExecutable</key><string>CapacityDock</string>
<key>CFBundleIdentifier</key><string>io.github.zenon7171.capacity-dock</string>
<key>CFBundleName</key><string>Capacity Dock</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>${version}</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>LSUIElement</key><true/>
<key>NSHighResolutionCapable</key><true/>
<key>NSHumanReadableCopyright</key><string>© AgentSeal; Japanese fork by zenon7171. MIT.</string>
</dict></plist>
PLIST

codesign --force --sign - --timestamp=none --deep "$bundle"
codesign --verify --deep --strict "$bundle"
plutil -lint "${bundle}/Contents/Info.plist"
/usr/bin/ditto -c -k --norsrc --keepParent "$bundle" "${output_dir}/CapacityDock-JA-${version}-arm64.zip"
hdiutil create -volname 'Capacity Dock 日本語版' -srcfolder "$stage_dir" -format UDZO "${output_dir}/CapacityDock-JA-${version}-arm64.dmg"
(
  cd "$output_dir"
  shasum -a 256 ./*.dmg ./*.zip > SHA256SUMS
)
printf '\nCapacity Dock built in: %s\n' "$output_dir"
