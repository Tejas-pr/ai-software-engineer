from fastapi import APIRouter

router = APIRouter(prefix="/accounts/auth", tags=["auth"])


@router.get("/me/")
def get_me():
    return {
        "id": "1",
        "username": "tejas_dev",
        "email": "tejas@example.com",
        "is_superuser": True,
        "is_marketplace_admin": True,
    }
