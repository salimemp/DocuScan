"""
Authentication Module for DocScan Pro
Supports: Email/Password, Magic Link, Google OAuth, Apple Sign-In, 2FA (TOTP/Hardware), Passkeys, Biometrics
"""
import os
import secrets
import hashlib
import base64
import uuid
import pyotp
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, Request, Response, Depends, Header
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
import jwt
import resend
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    AttestationConveyancePreference,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

# Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24 * 7  # 7 days
MAGIC_LINK_EXPIRY_MINUTES = 15
EMAIL_CONFIRMATION_EXPIRY_HOURS = 24
TOTP_ISSUER = 'DocScan Pro'
RP_ID = os.environ.get('RP_ID', 'localhost')
RP_NAME = 'DocScan Pro'
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Password Validation ──────────────────────────────────────────────────────

import re
import aiohttp

def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """Validate password meets security requirements."""
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters")
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', password):
        errors.append("Password must contain at least one number")
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        errors.append("Password must contain at least one special character")
    
    return len(errors) == 0, errors

async def check_password_breach(password: str) -> tuple[bool, int]:
    """Check if password has been exposed in data breaches using HaveIBeenPwned API."""
    try:
        # Hash the password using SHA-1
        password_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        prefix = password_hash[:5]
        suffix = password_hash[5:]
        
        # Query HaveIBeenPwned API with k-anonymity
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f'https://api.pwnedpasswords.com/range/{prefix}',
                headers={'Add-Padding': 'true'}
            ) as response:
                if response.status != 200:
                    return False, 0
                
                text = await response.text()
                lines = text.split('\n')
                
                for line in lines:
                    parts = line.strip().split(':')
                    if len(parts) == 2 and parts[0] == suffix:
                        return True, int(parts[1])
                
                return False, 0
    except Exception as e:
        print(f"Error checking breached password: {e}")
        return False, 0

# ── Pydantic Models ────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MagicLinkRequest(BaseModel):
    email: EmailStr

class EmailConfirmation(BaseModel):
    token: str

class TwoFactorSetup(BaseModel):
    user_id: str

class TwoFactorVerify(BaseModel):
    user_id: str
    code: str

class PasskeyRegisterStart(BaseModel):
    user_id: str

class PasskeyRegisterFinish(BaseModel):
    user_id: str
    credential: Dict[str, Any]

class PasskeyAuthStart(BaseModel):
    email: EmailStr

class PasskeyAuthFinish(BaseModel):
    email: EmailStr
    credential: Dict[str, Any]

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    email_verified: bool = False
    two_factor_enabled: bool = False
    passkey_enabled: bool = False
    subscription_tier: Optional[str] = None
    created_at: datetime

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserResponse
    requires_2fa: bool = False

# ── Helper Functions ────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, hashed = stored_hash.split(':')
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed
    except:
        return False

