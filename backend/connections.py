from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from database import get_db
import models
import schemas
from routes import get_current_db_user

router = APIRouter()

@router.post("/connections/request", response_model=schemas.ConnectionResponse)
def send_connection_request(
    req: schemas.ConnectionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    # Prevent self-connection
    if current_user.id == req.receiver_id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself.")

    # Check receiver exists
    receiver = db.query(models.User).filter(models.User.id == req.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check for existing request in either direction
    existing = db.query(models.Connection).filter(
        (
            (models.Connection.sender_id == current_user.id) &
            (models.Connection.receiver_id == req.receiver_id)
        ) | (
            (models.Connection.sender_id == req.receiver_id) &
            (models.Connection.receiver_id == current_user.id)
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=409, detail="Already connected.")
        elif existing.status == "pending":
            raise HTTPException(status_code=409, detail="A connection request already exists.")
        elif existing.status == "rejected":
            # Allow re-requesting after rejection
            existing.status = "pending"
            existing.sender_id = current_user.id
            existing.receiver_id = req.receiver_id
            db.commit()
            db.refresh(existing)
            return existing

    try:
        connection = models.Connection(
            sender_id=current_user.id,
            receiver_id=req.receiver_id,
            status="pending"
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        return connection
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Connection request already exists.")


@router.get("/connections/requests", response_model=List[schemas.ConnectionResponse])
def get_connection_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    """Get all incoming pending connection requests for the current user."""
    requests = db.query(models.Connection).filter(
        models.Connection.receiver_id == current_user.id,
        models.Connection.status == "pending"
    ).all()
    return requests


@router.post("/connections/respond", response_model=schemas.ConnectionResponse)
def respond_to_connection(
    resp: schemas.ConnectionRespond,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    if resp.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'.")

    connection = db.query(models.Connection).filter(
        models.Connection.id == resp.connection_id
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found.")

    # Only the receiver can respond
    if connection.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to respond to this request.")

    if connection.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {connection.status}.")

    connection.status = "accepted" if resp.action == "accept" else "rejected"
    db.commit()
    db.refresh(connection)
    return connection


@router.get("/connections", response_model=List[schemas.ConnectionResponse])
def get_connections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    """Get all accepted connections for the current user (both as sender and receiver)."""
    connections = db.query(models.Connection).filter(
        (
            (models.Connection.sender_id == current_user.id) |
            (models.Connection.receiver_id == current_user.id)
        ),
        models.Connection.status == "accepted"
    ).all()
    return connections


@router.get("/connections/sent", response_model=List[schemas.ConnectionResponse])
def get_sent_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_db_user)
):
    """Get all outgoing pending requests from the current user."""
    requests = db.query(models.Connection).filter(
        models.Connection.sender_id == current_user.id,
        models.Connection.status == "pending"
    ).all()
    return requests
