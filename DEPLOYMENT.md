# How to Deploy "Link Playlist Saver" for Free

Since this application uses a **Python backend** (to fetch the link thumbnails), it needs a hosting provider that supports Python. GitHub Pages only supports static files, so it won't work there.

Here are the two best options for hosting this for free permanently.

## Option 1: Render (Recommended - Easiest)
**Render** is a modern cloud provider with a generous free tier.

1.  **Sign Up**: Go to [dashboard.render.com](https://dashboard.render.com/) and create an account (you can sign in with GitHub).
2.  **New Web Service**:
    *   Click the **"New +"** button and select **"Web Service"**.
    *   Connect your GitHub account.
    *   Search for your repository: `gowrishgalaxy/saveplaylist`.
    *   Click **"Connect"**.
3.  **Configure**:
    *   Render will automatically detect the settings because I added a `Procfile`.
    *   **Name**: Choose a name (e.g., `my-link-playlist`).
    *   **Region**: Choose the one closest to you.
    *   **Branch**: `main`.
    *   **Runtime**: `Python 3`.
    *   **Build Command**: `pip install -r requirements.txt`.
    *   **Start Command**: `gunicorn app:app`.
    *   **Free Point**: Make sure "Free" instance type is selected.
4.  **Deploy**:
    *   Click **"Create Web Service"**.
    *   Wait a few minutes for the build to finish.
5.  **Done!**: You will see a URL like `https://my-link-playlist.onrender.com`. That is your permanent link.

> **Note**: On the free tier, Render "spins down" the server after inactivity. The first time you visit it after a while, it might take 30-50 seconds to load. This is normal.

---

## Option 2: PythonAnywhere (No "Spin Down")
**PythonAnywhere** is very stable and keeps the server running, but requires a bit more manual setup.

1.  **Sign Up**: Go to [www.pythonanywhere.com](https://www.pythonanywhere.com/) and create a "Beginner" (Free) account.
2.  **Open Bash Console**: Go to the **Consoles** tab and start a **Bash** console.
3.  **Clone your Code**:
    *   Run: `git clone https://github.com/gowrishgalaxy/saveplaylist.git`
    *   Run: `cd saveplaylist`
    *   Run: `pip install -r requirements.txt --user`
4.  **Configure Web App**:
    *   Go to the **Web** tab.
    *   Click **"Add a new web app"**.
    *   Click **Next** -> **Flask** -> **Python 3.10** (or latest).
    *   **Path**: It will ask for the path to your flask app. changing `/home/yourusername/mysite/flask_app.py` to `/home/yourusername/saveplaylist/app.py`.
5.  **Fix Static Files** (Important for CSS/JS):
    *   In the **Web** tab, scroll down to **Static Files**.
    *   **URL**: `/`  ->  **Directory**: `/home/yourusername/saveplaylist`
       *(Note: This might conflict with the Flask route, simpler to just let Flask serve it as the code currently does, so you might skip this step if using my `app.py` which serves static files).*
6.  **Reload**: Click the Green **"Reload"** button at the top of the Web tab.
7.  **Done!**: Your site will be at `yourusername.pythonanywhere.com`.
