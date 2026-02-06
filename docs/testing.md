# Testing - Setup & User Guide

This containerized setup is provided exclusively for distribution and local testing. There is no server yet, so in order to test it out, running the system via Docker is the only way to evaluate the system locally without requiring you to pull the whole codebase, setup and build it yourself.

> This is currently in alpha so expect a lot of bugs!

## Prerequisites (One-Time Setup)

1. Download Docker and install for Windows:
   [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Open the Docker Desktop app. Ensure Docker is running in the background for this to work.

> If you dont know how to download and set up docker watch youtube :p

## Download the Package

- Download (.zip): [HERE](https://drive.google.com/file/d/1WIO9DtjvMK68WXbJ3gp3MxgoExX3Gsyp/view?usp=sharing)

> This is not the whole codebase but a deployment package. The zip contains configuration files for running pre-built Docker images hosted remotely

- The zip file will consist of two files:
    - `docker-compose.yml` (This will be used for pulling the application images)
    - `privileged-users.yaml` (This is where you will be managing your role)

---

## Running the System

- Unzip the zip file and enter the extracted folder
- Right-click inside the folder and select **"Open in Terminal"** or **"Open command window here."**
- Run the following command:

```bash
docker compose up -d

```

- Open your web browser and navigate to [http://localhost](http://localhost).

---

## Managing User Roles (Admin/Teacher/Student)

The system uses your **Google Email** to determine what you see. By default, everyone is a **Student**. To test roles and capabilities you must edit the config file manually.

1. Open `privileged-users.yaml` in any text editor.
2. Add your email address under the desired category.

### To Apply Role Changes:

Whenever you edit `privileged-users.yaml`, you **must restart** the backend to load the new permissions. Run this in your terminal:

```bash
docker compose restart backend
```

#### Why this manual?

- The system does not handle sign-ups, only logins. Therefore, to manage roles and permissions, this config file is required.
- We are planning on implement a full authentication system in the future including sign-up/registration and UI/Frontend way to managing roles and permissions instead of this config file. But for now this is enough for simplicity.
- If we hit prod before that feature, this file will be secured on the server and only developers or admins will be able to modify it.

> For more info about roles and capabilities, read: [Role and Capabilities](./specification.md#roles-capabilities)

---

## How does this work?

- Running docker `compose up -d` pulls the images from Docker Hub and starts the services defined in `docker-compose.yml` in the background.
- Services:
    - frontend: NGINX serving the frontend SPA
    - backend: Spring Boot API (business logic)
    - postgres: database storage
- On first start, the backend creates an uploads/ folder. Uploaded PDF/DOCX files are saved there on disk. The database stores only the file path (not the binary) to avoid performance and size issues.

## Control Commands

| Action         | Command                  | Description                                                 |
| -------------- | ------------------------ | ----------------------------------------------------------- |
| **Start**      | `docker compose up -d`   | Starts everything in the background.                        |
| **Stop**       | `docker compose stop`    | Halts the app but keeps your data/uploads safe.             |
| **Resume**     | `docker compose start`   | Quickly wakes the app back up.                              |
| **Shutdown**   | `docker compose down`    | Fully stops and removes the temporary containers.           |
| **Full Reset** | `docker compose down -v` | Deletes all uploaded papers and drop database. (clean data) |

## Updating to the Latest Version

If the developers update the code, run these commands to perform a clean update:

```bash
# 1. Shutdown and wipe local data
docker compose down -v

# 2. Remove old images
docker image rm r4ppzf/research-repo-backend:latest r4ppzf/research-repo-frontend:latest

# 3. Pull the latest updates and restart
docker compose pull
docker compose up -d

```

For more info on Docker, visit: [Docker Documentation](https://docs.docker.com/)

---

> If you encounter any issue or you cant make it to work please contact us through github [issue](https://github.com/r4ppz/research-repo-docs/issues)
