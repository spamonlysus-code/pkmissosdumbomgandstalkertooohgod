import os

"""
VRaZ Portal Automation Configuration
Contains verified endpoints, CSS locators and regex patterns based on portal inspection.
"""

# Fixed Portal Credentials (strictly fixed in code, non-changeable)
FIXED_PORTAL_PASSWORD = "abc@123"

# Portal URLs
LOGIN_URL = "https://vraz.theonlinetests.com/dynamicwl/login"
AUTH_POST_URL = "https://vraz.theonlinetests.com/dynamicwl/auth_login"
DASHBOARD_BRIDGE_URL = "https://vraz.theonlinetests.com/dynamicwl/cd_dashboard"
RESULTS_URL = "https://vraztests.theonlinetests.com/pages/cdmypage.php"
BASE_PORTAL_URL = "https://vraztests.theonlinetests.com"

# Verified Selectors on Login Page
SELECTOR_USER_ID = "input[name='email']"
SELECTOR_PASSWORD = "input[name='password']"
SELECTOR_KEEP_LOGGED_IN = "input[type='checkbox']"
SELECTOR_SUBMIT_BTN = "button[type='submit'].login100-form-btn"

# Error message selectors
SELECTOR_LOGIN_ERROR = ".error_message, #error-message, .alert-danger, .flash_message"

# Selectors on Results Page
SELECTOR_CARD_CONTAINER = ".card, .test-card, .box, div.row > div, div[class*='card']"

# Navigation & Timeout Settings
DEFAULT_NAV_TIMEOUT = 30000   # 30 seconds
DEFAULT_WAIT_TIMEOUT = 10000  # 10 seconds

# High-Speed 5 Concurrent Sessions:
# Tuned for Render Free Tier (512MB RAM):
# Chromium runs with --renderer-process-limit=2 and --js-flags=--max-old-space-size=96,
# allowing 5 sessions to check concurrently in parallel while keeping total RAM under ~280MB.
CONCURRENT_STUDENT_LIMIT = int(os.environ.get("CONCURRENT_STUDENT_LIMIT", "5"))
