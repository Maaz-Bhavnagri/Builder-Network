from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    clerk_id: str
    email: EmailStr
    name: Optional[str] = None
    skills: Optional[List[str]] = []
    bio: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str
    description: str
    tags: Optional[List[str]] = []
    stage: str

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    owner: UserResponse

class ProjectMatchResponse(BaseModel):
    project: ProjectResponse
    score: int

class UserMatchResponse(BaseModel):
    user: UserResponse
    score: int

# ---- Connection Schemas ----

class ConnectionRequest(BaseModel):
    receiver_id: str

class ConnectionRespond(BaseModel):
    connection_id: str
    action: str  # "accept" or "reject"

class ConnectionResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    status: str
    created_at: datetime
    sender: UserResponse
    receiver: UserResponse

    class Config:
        from_attributes = True

# ---- Chat Schemas ----

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    created_at: datetime
    is_read: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConversationSummary(BaseModel):
    user: UserResponse
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
