from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from routes import get_current_db_user

router = APIRouter()

def calculate_project_score(target_project: models.Project, project: models.Project) -> int:
    score = 0
    
    target_tags = set(target_project.tags or [])
    project_tags = set(project.tags or [])
    
    # +3 per matching tag
    common_tags = target_tags.intersection(project_tags)
    score += len(common_tags) * 3
    
    # +2 for same stage
    if target_project.stage == project.stage:
        score += 2
        
    # +1 per keyword match in title/description (basic approach)
    target_words = set((target_project.title + " " + target_project.description).lower().split())
    project_words = set((project.title + " " + project.description).lower().split())
    
    common_words = target_words.intersection(project_words)
    # Ignore some common stop words
    stop_words = {"the", "and", "a", "an", "is", "in", "to", "of", "for", "with", "on", "this", "that", "it", "as", "by", "or"}
    meaningful_common_words = common_words - stop_words
    score += len(meaningful_common_words) * 1
    
    return score

def calculate_user_score(target_project: models.Project, user: models.User) -> int:
    score = 0
    target_tags = set(target_project.tags or [])
    user_skills = set(user.skills or [])
    
    # +2 per skill that matches a project tag
    common_skills = target_tags.intersection(user_skills)
    score += len(common_skills) * 2
    
    return score

@router.get("/matches/projects/{project_id}", response_model=List[schemas.ProjectMatchResponse])
def get_project_matches(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_db_user)):
    target_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not target_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    other_projects = db.query(models.Project).filter(models.Project.id != project_id).all()
    
    scored_projects = []
    for proj in other_projects:
        score = calculate_project_score(target_project, proj)
        if score > 0:
            scored_projects.append({"project": proj, "score": score})
            
    # Sort by score descending
    scored_projects.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top 10
    return scored_projects[:10]

@router.get("/matches/users/{project_id}", response_model=List[schemas.UserMatchResponse])
def get_user_matches(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_db_user)):
    target_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not target_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    other_users = db.query(models.User).filter(models.User.id != target_project.owner_id).all()
    
    scored_users = []
    for user in other_users:
        score = calculate_user_score(target_project, user)
        if score > 0:
            scored_users.append({"user": user, "score": score})
            
    # Sort by score descending
    scored_users.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top 10
    return scored_users[:10]
