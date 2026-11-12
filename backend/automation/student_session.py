import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Callable, Awaitable
from playwright.async_api import Browser, BrowserContext, Page

from backend.automation.website_config import RESULTS_URL, DASHBOARD_BRIDGE_URL, DEFAULT_NAV_TIMEOUT, FIXED_PORTAL_PASSWORD
from backend.automation.login_handler import is_session_authenticated, perform_portal_login
from backend.automation.marks_extractor import extract_cards_from_html
from backend.database import save_or_update_test_result, update_student_status

logger = logging.getLogger("vraz.student_session")
SESSIONS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "sessions"

class StudentSession:
    def __init__(
        self,
        student_id: int,
        display_name: str,
        user_id: str,
        password: str,
        browser: Browser,
        on_progress: Optional[Callable[[int, str, str], Awaitable[None]]] = None
    ):
        self.student_id = student_id
        self.display_name = display_name
        self.user_id = user_id.strip()
        self.password = password or FIXED_PORTAL_PASSWORD
        self.browser = browser
        self.on_progress = on_progress
        self.storage_state_path = SESSIONS_DIR / f"student_{student_id}_state.json"
        SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

    async def _emit_progress(self, status: str, message: str):
        logger.info(f"[{self.display_name}] {status}: {message}")
        if self.on_progress:
            try:
                await self.on_progress(self.student_id, status, message)
            except Exception as e:
                logger.debug(f"Progress emit error: {e}")

    async def process(self) -> Dict[str, Any]:
        """
        Executes the full marks retrieval lifecycle for this student:
        1. Context creation with isolated cookie/storage jar.
        2. Authentication check / auto-login.
        3. Results page navigation.
        4. Cards extraction and database persistence.
        """
        if not self.user_id:
            await self._emit_progress("ERROR", "User ID is not configured")
            update_student_status(self.student_id, "Missing User ID")
            return {
                "student_id": self.student_id,
                "display_name": self.display_name,
                "success": False,
                "status": "Missing User ID",
                "cards_count": 0,
                "error": "No User ID specified"
            }

        if not self.password:
            await self._emit_progress("ERROR", "Password is not configured")
            update_student_status(self.student_id, "Missing Password")
            return {
                "student_id": self.student_id,
                "display_name": self.display_name,
                "success": False,
                "status": "Missing Password",
                "cards_count": 0,
                "error": "No password configured"
            }

        context: Optional[BrowserContext] = None
        page: Optional[Page] = None

        try:
            await self._emit_progress("INITIALIZING", "Initializing independent browser session...")
            
            # Isolated browser context for this specific student
            context_kwargs = {
                "viewport": {"width": 1280, "height": 800},
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }

            if self.storage_state_path.exists():
                try:
                    context_kwargs["storage_state"] = str(self.storage_state_path)
                except Exception:
                    pass

            context = await self.browser.new_context(**context_kwargs)
            page = await context.new_page()

            # Turbocharged network filter: abort images, fonts, and third-party trackers
            async def _route_filter(route):
                req = route.request
                if req.resource_type in ["image", "media", "font"]:
                    await route.abort()
                elif any(t in req.url.lower() for t in ["googleadservices", "googletagmanager", "google-analytics", "fontawesome"]):
                    await route.abort()
                else:
                    await route.continue_()

            await page.route("**/*", _route_filter)

            # Step 1: Check existing authenticated session
            await self._emit_progress("CHECKING_SESSION", "Checking existing login session...")
            logged_in = False
            if self.storage_state_path.exists():
                logged_in = await is_session_authenticated(page)

            # Step 2: Auto-login if needed
            if not logged_in:
                await self._emit_progress("LOGGING_IN", "Authenticating credentials...")
                success, msg = await perform_portal_login(page, self.user_id, self.password)
                if not success:
                    await self._emit_progress("ERROR", msg)
                    update_student_status(self.student_id, "Login Failed")
                    return {
                        "student_id": self.student_id,
                        "display_name": self.display_name,
                        "success": False,
                        "status": "Login Failed",
                        "cards_count": 0,
                        "error": msg
                    }
                
                # Persist fresh session state
                try:
                    await context.storage_state(path=str(self.storage_state_path))
                except Exception as e:
                    logger.warning(f"Could not persist storage state: {e}")

                # Navigate via bridge to reach cdmypage.php
                await self._emit_progress("NAVIGATING", "Navigating to examination results portal...")
                await page.goto(DASHBOARD_BRIDGE_URL, wait_until="domcontentloaded", timeout=DEFAULT_NAV_TIMEOUT)
            else:
                # If already navigated to cdmypage during session verification, avoid redundant reload
                if "cdmypage" not in page.url.lower():
                    await self._emit_progress("NAVIGATING", "Navigating to examination results portal...")
                    await page.goto(DASHBOARD_BRIDGE_URL, wait_until="domcontentloaded", timeout=DEFAULT_NAV_TIMEOUT)

            # Wait for content or cards to be present (fast debounce)
            await self._emit_progress("EXTRACTING", "Extracting examination cards and scores...")
            try:
                await page.wait_for_selector("#report_table tr td, .card, div[class*='card']", timeout=8000)
            except Exception:
                pass
            await page.wait_for_timeout(400)

            html_content = await page.content()
            cards = extract_cards_from_html(html_content)

            if not cards:
                # If no cards extracted, check if page says 'No records found' or similar
                logger.info(f"[{self.display_name}] No cards parsed from results page HTML")
                update_student_status(self.student_id, "No Marks Found")
                await self._emit_progress("COMPLETED", "No examination results currently posted")
                return {
                    "student_id": self.student_id,
                    "display_name": self.display_name,
                    "success": True,
                    "status": "No Marks Found",
                    "cards_count": 0,
                    "results": []
                }

            # Save extracted cards to database
            pending_count = 0
            available_count = 0
            for card in cards:
                save_or_update_test_result(
                    student_id=self.student_id,
                    exam_category=card["exam_category"],
                    test_name=card["test_name"],
                    paper_type=card["paper_type"],
                    exam_date=card["exam_date"],
                    sort_date=card.get("sort_date"),
                    exam_time=card["exam_time"],
                    marks_obtained=card["marks_obtained"],
                    max_marks=card["max_marks"],
                    percentage=card["percentage"],
                    duration=card["duration"],
                    result_status=card["result_status"],
                    raw_score_text=card["raw_score_text"]
                )
                if card["result_status"] == "Pending":
                    pending_count += 1
                elif card["result_status"] == "Available":
                    available_count += 1

            final_status = "Retrieved"
            if pending_count > 0 and available_count == 0:
                final_status = "Result Pending"
            elif pending_count > 0 and available_count > 0:
                final_status = "Partial"

            update_student_status(self.student_id, final_status)
            await self._emit_progress("COMPLETED", f"Successfully extracted {len(cards)} examination results ({available_count} available, {pending_count} pending)")

            return {
                "student_id": self.student_id,
                "display_name": self.display_name,
                "success": True,
                "status": final_status,
                "cards_count": len(cards),
                "available_count": available_count,
                "pending_count": pending_count,
                "results": cards
            }

        except Exception as ex:
            logger.error(f"Error processing student {self.display_name}: {ex}", exc_info=True)
            err_msg = str(ex)
            await self._emit_progress("ERROR", f"Retrieval failed: {err_msg}")
            update_student_status(self.student_id, "Error")
            return {
                "student_id": self.student_id,
                "display_name": self.display_name,
                "success": False,
                "status": "Error",
                "cards_count": 0,
                "error": err_msg
            }
        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass
            if context:
                try:
                    await context.close()
                except Exception:
                    pass