def create_jwt_token(user_id: str, email: str, token_type: str = "access") -> str:
    """Create JWT token"""
    expiry = JWT_EXPIRY_HOURS if token_type == "access" else JWT_EXPIRY_HOURS * 4
    payload = {
        "user_id": user_id,
        "email": email,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry),
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[Dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_verification_token() -> str:
    """Generate secure verification token"""
    return secrets.token_urlsafe(32)

def generate_totp_secret() -> str:
    """Generate TOTP secret for 2FA"""
    return pyotp.random_base32()

def verify_totp(secret: str, code: str) -> bool:
    """Verify TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

def get_totp_uri(secret: str, email: str) -> str:
    """Get TOTP provisioning URI for QR code"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=TOTP_ISSUER)

async def send_verification_email(email: str, token: str, email_type: str = "confirmation"):
    """Send verification email using Resend"""
    try:
        if email_type == "confirmation":
            subject = "Confirm Your Email - DocScan Pro"
            link = f"{BACKEND_URL}/api/auth/confirm-email?token={token}"
            html = f"""
            <html>
            <body style="font-family: -apple-system, sans-serif; background: #F3F4F6; padding: 40px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
                    <h1 style="color: #2563EB; margin-bottom: 24px;">Welcome to DocScan Pro!</h1>
                    <p style="color: #374151; line-height: 1.6;">Please confirm your email address by clicking the button below:</p>
                    <a href="{link}" style="display: inline-block; background: #2563EB; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin: 24px 0; font-weight: 600;">Confirm Email</a>
                    <p style="color: #6B7280; font-size: 14px;">This link expires in 24 hours.</p>
                </div>
            </body>
            </html>
            """
        elif email_type == "magic_link":
            subject = "Your Magic Link - DocScan Pro"
            link = f"{BACKEND_URL}/api/auth/magic-link/verify?token={token}"
            html = f"""
            <html>
            <body style="font-family: -apple-system, sans-serif; background: #F3F4F6; padding: 40px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
                    <h1 style="color: #7C3AED; margin-bottom: 24px;">Sign In to DocScan Pro</h1>
                    <p style="color: #374151; line-height: 1.6;">Click the button below to sign in instantly:</p>
                    <a href="{link}" style="display: inline-block; background: #7C3AED; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin: 24px 0; font-weight: 600;">Sign In Now</a>
                    <p style="color: #6B7280; font-size: 14px;">This link expires in 15 minutes.</p>
                </div>
            </body>
            </html>
            """
        elif email_type == "password_reset":
            subject = "Reset Your Password - DocScan Pro"
            link = f"{BACKEND_URL}/api/auth/reset-password?token={token}"
            html = f"""
            <html>
            <body style="font-family: -apple-system, sans-serif; background: #F3F4F6; padding: 40px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
                    <h1 style="color: #DC2626; margin-bottom: 24px;">Reset Your Password</h1>
                    <p style="color: #374151; line-height: 1.6;">Click the button below to reset your password:</p>
                    <a href="{link}" style="display: inline-block; background: #DC2626; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin: 24px 0; font-weight: 600;">Reset Password</a>
                    <p style="color: #6B7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                </div>
            </body>
            </html>
            """
        elif email_type == "2fa_code":
            subject = "Your 2FA Code - DocScan Pro"
            html = f"""
            <html>
            <body style="font-family: -apple-system, sans-serif; background: #F3F4F6; padding: 40px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; text-align: center;">
                    <h1 style="color: #059669; margin-bottom: 24px;">Your Verification Code</h1>
                    <div style="background: #F3F4F6; padding: 24px; border-radius: 12px; margin: 24px 0;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1F2937;">{token}</span>
                    </div>
                    <p style="color: #6B7280; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
            </body>
            </html>
            """
        else:
            return False

        resend.Emails.send({
            "from": "DocScan Pro <noreply@docscanpro.com>",
            "to": [email],
            "subject": subject,
            "html": html
        })
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False

# ── Database Dependency ────────────────────────────────────────────────────

def get_db():
    """Get database instance - this will be overridden by main app"""
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ.get('DB_NAME', 'docscan')]

# ── Authentication Middleware ────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Optional[Dict]:
    """Get current user from JWT token"""
    token = None
    
    # Try cookie first
    token = request.cookies.get("access_token")
    
    # Then try Authorization header
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
    
    if not token:
        return None
    
    payload = verify_jwt_token(token)
    if not payload:
        return None
    
    db = get_db()
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    return user

