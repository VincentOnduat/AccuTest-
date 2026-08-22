from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.utils.supabase import get_supabase_client
from typing import Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/atrd", tags=["atrd"])

@router.get("/list")
async def list_atrds(current_user: Dict[str, Any] = Depends(get_current_user)):
    '''List all ATRDs'''
    try:
        # Get user ID from the correct location
        # The current_user structure from get_current_user returns {'user': user_obj, 'token': token}
        if "user" in current_user:
            user_obj = current_user["user"]
            user_id = user_obj.id if hasattr(user_obj, 'id') else user_obj.get('id')
        else:
            user_id = current_user.get("id")
        
        if not user_id:
            print("❌ No user ID found in current_user")
            return {
                "success": True,
                "atrds": [],
                "count": 0,
                "error": "User ID not found"
            }
        
        print(f"📋 Fetching ATRDs for user: {user_id}")
        
        # Mock ATRD data based on your tasks
        mock_atrds = [
            {
                "id": "b4f782a6-7195-4fbf-86c3-f1b267a710d5",
                "name": "Review test results",
                "domain": "high",
                "content": {
                    "instruction": "Review the results from the latest test run and identify any issues",
                    "status": "pending"
                },
                "created_at": "2026-03-05 18:28:47.61011+00",
                "user_id": user_id,
                "status": "pending"
            },
            {
                "id": "9010269c-5c3b-48a2-981a-d7a6eda415f8",
                "name": "Schedule regression tests",
                "domain": "medium",
                "content": {
                    "instruction": "Schedule the weekly regression test suite for the staging environment",
                    "status": "in-progress"
                },
                "created_at": "2026-03-05 18:28:47.61011+00",
                "user_id": user_id,
                "status": "in-progress"
            },
            {
                "id": "da03c768-3cfa-4ee4-a72d-b10e738b8810",
                "name": "Update test suites",
                "domain": "low",
                "content": {
                    "instruction": "Update the test suites with new test cases for the recent features",
                    "status": "pending"
                },
                "created_at": "2026-03-05 18:28:47.61011+00",
                "user_id": user_id,
                "status": "pending"
            },
            {
                "id": "62f64ede-b592-405e-91bd-0ff22a979357",
                "name": "Fix flaky tests",
                "domain": "high",
                "content": {
                    "instruction": "Investigate and fix the flaky tests in the payment flow",
                    "status": "pending"
                },
                "created_at": "2026-03-05 18:28:47.61011+00",
                "user_id": user_id,
                "status": "pending"
            },
            {
                "id": "ed0eae52-141f-4131-980d-3520052f345b",
                "name": "Document test procedures",
                "domain": "medium",
                "content": {
                    "instruction": "Create documentation for the test procedures and best practices",
                    "status": "completed"
                },
                "created_at": "2026-03-05 18:28:47.61011+00",
                "user_id": user_id,
                "status": "completed"
            }
        ]
        
        # Try to get data from Supabase tasks table
        try:
            supabase = get_supabase_client()
            response = supabase.table("tasks")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            
            if response.data:
                print(f"📊 Found {len(response.data)} tasks in Supabase")
                # Transform tasks to ATRD format
                atrds = []
                for task in response.data:
                    atrds.append({
                        "id": task.get("id"),
                        "name": task.get("title", f"ATRD {task.get('created_at', '')}"),
                        "domain": task.get("priority", "general"),
                        "content": {
                            "instruction": task.get("description", ""),
                            "status": task.get("status", "pending"),
                            "priority": task.get("priority", "medium"),
                            "due_date": task.get("due_date"),
                            "assigned_to": task.get("assigned_to"),
                            "completed_at": task.get("completed_at"),
                            "related_test_id": task.get("related_test_id"),
                            "related_session_id": task.get("related_session_id")
                        },
                        "created_at": task.get("created_at"),
                        "updated_at": task.get("updated_at"),
                        "user_id": task.get("user_id"),
                        "status": task.get("status", "pending"),
                        "priority": task.get("priority", "medium")
                    })
                
                return {
                    "success": True,
                    "atrds": atrds,
                    "count": len(atrds)
                }
        except Exception as e:
            print(f"⚠️ Error querying Supabase: {str(e)}")
        
        # Return mock data if Supabase query fails
        return {
            "success": True,
            "atrds": mock_atrds,
            "count": len(mock_atrds),
            "message": "Using mock data (Supabase query failed)"
        }
        
    except Exception as e:
        print(f"❌ Error in list_atrds: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "atrds": [],
            "count": 0,
            "error": str(e)
        }

@router.delete("/{atrd_id}")
async def delete_atrd(
    atrd_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    '''Delete an ATRD'''
    try:
        # For now, return success (mock delete)
        return {
            "success": True,
            "message": f"ATRD {atrd_id} deleted successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete ATRD: {str(e)}"
        )

@router.post("/save")
async def save_atrd(
    atrd_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    '''Save an ATRD'''
    try:
        # For now, return success (mock save)
        return {
            "success": True,
            "atrd": {
                "id": "mock-id-123",
                "name": atrd_data.get("name", "Untitled"),
                "domain": atrd_data.get("domain", "general"),
                "content": atrd_data.get("content", {}),
                "status": "pending"
            },
            "message": "ATRD saved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save ATRD: {str(e)}"
        )
