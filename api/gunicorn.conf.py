import os
from pathlib import Path

chdir = str(Path(__file__).resolve().parent)
wsgi_app = "config.wsgi:application"
bind = f"127.0.0.1:{os.getenv('PORT', '8026')}"
