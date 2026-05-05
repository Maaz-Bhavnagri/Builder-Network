import random
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User, Project

db: Session = SessionLocal()

# -----------------------------
# SAMPLE DATA POOLS
# -----------------------------

names = [
    "Aarav Patel", "Riya Sharma", "Kunal Shah", "Neha Verma",
    "Aditya Mehta", "Priya Singh", "Rahul Jain", "Sneha Kapoor",
    "Vikram Desai", "Ananya Gupta", "Dev Patel", "Isha Shah",
    "Arjun Reddy", "Meera Nair", "Rohan Das", "Simran Kaur",
    "Yash Agarwal", "Pooja Joshi", "Aman Verma", "Tanvi Kulkarni",
    "Siddharth Rao", "Nikita Singh", "Harsh Patel", "Kriti Mehta",
    "Manish Kumar", "Divya Sharma", "Akash Jain", "Shreya Gupta",
    "Varun Shah", "Ankit Verma"
]

roles = [
    "Full-stack Developer", "Frontend Engineer", "Backend Specialist", 
    "UI/UX Designer", "Product Manager", "Data Scientist", 
    "DevOps Engineer", "Mobile Developer", "Security Researcher"
]

skills_pool = [
    "Python", "FastAPI", "React", "Next.js", "Node.js",
    "MongoDB", "PostgreSQL", "Docker", "Kubernetes",
    "Machine Learning", "TensorFlow", "NLP", "Computer Vision",
    "AWS", "Firebase", "GraphQL", "TypeScript", "Redis",
    "Figma", "Tailwind CSS", "Go", "Rust", "Swift"
]

bio_templates = [
    "{role} passionate about building scalable and impactful applications. Currently exploring {skill1} and {skill2}.",
    "Building in public! I'm a {role} focused on {tag1} and {tag2}. Love working with {skill1}.",
    "Aspiring entrepreneur and {role}. I enjoy solving problems in the {tag1} space using {skill1}.",
    "{role} with 4+ years of experience. Always looking to collaborate on {tag2} projects.",
    "Learning {skill2} and building {tag1} tools. Let's connect if you're into {tag2}!",
    "Design-focused {role}. I believe great software starts with a great UI. Expert in {skill1}.",
    "Backend enthusiast. I love architecting complex systems with {skill1} and {skill2}.",
    "Independent creator and {role}. Working on a few {tag1} side projects. Hire me for {skill1} work!"
]

project_ideas = [
    {"title": "EchoBoard", "description": "A collaborative real-time whiteboarding tool for remote teams to brainstorm and plan visually.", "tags": ["Collaboration", "Productivity", "SaaS"]},
    {"title": "MintFlow", "description": "Automated personal finance tracker that categorizes transactions using basic NLP.", "tags": ["Fintech", "AI", "Productivity"]},
    {"title": "SafeRoute", "description": "Crowdsourced safety maps for urban commuters to find the most well-lit walking paths.", "tags": ["Community", "Social", "Safety"]},
    {"title": "SkillSwap", "description": "A marketplace where makers can trade hours of their expertise with each other.", "tags": ["Marketplace", "Community", "Learning"]},
    {"title": "GreenStack", "description": "Open-source directory of low-carbon infrastructure patterns for sustainable software.", "tags": ["Sustainability", "Open Source", "DevTools"]},
    {"title": "FocusFlow", "description": "Minimalist Pomodoro timer that integrates with Spotify and blocks distracting sites.", "tags": ["Productivity", "SaaS", "Music"]},
    {"title": "HealthyBite", "description": "AI meal planner that generates grocery lists based on your specific nutrition goals.", "tags": ["Health", "AI", "Marketplace"]},
    {"title": "DevPort", "description": "Instant professional portfolio generator for developers based on their GitHub activity.", "tags": ["DevTools", "SaaS", "Automation"]},
    {"title": "LocalConnect", "description": "Neighborhood social network specifically for local volunteering and tool-sharing.", "tags": ["Community", "Social", "Volunteer"]},
    {"title": "CodeMentor", "description": "Platform matching senior devs with beginners for 1:1 pair programming and mentorship.", "tags": ["Education", "Career", "Community"]},
    {"title": "CryptoWatch", "description": "Minimalist crypto dashboard with custom price alerts and portfolio tracking.", "tags": ["Fintech", "Web3", "Dashboard"]},
    {"title": "JobHunt AI", "description": "AI tool that tailors your resume for specific job descriptions automatically.", "tags": ["AI", "Career", "SaaS"]},
    {"title": "EventLoop", "description": "Simplified event management for small community meetups and workshops.", "tags": ["Event", "Community", "Tools"]},
    {"title": "QuickShip", "description": "A boilerplate for launching SaaS products in under 24 hours with Next.js and Stripe.", "tags": ["DevTools", "SaaS", "Boilerplate"]},
    {"title": "MoodTrack", "description": "Privacy-focused mood journal with data visualization to track mental well-being.", "tags": ["Health", "Mobile", "Privacy"]}
]

stages = ["idea", "building", "MVP", "launched"]

# -----------------------------
# SEED EXECUTION
# -----------------------------

def seed_data():
    print("--- Clearing old data...")
    db.query(Project).delete()
    db.query(User).delete()
    db.commit()

    users = []
    print(f"--- Creating {len(names)} users...")
    
    for i, name in enumerate(names):
        user_skills = random.sample(skills_pool, random.randint(3, 6))
        role = random.choice(roles)
        
        # Pick a random bio template and fill it
        bio = random.choice(bio_templates).format(
            role=role,
            skill1=user_skills[0],
            skill2=user_skills[1],
            tag1=random.choice(["SaaS", "AI", "Fintech", "Web3"]),
            tag2=random.choice(["Productivity", "Health", "Social", "Open Source"])
        )

        user = User(
            clerk_id=f"user_{uuid.uuid4().hex[:12]}",
            email=f"{name.lower().replace(' ', '.')}@example.com",
            name=name,
            bio=bio,
            skills=user_skills,
            created_at=datetime.utcnow()
        )
        db.add(user)
        users.append(user)

    db.commit()
    
    # Refresh to get IDs
    for user in users:
        db.refresh(user)

    print(f"--- Creating 45 projects...")
    for i in range(45):
        owner = random.choice(users)
        template = random.choice(project_ideas)
        
        # Add a bit of variation to titles so they aren't all duplicates
        variation = random.choice(["", "Pro", "v2", "Lite", "Beta", "Plus"])
        title = f"{template['title']} {variation}".strip()
        
        project = Project(
            owner_id=owner.id,
            title=title,
            description=template['description'],
            tags=template['tags'],
            stage=random.choice(stages),
            created_at=datetime.utcnow()
        )
        db.add(project)

    db.commit()
    print("DONE: Seed data inserted successfully!")

if __name__ == "__main__":
    seed_data()