async def require_auth(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Dict:
    """Require authenticated user"""
    user = await get_current_user(request, authorization)
    if not user:
        raise HTTPException(401, "Authentication required")
    return user

# ── Auth Endpoints ────────────────────────────────────────────────────────

@auth_router.post("/register", response_model=AuthResponse)
async def register(data: UserRegister, request: Request):
    """Register new user with email/password"""
    db = get_db()
    
    # Validate password strength
    is_valid, errors = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(400, errors[0])
    
    # Check if password has been breached
    is_breached, breach_count = await check_password_breach(data.password)
    if is_breached:
        raise HTTPException(
            400, 
            f"This password has been exposed in {breach_count:,} data breaches. Please choose a different password."
        )
    
    # Check if email exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    verification_token = generate_verification_token()
    
    user_doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "email_verified": False,
        "two_factor_enabled": False,
        "two_factor_secret": None,
        "passkey_enabled": False,
        "passkeys": [],
        "subscription_tier": None,
        "stripe_customer_id": None,
        "picture": None,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Store verification token
    await db.email_verifications.insert_one({
        "user_id": user_id,
        "token": verification_token,
        "type": "email_confirmation",
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=EMAIL_CONFIRMATION_EXPIRY_HOURS),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Send confirmation email
    await send_verification_email(data.email, verification_token, "confirmation")
    
    # Create tokens
    access_token = create_jwt_token(user_id, data.email, "access")
    refresh_token = create_jwt_token(user_id, data.email, "refresh")
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_EXPIRY_HOURS * 3600,
        user=UserResponse(
            user_id=user_id,
            email=data.email.lower(),
            name=data.name,
            email_verified=False,
            two_factor_enabled=False,
            passkey_enabled=False,
            created_at=user_doc["created_at"]
        )
    )

@auth_router.post("/login", response_model=AuthResponse)
async def login(data: UserLogin, response: Response):
    """Login with email/password"""
    db = get_db()
    
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid email or password")
    
    if not user.get("password_hash"):
        raise HTTPException(400, "Please use social login or magic link for this account")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    
    # Check if 2FA is enabled
    if user.get("two_factor_enabled"):
        # Return partial response requiring 2FA
        temp_token = create_jwt_token(user["user_id"], user["email"], "2fa_pending")
        return AuthResponse(
            access_token=temp_token,
            refresh_token="",
            expires_in=600,  # 10 minutes to complete 2FA
            user=UserResponse(**{k: user.get(k) for k in UserResponse.__fields__}),
            requires_2fa=True
        )
    
    # Create tokens
    access_token = create_jwt_token(user["user_id"], user["email"], "access")
    refresh_token = create_jwt_token(user["user_id"], user["email"], "refresh")
    
    # Set cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_EXPIRY_HOURS * 3600,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user.get("name", ""),
            picture=user.get("picture"),
            email_verified=user.get("email_verified", False),
            two_factor_enabled=user.get("two_factor_enabled", False),
            passkey_enabled=user.get("passkey_enabled", False),
            subscription_tier=user.get("subscription_tier"),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
    )

@auth_router.post("/login/2fa")
async def verify_2fa_login(data: TwoFactorVerify, response: Response):
    """Verify 2FA code to complete login"""
    db = get_db()
    
    # Verify the pending 2FA token
    payload = verify_jwt_token(data.user_id)  # user_id is actually the temp token here
    if not payload or payload.get("type") != "2fa_pending":
        raise HTTPException(401, "Invalid or expired 2FA session")
    
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user or not user.get("two_factor_secret"):
        raise HTTPException(400, "2FA not configured")
    
    # Verify TOTP code
    if not verify_totp(user["two_factor_secret"], data.code):
        raise HTTPException(401, "Invalid 2FA code")
    
    # Create full tokens
    access_token = create_jwt_token(user["user_id"], user["email"], "access")
    refresh_token = create_jwt_token(user["user_id"], user["email"], "refresh")
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_EXPIRY_HOURS * 3600,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user.get("name", ""),
            picture=user.get("picture"),
            email_verified=user.get("email_verified", False),
            two_factor_enabled=True,
            passkey_enabled=user.get("passkey_enabled", False),
            subscription_tier=user.get("subscription_tier"),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
    )

