# Development Instructions

Follow these steps to set up and run the documentation project locally.

## 1. Clone the repository

```bash
git clone <repo-url> <destination-dir>
cd <destination-dir>
```

## 2. Create and activate a Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate  # For Linux/macOS
# or
.venv\Scripts\activate.bat  # For Windows CMD
# or
.venv\Scripts\Activate.ps1  # For Windows PowerShell
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Always format all Markdown files after making changes

After adding or editing documentation, run:

```bash
mdformat .
```

This will recursively format all Markdown files in the repository for consistency.

## 5. Run the documentation site locally

```bash
mkdocs serve
```

The local site will be available on http://localhost:8000

## 6. Build the documentation static site

```bash
mkdocs build
```

---

- Do not commit the `.venv/` directory; it is already listed in `.gitignore`.
- Make sure to always run `mdformat .` before submitting changes.
