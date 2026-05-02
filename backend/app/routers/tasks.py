from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.utils.supabase import get_supabase_client
from app.services.ai import generate_script
from app.services.automator import run_playwright_script
import traceback

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    instruction: str

@router.post("/")
async def create_task(task: TaskCreate, background_tasks: BackgroundTasks, current=Depends(get_current_user)):
    user = current["user"]
    token = current["token"]
    supabase = get_supabase_client(jwt=token)

    try:
        # Insert pending task
        data = {
            "user_id": user.id,
            "instruction": task.instruction,
            "status": "pending"
        }
        res = supabase.table("tasks").insert(data).execute()
        task_id = res.data[0]["id"]

        # Generate script using AI
        try:
            script = generate_script(task.instruction)
            supabase.table("tasks").update({"script": script}).eq("id", task_id).execute()
        except Exception as e:
            error_msg = f"AI generation error: {str(e)}"
            print(error_msg)
            print(traceback.format_exc())
            supabase.table("tasks").update({
                "status": "failed",
                "result": error_msg
            }).eq("id", task_id).execute()
            return {"task_id": task_id, "status": "failed", "error": error_msg}

        # Run automation in background
        background_tasks.add_task(run_playwright_script, script, task_id, user.id, token)
        return {"task_id": task_id, "status": "pending"}
    except Exception as e:
        print(f"Unexpected error in create_task: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_tasks(current=Depends(get_current_user)):
    user = current["user"]
    token = current["token"]
    supabase = get_supabase_client(jwt=token)

    try:
        res = supabase.table("tasks").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        print(f"Error listing tasks: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}")
async def get_task(task_id: int, current=Depends(get_current_user)):
    user = current["user"]
    token = current["token"]
    supabase = get_supabase_client(jwt=token)

    try:
        res = supabase.table("tasks").select("*").eq("id", task_id).eq("user_id", user.id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        return res.data
    except Exception as e:
        print(f"Error getting task {task_id}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    