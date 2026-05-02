import uuid
import asyncio
from playwright.async_api import async_playwright
from app.utils.supabase import get_supabase_client

async def run_playwright_script(script_code: str, task_id: str, user_id: str, token: str):
    """Executes generated Playwright code and uploads screenshot to Supabase."""
    supabase = get_supabase_client(jwt=token)
    screenshot_path = f"C:\\Windows\\Temp\\{uuid.uuid4()}.png"
    result_log = ""
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            # Prepare and execute the async function
            exec_globals = {"page": page, "__builtins__": __builtins__}
            exec_locals = {}
            exec(f"async def __ex():\n{script_code}\n    return await run(page)", exec_globals, exec_locals)
            await exec_locals["__ex"]()
            await page.screenshot(path=screenshot_path)
            result_log = "Success"
        except Exception as e:
            result_log = f"Error: {str(e)}"
            try:
                await page.screenshot(path=screenshot_path)
            except:
                pass
        finally:
            await browser.close()

    # Upload screenshot to Supabase Storage
    try:
        with open(screenshot_path, "rb") as f:
            supabase.storage.from_("screenshots").upload(
                file=f,
                path=f"{user_id}/{task_id}.png",
                file_options={"content-type": "image/png"}
            )
        public_url = supabase.storage.from_("screenshots").get_public_url(f"{user_id}/{task_id}.png")
    except Exception as e:
        public_url = None
        result_log += f" | Screenshot upload failed: {e}"

    # Update task record
    supabase.table("tasks").update({
        "status": "completed" if "Error" not in result_log else "failed",
        "result": result_log,
        "screenshot_url": public_url
    }).eq("id", task_id).execute()
    
    return result_log