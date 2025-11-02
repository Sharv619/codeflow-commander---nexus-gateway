#!/bin/bash

# Test script for validating the CSP hash injection workflow.
# It simulates the CI/CD process by building the UI, running the injection script,
# and then verifying the output in both the HTML and Nginx configuration.

set -e # Exit immediately if any command fails

# --- Configuration ---
UI_PACKAGE_DIR="packages/simulator-ui"
INJECTOR_SCRIPT="scripts/inject-csp.js"
NGINX_CONFIG_PATH="nginx/default.conf"
PROD_INDEX_HTML_PATH="$UI_PACKAGE_DIR/dist/index.html"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helper Functions ---
log_step() {
  echo -e "\n${CYAN}--- $1 ---${NC}"
}

log_success() {
  echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  # Cleanup generated files on error
  cleanup
  exit 1
}

cleanup() {
  log_step "Performing Cleanup"
  # Clean up the dist directory to ensure a fresh state for the next run
  if [ -d "$UI_PACKAGE_DIR/dist" ]; then
    rm -rf "$UI_PACKAGE_DIR/dist"
    echo "Removed $UI_PACKAGE_DIR/dist directory."
  fi
}

# --- Main Test Execution ---
main() {
  log_step "Starting CSP Injection Test"

  # 1. Ensure a clean state before starting
  cleanup

  # 2. Build the simulator UI to generate the production index.html
  log_step "Building the Simulator UI (Vite)"
  if ! npm run build --workspace=$UI_PACKAGE_DIR; then
    log_error "Vite build failed. Cannot proceed."
  fi
  if [ ! -f "$PROD_INDEX_HTML_PATH" ]; then
    log_error "Build succeeded, but the production index.html was not found at $PROD_INDEX_HTML_PATH."
  fi
  log_success "UI build completed successfully."

  # 3. Run the CSP hash injection script
  log_step "Running the CSP Hash Injection Script"
  if ! node "$INJECTOR_SCRIPT"; then
    log_error "CSP injection script failed to execute."
  fi
  log_success "CSP injection script executed."

  # 4. Validate the results
  log_step "Validating Injection Results"

  # 4a. Check if the Nginx config file was modified correctly
  echo "Checking nginx/default.conf..."
  if ! grep -q "'sha256-NyikclPGF4oS+oen5AObz61cXRP+HmBs5yBhkoZ+QrM='" "$NGINX_CONFIG_PATH"; then
    log_error "The expected SHA256 hash was NOT found in the Nginx config file."
  fi
  log_success "SHA256 hash was correctly injected into nginx/default.conf."

  # 4b. Optional: Check if the index.html still contains the script (it should)
  echo "Checking packages/simulator-ui/dist/index.html..."
  if ! grep -q "<script>tailwind.config" "$PROD_INDEX_HTML_PATH"; then
    log_error "The inline Tailwind script is missing from the final index.html file."
  fi
  log_success "Inline Tailwind script is present in the final index.html."

  # 5. Final Report
  log_step "TEST COMPLETE"
  echo -e "${GREEN}🎉 All steps passed. The CSP hash injection workflow is working correctly.${NC}"

  # Final cleanup
  cleanup
}

# --- Run the script ---
main
