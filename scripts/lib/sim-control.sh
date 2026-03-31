#!/bin/bash
# iOS Simulator control helpers

source "$(dirname "${BASH_SOURCE[0]}")/../../config.sh"

# Auto-detect simulator UDID if not set
detect_simulator() {
  if [ -z "$IOS_SIMULATOR_UDID" ]; then
    IOS_SIMULATOR_UDID=$(xcrun simctl list devices available -j 2>/dev/null | \
      jq -r '.devices | to_entries[] | select(.key | contains("iOS")) | .value[] | select(.name == "'"$IOS_SIMULATOR_NAME"'") | .udid' | head -1)
    if [ -z "$IOS_SIMULATOR_UDID" ]; then
      echo "[SIM] ERROR: Could not find simulator '$IOS_SIMULATOR_NAME'" >&2
      echo "[SIM] Available devices:" >&2
      xcrun simctl list devices available 2>&1 >&2
      return 1
    fi
    echo "[SIM] Detected UDID: $IOS_SIMULATOR_UDID" >&2
  fi
}

boot_simulator() {
  detect_simulator || return 1
  xcrun simctl boot "$IOS_SIMULATOR_UDID" 2>/dev/null || true
  open -a Simulator
  sleep 3
  echo "[SIM] Simulator booted: $IOS_SIMULATOR_NAME ($IOS_SIMULATOR_UDID)" >&2
}

build_ios_app() {
  local scheme="$1"
  cd "$HARNESS_ROOT/ios"
  xcodebuild \
    -scheme "$scheme" \
    -destination "platform=iOS Simulator,id=$IOS_SIMULATOR_UDID" \
    -derivedDataPath "$HARNESS_ROOT/ios/build" \
    build 2>&1
}

install_app() {
  local app_path
  app_path=$(find "$HARNESS_ROOT/ios/build" -name "*.app" -path "*Debug-iphonesimulator*" | head -1)
  if [ -z "$app_path" ]; then
    echo "[SIM] ERROR: No .app found in build output" >&2
    return 1
  fi
  xcrun simctl install "$IOS_SIMULATOR_UDID" "$app_path"
  echo "[SIM] Installed: $app_path" >&2
}

launch_app() {
  local bundle_id="$1"
  xcrun simctl launch "$IOS_SIMULATOR_UDID" "$bundle_id"
  sleep 2
  echo "[SIM] Launched: $bundle_id" >&2
}

shutdown_simulator() {
  xcrun simctl shutdown "$IOS_SIMULATOR_UDID" 2>/dev/null || true
  echo "[SIM] Simulator shut down" >&2
}