@auth_router.post("/magic-link/request")
async def request_magic_link(data: MagicLinkRequest):
    """Request magic link for passwordless login"""
    db = get_db()
    
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists, a magic link has been sent"}
    
    token = generate_verification_token()
    
    await db.magic_links.insert_one({
        "user_id": user["user_id"],
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES),
        "used": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    await send_verification_email(data.email, token, "magic_link")
    
    return {"message": "If an account exists, a magic link has been sent"}

@auth_router.get("/magic-link/verify")
async def verify_magic_link(token: str, response: Response):
    """Verify magic link and login user"""
    db = get_db()
    
    magic_link = await db.magic_links.find_one({
        "token": token,
        "used": False
    })
    
    if not magic_link:
        raise HTTPException(400, "Invalid or expired magic link")
    
    # Check expiry
    expires_at = magic_link["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Magic link has expired")
    
    # Mark as used
    await db.magic_links.update_one(
        {"token": token},
        {"$set": {"used": True}}
    )
    
    user = await db.users.find_one({"user_id": magic_link["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    # Mark email as verified
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verified": True}}
    )
    
    access_token = create_jwt_token(user["user_id"], user["email"], "access")
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    # Redirect to app
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{BACKEND_URL}/?auth_success=true")

@auth_router.get("/confirm-email")
async def confirm_email(token: str):
    """Confirm email address"""
    db = get_db()
    
    verification = await db.email_verifications.find_one({
        "token": token,
        "type": "email_confirmation"
    })
    
    if not verification:
        raise HTTPException(400, "Invalid verification token")
    
    expires_at = verification["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Verification link has expired")
    
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    await db.email_verifications.delete_one({"token": token})
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{BACKEND_URL}/?email_verified=true")

@auth_router.post("/2fa/setup")
async def setup_2fa(user: Dict = Depends(require_auth)):
    """Setup 2FA for user"""
    db = get_db()
    
    if user.get("two_factor_enabled"):
        raise HTTPException(400, "2FA is already enabled")
    
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, user["email"])
    
    # Store secret temporarily (not enabled until verified)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_factor_secret_pending": secret}}
    )
    
    return {
        "secret": secret,
        "uri": uri,
        "message": "Scan the QR code with your authenticator app, then verify with a code"
    }

@auth_router.post("/2fa/verify-setup")
async def verify_2fa_setup(data: TwoFactorVerify, user: Dict = Depends(require_auth)):
    """Verify 2FA setup with code from authenticator app"""
    db = get_db()
    
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    secret = user_doc.get("two_factor_secret_pending")
    
    if not secret:
        raise HTTPException(400, "No 2FA setup in progress")
    
    if not verify_totp(secret, data.code):
        raise HTTPException(400, "Invalid verification code")
    
    # Enable 2FA
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "two_factor_enabled": True,
                "two_factor_secret": secret,
                "updated_at": datetime.now(timezone.utc)
            },
            "$unset": {"two_factor_secret_pending": ""}
        }
    )
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_factor_backup_codes": [hash_password(c) for c in backup_codes]}}
    )
    
    return {
        "success": True,
        "backup_codes": backup_codes,
        "message": "2FA enabled successfully. Save these backup codes securely."
    }

@auth_router.post("/2fa/disable")
async def disable_2fa(data: TwoFactorVerify, user: Dict = Depends(require_auth)):
    """Disable 2FA"""
    db = get_db()
    
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not user_doc.get("two_factor_enabled"):
        raise HTTPException(400, "2FA is not enabled")
    
    if not verify_totp(user_doc["two_factor_secret"], data.code):
        raise HTTPException(401, "Invalid 2FA code")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {"two_factor_enabled": False, "updated_at": datetime.now(timezone.utc)},
            "$unset": {"two_factor_secret": "", "two_factor_backup_codes": ""}
        }
    )
    
    return {"success": True, "message": "2FA disabled"}

@auth_router.post("/2fa/send-email-code")
async def send_2fa_email_code(user: Dict = Depends(require_auth)):
    """Send 2FA code via email as backup"""
    db = get_db()
    
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    await db.email_2fa_codes.insert_one({
        "user_id": user["user_id"],
        "code": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "created_at": datetime.now(timezone.utc)
    })
    
    await send_verification_email(user["email"], code, "2fa_code")
    
    return {"message": "2FA code sent to your email"}

@auth_router.get("/me")
async def get_me(user: Dict = Depends(require_auth)):
    """Get current user info"""
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name", ""),
        picture=user.get("picture"),
        email_verified=user.get("email_verified", False),
        two_factor_enabled=user.get("two_factor_enabled", False),
        passkey_enabled=user.get("passkey_enabled", False),
        subscription_tier=user.get("subscription_tier"),
        created_at=user.get("created_at", datetime.now(timezone.utc))
    )

@auth_router.post("/refresh")
async def refresh_token(data: TokenRefresh, response: Response):
    """Refresh access token"""
    payload = verify_jwt_token(data.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    
    db = get_db()
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(404, "User not found")
    
    access_token = create_jwt_token(user["user_id"], user["email"], "access")
    new_refresh_token = create_jwt_token(user["user_id"], user["email"], "refresh")
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "expires_in": JWT_EXPIRY_HOURS * 3600
    }

@auth_router.post("/logout")
async def logout(response: Response, user: Dict = Depends(get_current_user)):
    """Logout user"""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@auth_router.post("/password/reset-request")
async def request_password_reset(data: PasswordReset):
    """Request password reset email"""
    db = get_db()
    
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists, a reset link has been sent"}
    
    token = generate_verification_token()
    
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    await send_verification_email(data.email, token, "password_reset")
    
    return {"message": "If an account exists, a reset link has been sent"}

