from fastapi import APIRouter, Depends
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
async def read_users_me(current=Depends(get_current_user)):
    return {"id": current["user"].id, "email": current["user"].email}