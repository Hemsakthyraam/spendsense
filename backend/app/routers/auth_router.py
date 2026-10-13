from fastapi import APIRouter, HTTPException, status, Depends, Request
from backend.app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, AuditLogResponse
from backend.app.auth import hash_password, verify_password, create_access_token, get_current_user
from backend.app.database import get_db
from backend.app.audit import log_audit_event, get_user_audit_logs

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, request: Request):
    """Register a new user with secure password hashing."""
    client_ip = request.client.host if request.client else "unknown"
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check existing username
        cursor.execute("SELECT id FROM users WHERE username = ?", (user_data.username.lower().strip(),))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this username already exists."
            )
        
        # Check existing email
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email.lower().strip(),))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address is already registered."
            )
        
        # Hash password and insert
        hashed = hash_password(user_data.password)
        cursor.execute(
            """
            INSERT INTO users (username, email, hashed_password, full_name)
            VALUES (?, ?, ?, ?)
            """,
            (user_data.username.lower().strip(), user_data.email.lower().strip(), hashed, user_data.full_name)
        )
        new_id = cursor.lastrowid
        
        cursor.execute("SELECT id, username, email, full_name, created_at FROM users WHERE id = ?", (new_id,))
        user_row = dict(cursor.fetchone())

    # Log audit event
    log_audit_event("USER_REGISTER", user_id=new_id, details=f"New user registered: {user_data.username}", ip_address=client_ip)

    # Issue JWT
    token = create_access_token({"sub": str(new_id), "username": user_row["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_row
    }

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, request: Request):
    """Authenticate user with username or email and return JWT."""
    client_ip = request.client.host if request.client else "unknown"
    identifier = login_data.username.lower().strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, email, hashed_password, full_name, created_at FROM users WHERE username = ? OR email = ?",
            (identifier, identifier)
        )
        user_row = cursor.fetchone()

    if not user_row or not verify_password(login_data.password, user_row["hashed_password"]):
        # Do not expose whether username or password was wrong
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_dict = {
        "id": user_row["id"],
        "username": user_row["username"],
        "email": user_row["email"],
        "full_name": user_row["full_name"],
        "created_at": str(user_row["created_at"])
    }

    # Log audit event
    log_audit_event("USER_LOGIN", user_id=user_dict["id"], details=f"User logged in: {user_dict['username']}", ip_address=client_ip)

    token = create_access_token({"sub": str(user_dict["id"]), "username": user_dict["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Return currently authenticated user information."""
    return current_user

@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_my_audit_logs(current_user: dict = Depends(get_current_user)):
    """Return audit trail events for current user."""
    return get_user_audit_logs(current_user["id"])
