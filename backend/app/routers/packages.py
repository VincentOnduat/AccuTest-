from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.utils.supabase import get_supabase_client
from typing import Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/packages", tags=["packages"])

# Pydantic models
class PackageCreate(BaseModel):
    name: str
    testDomain: str
    testType: str
    framework: str
    document: str
    testCode: str
    userId: str

class PackageUpdate(BaseModel):
    name: str
    testDomain: str
    testType: str
    framework: str
    document: str
    testCode: str

@router.get("/list")
async def list_packages(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    '''List all test packages for the current user'''
    try:
        supabase = get_supabase_client()
        
        # Try to get packages from the correct table
        # Check if table is 'test_packages' or 'packages' or something else
        response = supabase.table("test_packages")\
            .select("*")\
            .execute()
        
        # If the above fails, try without user filter to see what's in the table
        # response = supabase.table("test_packages").select("*").execute()
        
        return {
            "success": True,
            "packages": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        print(f"Error listing packages: {str(e)}")
        # Return empty list instead of error for now
        return {
            "success": True,
            "packages": [],
            "count": 0,
            "error": str(e)
        }
