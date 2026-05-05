from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List
from database import get_db
import models
import schemas
from routes import get_current_db_user

router = APIRouter()

@router.post("/messages/send", response_model=schemas.MessageResponse)
def send_message(
    msg: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    # Check if connected
    connection = db.query(models.Connection).filter(
        or_(
            and_(models.Connection.sender_id == current_user.id, models.Connection.receiver_id == msg.receiver_id),
            and_(models.Connection.sender_id == msg.receiver_id, models.Connection.receiver_id == current_user.id)
        ),
        models.Connection.status == "accepted"
    ).first()

    if not connection:
        raise HTTPException(status_code=403, detail="You can only message users you are connected with.")

    message = models.Message(
        sender_id=current_user.id,
        receiver_id=msg.receiver_id,
        content=msg.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

@router.get("/messages/{user_id}", response_model=List[schemas.MessageResponse])
def get_conversation(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    messages = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == current_user.id, models.Message.receiver_id == user_id),
            and_(models.Message.sender_id == user_id, models.Message.receiver_id == current_user.id)
        )
    ).order_by(models.Message.created_at.asc()).all()
    
    return messages

@router.get("/conversations", response_model=List[schemas.ConversationSummary])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    # This is a basic implementation. Ideally, we'd use a more complex query to get unique users
    # with whom we have messages, along with the last message.
    
    # 1. Get all connected users
    connections = db.query(models.Connection).filter(
        or_(models.Connection.sender_id == current_user.id, models.Connection.receiver_id == current_user.id),
        models.Connection.status == "accepted"
    ).all()
    
    summaries = []
    for conn in connections:
        other_user = conn.receiver if conn.sender_id == current_user.id else conn.sender
        
        # Get last message
        last_msg = db.query(models.Message).filter(
            or_(
                and_(models.Message.sender_id == current_user.id, models.Message.receiver_id == other_user.id),
                and_(models.Message.sender_id == other_user.id, models.Message.receiver_id == current_user.id)
            )
        ).order_by(desc(models.Message.created_at)).first()
        
        summaries.append({
            "user": other_user,
            "last_message": last_msg,
            "unread_count": 0 # Not implemented for now
        })
        
    # Sort by last message time descending
    summaries.sort(key=lambda x: x["last_message"].created_at if x["last_message"] else models.datetime.datetime.min, reverse=True)
    
    return summaries