@auth_router.post("/password/reset-confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    """Reset password with token"""
    db = get_db()
    
    reset = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset:
        raise HTTPException(400, "Invalid or expired reset token")
    
    expires_at = reset["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Reset link has expired")
    
    await db.users.update_one(
        {"user_id": reset["user_id"]},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"success": True, "message": "Password reset successfully"}

# ── Google OAuth ────────────────────────────────────────────────────────

@auth_router.get("/google")
async def google_auth_redirect(redirect_url: str):
    """Redirect to Google OAuth via Emergent Auth"""
    auth_url = f"https://auth.emergentagent.com/?redirect={redirect_url}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=auth_url)

@auth_router.post("/google/callback")
async def google_auth_callback(session_id: str, response: Response):
    """Handle Google OAuth callback from Emergent Auth"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(400, "Invalid session")
            
            user_data = resp.json()
    except Exception as e:
        raise HTTPException(400, f"Failed to verify Google auth: {str(e)}")
    
    db = get_db()
    
    # Check if user exists
    existing = await db.users.find_one({"email": user_data["email"].lower()}, {"_id": 0})
    
    if existing:
        user_id = existing["user_id"]
        # Update picture if changed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "picture": user_data.get("picture"),
                "name": user_data.get("name", existing.get("name")),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": user_data["email"].lower(),
            "name": user_data.get("name", ""),
            "picture": user_data.get("picture"),
            "email_verified": True,
            "auth_provider": "google",
            "two_factor_enabled": False,
            "passkey_enabled": False,
            "passkeys": [],
            "subscription_tier": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    access_token = create_jwt_token(user_id, user["email"], "access")
    refresh_token = create_jwt_token(user_id, user["email"], "refresh")
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_EXPIRY_HOURS * 3600,
        user=UserResponse(
            user_id=user_id,
            email=user["email"],
            name=user.get("name", ""),
            picture=user.get("picture"),
            email_verified=True,
            two_factor_enabled=user.get("two_factor_enabled", False),
            passkey_enabled=user.get("passkey_enabled", False),
            subscription_tier=user.get("subscription_tier"),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
    )

# ── WebAuthn / Passkey Endpoints ────────────────────────────────────────────

@auth_router.post("/passkey/register/start")
async def passkey_register_start(data: PasskeyRegisterStart, user: Dict = Depends(require_auth)):
    """Start passkey/WebAuthn registration"""
    db = get_db()
    
    try:
        # Generate registration options
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=user["user_id"].encode(),
            user_name=user["email"],
            user_display_name=user.get("name", user["email"]),
            attestation=AttestationConveyancePreference.NONE,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
            supported_pub_key_algs=[
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
            ],
            exclude_credentials=[],
            timeout=60000,
        )
        
        # Store challenge for verification
        await db.webauthn_challenges.insert_one({
            "user_id": user["user_id"],
            "challenge": base64.b64encode(options.challenge).decode(),
            "type": "registration",
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"options": options_to_json(options)}
        
    except Exception as e:
        raise HTTPException(500, f"Failed to start passkey registration: {str(e)}")

@auth_router.post("/passkey/register/finish")
async def passkey_register_finish(data: PasskeyRegisterFinish, user: Dict = Depends(require_auth)):
    """Complete passkey/WebAuthn registration"""
    db = get_db()
    
    try:
        # Get stored challenge
        challenge_doc = await db.webauthn_challenges.find_one({
            "user_id": user["user_id"],
            "type": "registration"
        })
        
        if not challenge_doc:
            raise HTTPException(400, "No registration in progress")
        
        challenge = base64.b64decode(challenge_doc["challenge"])
        
        # Verify registration response
        verification = verify_registration_response(
            credential=data.credential,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=f"https://{RP_ID}",
            require_user_verification=False,
        )
        
        # Store credential
        credential_data = {
            "credential_id": base64.b64encode(verification.credential_id).decode(),
            "public_key": base64.b64encode(verification.credential_public_key).decode(),
            "sign_count": verification.sign_count,
            "transports": data.credential.get("transports", []),
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {
                "$push": {"passkeys": credential_data},
                "$set": {"passkey_enabled": True, "updated_at": datetime.now(timezone.utc)}
            }
        )
        
        # Clean up challenge
        await db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
        
        return {"success": True, "message": "Passkey registered successfully"}
        
    except Exception as e:
        raise HTTPException(400, f"Failed to register passkey: {str(e)}")

@auth_router.post("/passkey/auth/start")
async def passkey_auth_start(data: PasskeyAuthStart):
    """Start passkey/WebAuthn authentication"""
    db = get_db()
    
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    if not user or not user.get("passkeys"):
        raise HTTPException(400, "No passkeys registered for this account")
    
    try:
        # Get allowed credentials
        allowed_credentials = [
            {
                "id": base64.b64decode(pk["credential_id"]),
                "transports": pk.get("transports", []),
                "type": "public-key"
            }
            for pk in user["passkeys"]
        ]
        
        options = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allowed_credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
            timeout=60000,
        )
        
        # Store challenge
        await db.webauthn_challenges.insert_one({
            "user_id": user["user_id"],
            "challenge": base64.b64encode(options.challenge).decode(),
            "type": "authentication",
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"options": options_to_json(options)}
        
    except Exception as e:
        raise HTTPException(500, f"Failed to start passkey auth: {str(e)}")

@auth_router.post("/passkey/auth/finish")
async def passkey_auth_finish(data: PasskeyAuthFinish, response: Response):
    """Complete passkey/WebAuthn authentication"""
    db = get_db()
    
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    if not user:
        raise HTTPException(400, "User not found")
    
    try:
        # Get stored challenge
        challenge_doc = await db.webauthn_challenges.find_one({
            "user_id": user["user_id"],
            "type": "authentication"
        })
        
        if not challenge_doc:
            raise HTTPException(400, "No authentication in progress")
        
        challenge = base64.b64decode(challenge_doc["challenge"])
        
        # Find matching credential
        credential_id = base64.b64encode(
            base64.urlsafe_b64decode(data.credential["id"] + "==")
        ).decode()
        
        matching_cred = None
        for pk in user["passkeys"]:
            if pk["credential_id"] == credential_id:
                matching_cred = pk
                break
        
        if not matching_cred:
            raise HTTPException(400, "Credential not found")
        
        # Verify authentication response
        verification = verify_authentication_response(
            credential=data.credential,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=f"https://{RP_ID}",
            credential_public_key=base64.b64decode(matching_cred["public_key"]),
            credential_current_sign_count=matching_cred.get("sign_count", 0),
            require_user_verification=False,
        )
        
        # Update sign count
        await db.users.update_one(
            {
                "user_id": user["user_id"],
                "passkeys.credential_id": credential_id
            },
            {"$set": {"passkeys.$.sign_count": verification.new_sign_count}}
        )
        
        # Clean up challenge
        await db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
        
        # Create tokens
        access_token = create_jwt_token(user["user_id"], user["email"], "access")
        refresh_token = create_jwt_token(user["user_id"], user["email"], "refresh")
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=JWT_EXPIRY_HOURS * 3600
        )
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=JWT_EXPIRY_HOURS * 3600,
            user=UserResponse(
                user_id=user["user_id"],
                email=user["email"],
                name=user.get("name", ""),
                picture=user.get("picture"),
                email_verified=user.get("email_verified", False),
                two_factor_enabled=user.get("two_factor_enabled", False),
                passkey_enabled=True,
                subscription_tier=user.get("subscription_tier"),
                created_at=user.get("created_at", datetime.now(timezone.utc))
            )
        )
        
    except Exception as e:
        raise HTTPException(400, f"Failed to authenticate with passkey: {str(e)}")

@auth_router.delete("/passkey/{credential_id}")
async def delete_passkey(credential_id: str, user: Dict = Depends(require_auth)):
    """Delete a passkey"""
    db = get_db()
    
    result = await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"passkeys": {"credential_id": credential_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(404, "Passkey not found")
    
    # Check if user has any remaining passkeys
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not user_doc.get("passkeys"):
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"passkey_enabled": False}}
        )
    
    return {"success": True, "message": "Passkey deleted"}

@auth_router.get("/passkeys")
async def list_passkeys(user: Dict = Depends(require_auth)):
    """List user's registered passkeys"""
    db = get_db()
    
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    passkeys = []
    for pk in user_doc.get("passkeys", []):
        passkeys.append({
            "credential_id": pk["credential_id"],
            "created_at": pk.get("created_at"),
            "last_used": pk.get("last_used"),
            "transports": pk.get("transports", [])
        })
    
    return {"passkeys": passkeys}

# Export router
__all__ = ['auth_router', 'get_current_user', 'require_auth']
