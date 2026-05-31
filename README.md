# TeamTask - Cloud Native Task Management Platform

An internal task management application built with a **Cloud Native Microservices** architecture to demonstrate clean service isolation, synchronous REST validation, and asynchronous event-driven logging.

---

## 🚀 Project Overview

The project is split between two developers:

### 👤 Personne 1: Auth & Projects
*   **Auth Service:** User registration, login, and JWT generation/validation.
*   **Project Service:** Manage projects (CRUD) with description and end dates.

### 👤 Personne 2 (You!): Tasks & History
*   **Task Service:** Manage tasks (CRUD), assign users, update status (`todo`, `in_progress`, `done`). Validates project existence via REST and publishes events to RabbitMQ.
*   **History Service:** Consumes events from RabbitMQ and logs all status changes asynchronously.

---

## 📂 Repository Structure

```text
PROJET CLOUD/
├── .gitignore               # Block tracking of node_modules, logs, and env keys
├── README.md                # Project documentation and Git instructions
├── docker-compose.yml       # Orchestrates MongoDB, RabbitMQ, and services (To be created)
├── task-service/            # Task Service (Your code)
├── history-service/         # History Service (Your code)
├── auth-service/            # Auth Service (Coworker's code)
└── project-service/         # Project Service (Coworker's code)
```

---

## 🤝 Git Collaboration Guide

Since you are working as a pair, here is how to share this repository on **GitHub**:

### Step 1: Create the GitHub Repository
1.  Go to [GitHub](https://github.com) and log in.
2.  Click **New Repository**.
3.  Name it `teamtask` (choose **Private** if it is a school project).
4.  **Do NOT** check "Add a README", "Add .gitignore", or "Choose a license" (we already have these locally!).
5.  Click **Create Repository**.

### Step 2: Link & Push Your Local Code
Run these commands in your VS Code terminal (or standard terminal) inside this directory:
```bash
# Rename default branch to main
git branch -M main

# Link this folder to your online GitHub repository
git remote add origin https://github.com/YOUR-USERNAME/teamtask.git

# Stage all files
git add .

# Create the first commit
git commit -m "chore: initial commit with gitignore and documentation"

# Push the code to GitHub
git push -u origin main
```

### Step 3: Add Your Coworker as a Collaborator
1.  In your GitHub repository web page, go to **Settings** (top tab).
2.  Click **Collaborators** on the left menu.
3.  Click **Add people** and enter your coworker's email: `mbh303065@gmail.com`.
4.  Your coworker will receive an email invitation. Once they accept it, they can pull and push changes!

### Step 4: Coworker Clones the Code
Your coworker can clone the repository to their computer by running:
```bash
git clone https://github.com/YOUR-USERNAME/teamtask.git
```

---

## 🛠 Next Steps
1.  **Initialize directories:** We will create `task-service/` and `history-service/`.
2.  **Define Docker Compose:** Set up MongoDB and RabbitMQ containers.
3.  **Start Coding!**
