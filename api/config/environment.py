import os

from django.core.exceptions import ImproperlyConfigured

DEVELOPMENT_KEY = "dev-only-insecure-logos"


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    if value.lower() not in {"true", "false", "1", "0"}:
        raise ImproperlyConfigured(f"{name}: use true ou false.")
    return value.lower() in {"true", "1"}


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def runtime_settings() -> tuple[bool, str, list[str]]:
    environment = os.getenv("DJANGO_ENV", "production")
    if environment not in {"development", "production"}:
        raise ImproperlyConfigured("DJANGO_ENV precisa ser development ou production.")
    development = environment == "development"
    debug = env_bool("DJANGO_DEBUG", development)
    key = os.getenv("DJANGO_SECRET_KEY", DEVELOPMENT_KEY if development else "")
    hosts = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1" if development else "")
    if not development:
        if debug:
            raise ImproperlyConfigured("DEBUG não pode estar ligado em produção.")
        if len(key) < 50 or len(set(key)) < 5 or key == DEVELOPMENT_KEY:
            raise ImproperlyConfigured("Configure DJANGO_SECRET_KEY forte em produção.")
        if not hosts or "*" in hosts:
            raise ImproperlyConfigured("Configure hosts explícitos em produção.")
    return debug, key, hosts
