import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable
from playwright.async_api import async_playwright, Browser, Playwright

from backend.database import get_all_students, get_student_by_id, get_setting
from backend.encryption import decrypt_text
from backend.automation.student_session import StudentSession
from backend.automation.login_handler import perform_portal_login
from backend.automation.website_config import CONCURRENT_STUDENT_LIMIT, FIXED_PORTAL_PASSWORD

logger = logging.getLogger("vraz.browser_manager")

class BrowserManager:
    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._lock: Optional[asyncio.Lock] = None

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def _get_browser(self) -> Browser:
        async with self._get_lock():
            if self._browser and self._browser.is_connected():
                return self._browser
            
            if not self._playwright:
                self._playwright = await async_playwright().start()

            # Try launching installed Edge or Chrome first (fast and reliable on Windows)
            launch_channels = ["msedge", "chrome", None]
            last_err = None
            for channel in launch_channels:
                try:
                    kwargs = {
                        "headless": True,
                        "args": [
                            "--no-sandbox",
                            "--disable-setuid-sandbox",
                            "--disable-dev-shm-usage",
                            "--disable-gpu",
                            "--disable-software-rasterizer",
                            "--disable-extensions",
                            "--disable-component-extensions-with-background-pages",
                            "--disable-default-apps",
                            "--mute-audio",
                            "--no-default-browser-check",
                            "--disable-background-networking",
                            "--disable-background-timer-throttling",
                            "--disable-backgrounding-occluded-windows",
                            "--disable-renderer-backgrounding",
                            "--disable-breakpad",
                            "--disable-sync",
                            "--blink-settings=imagesEnabled=false",
                            "--js-flags=--max-old-space-size=96",
                            "--renderer-process-limit=2",
                            "--no-zygote"
                        ]
                    }
                    if channel:
                        kwargs["channel"] = channel
                    
                    logger.info(f"Attempting browser launch with channel: {channel or 'default'}")
                    self._browser = await self._playwright.chromium.launch(**kwargs)
                    logger.info(f"Successfully launched browser (channel={channel})")
                    return self._browser
                except Exception as e:
                    last_err = e
                    logger.warning(f"Failed to launch with channel {channel}: {e}")

            raise RuntimeError(f"Could not launch browser: {last_err}")

    async def close(self):
        async with self._get_lock():
            if self._browser:
                try:
                    await self._browser.close()
                except Exception:
                    pass
                self._browser = None
            if self._playwright:
                try:
                    await self._playwright.stop()
                except Exception:
                    pass
                self._playwright = None

    def _resolve_student_password(self, student: Dict[str, Any]) -> str:
        """
        Resolves the student's password:
        Fixed permanently to 'abc@123' across all student accounts.
        """
        return FIXED_PORTAL_PASSWORD

    async def refresh_single_student(
        self,
        student_id: int,
        on_progress: Optional[Callable[[int, str, str], Awaitable[None]]] = None
    ) -> Dict[str, Any]:
        """
        Refreshes marks for a single student account independently.
        """
        student = get_student_by_id(student_id)
        if not student:
            return {"success": False, "error": "Student not found"}

        password = self._resolve_student_password(student)
        browser = await self._get_browser()

        session = StudentSession(
            student_id=student["id"],
            display_name=student["display_name"],
            user_id=student["user_id"],
            password=password,
            browser=browser,
            on_progress=on_progress
        )

        try:
            return await session.process()
        finally:
            try:
                await self.close()
                import gc
                gc.collect()
            except Exception:
                pass

    async def fetch_all_students(
        self,
        on_progress: Optional[Callable[[int, str, str], Awaitable[None]]] = None
    ) -> Dict[str, Any]:
        """
        Fetches marks for all 5 students CONCURRENTLY using independent browser sessions.
        One student's failure does NOT stop or impact the other four.
        """
        students = get_all_students()
        browser = await self._get_browser()

        # Build independent session handlers for each student
        sessions: List[StudentSession] = []
        for s in students:
            # Fetch full student record to obtain custom_password if any
            full_student = get_student_by_id(s["id"]) or s
            pwd = self._resolve_student_password(full_student)
            
            session = StudentSession(
                student_id=s["id"],
                display_name=s["display_name"],
                user_id=s["user_id"],
                password=pwd,
                browser=browser,
                on_progress=on_progress
            )
            sessions.append(session)

        # Execute all student sessions concurrently (all 10 simultaneous browser contexts)
        sem = asyncio.Semaphore(CONCURRENT_STUDENT_LIMIT)

        async def run_with_semaphore(sess: StudentSession):
            async with sem:
                return await sess.process()

        tasks = [run_with_semaphore(session) for session in sessions]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Immediately free all browser memory and trigger garbage collection
        try:
            await self.close()
            import gc
            gc.collect()
        except Exception as e:
            logger.debug(f"Post-batch browser cleanup error: {e}")

        # Aggregate final results summary
        processed_results: List[Dict[str, Any]] = []
        successful_count = 0
        failed_count = 0
        total_available = 0
        total_pending = 0
        attention_count = 0

        for idx, res in enumerate(results):
            student_info = students[idx]
            if isinstance(res, Exception):
                logger.error(f"Unhandled exception in session for {student_info['display_name']}: {res}")
                failed_count += 1
                attention_count += 1
                processed_results.append({
                    "student_id": student_info["id"],
                    "display_name": student_info["display_name"],
                    "success": False,
                    "status": "Error",
                    "error": str(res)
                })
            else:
                processed_results.append(res)
                if res.get("success"):
                    successful_count += 1
                    total_available += res.get("available_count", 0)
                    total_pending += res.get("pending_count", 0)
                    if res.get("status") in ["Result Pending", "Partial"]:
                        attention_count += 1
                else:
                    failed_count += 1
                    attention_count += 1

        summary = {
            "total_accounts": len(students),
            "successful_retrievals": successful_count,
            "failed_retrievals": failed_count,
            "available_scores": total_available,
            "pending_scores": total_pending,
            "accounts_requiring_attention": attention_count,
            "students_data": processed_results
        }

        return summary

    async def test_student_login(self, student_id: int, user_id: str, password: Optional[str] = None) -> tuple[bool, str]:
        """
        Tests login credentials for a specific account without storing marks.
        """
        student = get_student_by_id(student_id)
        if not student:
            return False, "Student not found"

        effective_pwd = password or self._resolve_student_password(student)
        if not effective_pwd:
            return False, "Password not configured"

        browser = await self._get_browser()
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        try:
            success, message = await perform_portal_login(page, user_id, effective_pwd)
            return success, message
        finally:
            await page.close()
            await context.close()
            try:
                await self.close()
                import gc
                gc.collect()
            except Exception:
                pass

# Singleton browser manager instance
browser_manager = BrowserManager()
