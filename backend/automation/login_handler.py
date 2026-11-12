import asyncio
import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError
from backend.automation.website_config import (
    LOGIN_URL, RESULTS_URL, DASHBOARD_BRIDGE_URL, SELECTOR_USER_ID, SELECTOR_PASSWORD,
    SELECTOR_KEEP_LOGGED_IN, SELECTOR_SUBMIT_BTN, SELECTOR_LOGIN_ERROR,
    DEFAULT_NAV_TIMEOUT, DEFAULT_WAIT_TIMEOUT
)

logger = logging.getLogger("vraz.login")

async def is_session_authenticated(page: Page) -> bool:
    """
    Checks if the current browser context is already authenticated
    by navigating via the dashboard bridge URL.
    """
    try:
        response = await page.goto(DASHBOARD_BRIDGE_URL, wait_until="domcontentloaded", timeout=DEFAULT_NAV_TIMEOUT)
        current_url = page.url.lower()

        # If redirected to login, session is not active
        if "login" in current_url or "dynamicwl/login" in current_url:
            return False

        # If redirected to cdmypage or test portal
        if "cdmypage" in current_url or "pages/" in current_url:
            return True
        return False
    except Exception as e:
        logger.warning(f"Session validation check exception: {e}")
        return False

async def perform_portal_login(page: Page, user_id: str, password: str) -> tuple[bool, str]:
    """
    Executes automated login for a single student account.
    Returns (success: bool, message: str).
    """
    if not user_id or not password:
        return False, "Missing User ID or password configuration"

    try:
        logger.info(f"Navigating to login page: {LOGIN_URL}")
        await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=DEFAULT_NAV_TIMEOUT)

        # Wait for user id and password inputs to be visible
        await page.wait_for_selector(SELECTOR_USER_ID, timeout=DEFAULT_WAIT_TIMEOUT)
        await page.wait_for_selector(SELECTOR_PASSWORD, timeout=DEFAULT_WAIT_TIMEOUT)

        # Check if OTP or additional verification is required upfront
        otp_field = page.locator("input[name='otp'], #otp, input[placeholder*='OTP']")
        if await otp_field.count() > 0 and await otp_field.is_visible():
            return False, "Portal requested unexpected OTP verification. Manual intervention required."

        # Fill credentials
        await page.fill(SELECTOR_USER_ID, user_id)
        await page.fill(SELECTOR_PASSWORD, password)

        # Ensure Keep Me Logged In is checked if present
        checkbox = page.locator(SELECTOR_KEEP_LOGGED_IN)
        if await checkbox.count() > 0:
            try:
                if not await checkbox.is_checked():
                    await checkbox.check()
            except Exception:
                pass

        # Click Login button
        submit_btn = page.locator(SELECTOR_SUBMIT_BTN)
        if await submit_btn.count() == 0:
            submit_btn = page.locator("button[type='submit']")

        logger.info("Submitting login form...")
        await submit_btn.click()

        # Wait for either URL navigation or error alert
        # We poll or wait for navigation up to 15 seconds
        start_time = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - start_time < 15:
            current_url = page.url.lower()

            # Check for error banners
            error_loc = page.locator(SELECTOR_LOGIN_ERROR)
            if await error_loc.count() > 0:
                for idx in range(await error_loc.count()):
                    item = error_loc.nth(idx)
                    if await item.is_visible():
                        err_text = (await item.inner_text()).strip()
                        if err_text:
                            return False, f"Login failed: {err_text}"

            # Check if URL redirected to portal or results
            if "login" not in current_url:
                logger.info(f"Login successful, navigated to: {current_url}")
                return True, "Login successful"

            # Check for OTP modal/dialog appearing post-submit
            if await otp_field.count() > 0 and await otp_field.is_visible():
                return False, "Portal requested OTP verification after credentials. Manual authorization needed."

            await asyncio.sleep(0.5)

        # If still on login page after wait
        if "login" in page.url.lower():
            # Check once more for any error text on page
            body_text = await page.inner_text("body")
            if "invalid" in body_text.lower() or "incorrect" in body_text.lower():
                return False, "Invalid User ID or password"
            return False, "Login timed out without navigation"

        return True, "Login successful"

    except PlaywrightTimeoutError:
        return False, "Connection or page load timed out"
    except Exception as ex:
        logger.error(f"Login execution error: {ex}", exc_info=True)
        return False, f"Login error: {str(ex)}"
