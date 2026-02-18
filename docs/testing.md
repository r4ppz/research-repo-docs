# How to test the system

The system is available for testing but since there is no server yet, you have three options:

1. Ask the developers to temporarily run the backend on their hardware to support your session and access the [SPA Frontend](https://r4ppz.github.io/research-repository-frontend/) hosted on GitHub Pages.
2. Pull the [whole codebase](https://github.com/r4ppz/research-repository) and run everything locally (_not recommended unless your a dev_)
3. Use the containerized version of the system and run everything locally using Docker. (_preferred_)

> ⚠️ The system is currently in alpha. Bugs and instability are expected.

---

## Containerized version:

The containerized version is provided exclusively for distribution and local testing. Running the system via Docker is the only way to evaluate the system locally without requiring you to pull the whole codebase, setup and build it yourself.

### 1. Prerequisites (One-Time Setup)

- Download Docker and install for Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- Open and start the Docker Desktop application.

> If you dont know how to download and set up docker watch youtube :p

### 2. Download the Package

- Download (.zip): [HERE](https://github.com/r4ppz/research-repo-deployment-package/archive/refs/tags/v0.1.0-alpha.zip)

- The zip file will consist of two essential files:
    - `docker-compose.yml` - This will be used for pulling the application images
    - `privileged-users.yaml` - This is where you will be managing your role

---

### 3. Running the System

- Unzip the zip file and enter the extracted folder
- Right-click inside the folder and select **"Open in Terminal"** or **"Open command window here."**
- Run the following command:

<small style="color: gray;">note: docker must be running in the background.</small>

```bash
docker compose up -d

```

- Click this --> [http://localhost](http://localhost).

---

### 4. Managing User Roles (Admin/Teacher/Student)

The system uses your **Google Email** to determine what you see. By default, everyone is a **Student**. To test roles and capabilities you must edit the config file manually.

1. Open `privileged-users.yaml` in any text editor.
2. Add your email address under the desired category.

#### To Apply Role Changes:

Whenever you edit `privileged-users.yaml`, you **must restart** the backend to load the new permissions. Run this in your terminal:

```bash
docker compose restart backend
```

<!-- prettier-ignore-start -->
!!! warning "For more info about this"
    Please read [Manual Role Assinment](./specification.md#manual-role-assignment)

    and [Role and Capabilities](./specification.md#roles-capabilities-authz).
<!-- prettier-ignore-end -->

---

### 6. Control Commands

| Action         | Command                  | Description                                                 |
| -------------- | ------------------------ | ----------------------------------------------------------- |
| **Start**      | `docker compose up -d`   | Starts everything in the background.                        |
| **Stop**       | `docker compose stop`    | Halts the app but keeps your data/uploads safe.             |
| **Resume**     | `docker compose start`   | Quickly wakes the app back up.                              |
| **Shutdown**   | `docker compose down`    | Fully stops and removes the temporary containers.           |
| **Full Reset** | `docker compose down -v` | Deletes all uploaded papers and drop database. (clean data) |

### 7. Updating to the Latest Version

If the developers update the code, run these commands to perform a clean update:

```bash
# 1. Shutdown and wipe local data
docker compose down -v

# 2. Remove old images
docker image rm ghcr.io/r4ppz/research-repository-backend:latest ghcr.io/r4ppz/research-repository-frontend:latest

# 3. Pull the latest updates and restart
docker compose pull
docker compose up -d

```

For more info on Docker, visit: [Docker Documentation](https://docs.docker.com/)

---

<!-- prettier-ignore-start -->
!!! question "How does this work?"
    - Running Docker `compose up -d` pulls the images from Github registry and starts the services defined in `docker-compose.yml` in the background.
    - Services:
        - frontend: NGINX serving the frontend SPA
        - backend: Spring Boot API (business logic)
        - postgres: database storage
    - On first start, the backend creates an uploads/ folder. Uploaded PDF/DOCX files are saved there on disk. The database stores only the file path (not the binary).
    - Docker compose does not pull the entire codebase. It retrieves and builds container images from a registry. Images contain the packaged/compiled application (e.g., binaries and dependencies), not the raw source code.
    - For source code access, refer to the [research-repository](https://github.com/r4ppz/research-repository).
<!-- prettier-ignore-end -->

---

> If you encounter any issue or you cant make it to work please contact us through github [issue](https://github.com/r4ppz/research-repo-docs/issues)
