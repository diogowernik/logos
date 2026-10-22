"""Exercise real Next -> Django authentication against a disposable database."""

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from http.cookies import SimpleCookie
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def available_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def call(url, *, method="GET", data=None, cookie=None, origin=None):
    headers = {}
    if cookie:
        headers["Cookie"] = cookie
    if origin:
        headers["Origin"] = origin
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        response = urllib.request.build_opener(NoRedirect).open(request, timeout=8)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


def wait_ready(url: str, process: subprocess.Popen) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Servidor encerrou antes de iniciar; consulte o log de validação.")
        try:
            status, _, _ = call(url)
            if status < 500:
                return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.2)
    raise RuntimeError("Servidor não iniciou no prazo.")


def run() -> None:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node não encontrado.")
    api_port, web_port = available_port(), available_port()
    while api_port == web_port:
        web_port = available_port()
    api_base = f"http://127.0.0.1:{api_port}"
    web_base = f"http://127.0.0.1:{web_port}"
    processes = []
    with tempfile.TemporaryDirectory(prefix="app-auth-") as temporary:
        environment = os.environ | {
            "DJANGO_ENV": "development",
            "DJANGO_DEBUG": "false",
            "DJANGO_ALLOWED_HOSTS": "localhost,127.0.0.1",
            "DATABASE_URL": f"sqlite:///{Path(temporary) / 'auth.sqlite3'}",
            "DJANGO_API_URL": api_base,
            "APP_ORIGIN": web_base,
            "NODE_ENV": "production",
            "NEXT_DIST_DIR": ".next-codex",
        }
        manage = [sys.executable, str(ROOT / "api/manage.py")]
        subprocess.run(manage + ["migrate", "--noinput"], env=environment, check=True,
                       stdout=subprocess.DEVNULL)
        subprocess.run(manage + ["shell", "-c", (
            "from django.contrib.auth import get_user_model; "
            "get_user_model().objects.create_user(username='auth-test',password='temporary-test-password')"
        )], env=environment, check=True, stdout=subprocess.DEVNULL)
        with (Path(temporary) / "servers.log").open("w+") as log:
            try:
                api = subprocess.Popen(manage + ["runserver", f"127.0.0.1:{api_port}", "--noreload"],
                                       env=environment, stdout=log, stderr=log)
                processes.append(api)
                web = subprocess.Popen([node, str(ROOT / "web/node_modules/next/dist/bin/next"),
                                        "start", "--hostname", "127.0.0.1", "--port", str(web_port)],
                                       cwd=ROOT / "web", env=environment, stdout=log, stderr=log)
                processes.append(web)
                wait_ready(api_base + "/api/health/", api)
                wait_ready(web_base + "/login", web)

                status, headers, body = call(web_base + "/")
                assert status == 307 and headers["Location"] == "/login", "Anonymous page not protected"
                assert b"Ainda n" not in body, "Private page leaked"
                status, headers, _ = call(web_base + "/pwa")
                assert status == 307 and headers["Location"] == "/login?next=/pwa"
                assert call(web_base + "/api/auth/device-lock/password-unlock", method="POST",
                            data={"password": "invalid"}, origin=web_base)[0] == 401
                credentials = {"username": "auth-test", "password": "temporary-test-password"}
                assert call(web_base + "/api/auth/login", method="POST", data=credentials,
                            origin="https://foreign.example")[0] == 403
                status, headers, body = call(web_base + "/api/auth/login", method="POST",
                                            data=credentials, origin=web_base)
                assert status == 200 and json.loads(body) == {"ok": True}, "Login failed"
                assert "no-store" in headers["Cache-Control"]
                cookie_jar = SimpleCookie()
                cookie_jar.load(headers["Set-Cookie"])
                auth = cookie_jar["logos_auth"]
                assert auth["httponly"] and auth["secure"] and auth["samesite"] == "lax"
                # Production Secure is asserted above; send manually over local test HTTP.
                cookie = f"logos_auth={auth.value}"
                status, _, body = call(web_base + "/api/auth/session", cookie=cookie)
                assert status == 200 and json.loads(body)["user"]["username"] == "auth-test"
                assert call(web_base + "/", cookie=cookie)[0] == 200
                assert call(web_base + "/login", cookie=cookie)[0] == 307
                assert call(web_base + "/pwa", cookie=cookie)[0] == 200
                status, headers, _ = call(web_base + "/login?next=/pwa", cookie=cookie)
                assert status == 307 and headers["Location"] == "/pwa"
                unlock_url = web_base + "/api/auth/device-lock/password-unlock"
                assert call(unlock_url, method="POST", data={"password": "invalid"},
                            cookie=cookie, origin="https://foreign.example")[0] == 403
                assert call(unlock_url, method="POST", data={"password": "invalid"},
                            cookie=cookie, origin=web_base)[0] == 400
                status, headers, body = call(unlock_url, method="POST",
                                            data={"password": credentials["password"]},
                                            cookie=cookie, origin=web_base)
                assert status == 200 and json.loads(body) == {"unlocked": True}
                assert "no-store" in headers["Cache-Control"]
                assert not headers.get("Set-Cookie"), "Password unlock enabled device preference"

                status, headers, body = call(web_base + "/api/auth/session",
                                            cookie="logos_auth=invalid")
                assert status == 200 and not json.loads(body)["authenticated"]
                assert "Max-Age=0" in headers["Set-Cookie"]

                status, headers, _ = call(web_base + "/api/auth/logout", method="POST",
                                         cookie=cookie, origin=web_base)
                assert status == 200 and "Max-Age=0" in headers["Set-Cookie"]
                # Replay of the old cookie must fail after backend token revocation.
                assert not json.loads(call(web_base + "/api/auth/session", cookie=cookie)[2])["authenticated"]
                assert call(web_base + "/", cookie=cookie)[0] == 307
                print("Autenticação real Next → Django: login, cookie, proteção, invalidação e logout OK.")
            except Exception:
                log.flush()
                log.seek(0)
                # Logs contain no test tokens/passwords, only startup and request status.
                print(log.read(), file=sys.stderr)
                raise
            finally:
                for process in reversed(processes):
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()


if __name__ == "__main__":
    run()
