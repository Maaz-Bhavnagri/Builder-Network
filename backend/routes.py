from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from typing import Optional, List

router = APIRouter()

@router.post("/users/sync", response_model=schemas.UserResponse)
def sync_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(models.User).filter(models.User.clerk_id == user_in.clerk_id).first()
    
    if user:
        # Optionally update user info if needed, but for now just return the existing user
        return user
    
    # Create new user
    new_user = models.User(
        clerk_id=user_in.clerk_id,
        email=user_in.email,
        name=user_in.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_current_db_user(x_clerk_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not x_clerk_user_id:
        raise HTTPException(status_code=401, detail="Missing x-clerk-user-id header")
    
    user = db.query(models.User).filter(models.User.clerk_id == x_clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user(user: models.User = Depends(get_current_db_user)):
    return user

@router.post("/projects", response_model=schemas.ProjectResponse)
def create_project(project_in: schemas.ProjectCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_db_user)):
    new_project = models.Project(
        owner_id=user.id,
        title=project_in.title,
        description=project_in.description,
        tags=project_in.tags,
        stage=project_in.stage
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/projects/my", response_model=List[schemas.ProjectResponse])
def get_my_projects(db: Session = Depends(get_db), user: models.User = Depends(get_current_db_user)):
    projects = db.query(models.Project).filter(models.Project.owner_id == user.id).all()
    return projects

@router.get("/projects/{project_id}", response_model=schemas.ProjectDetailResponse)
def get_project(project_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_db_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
