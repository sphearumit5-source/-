from __future__ import annotations

import threading
import time as _time
from dataclasses import dataclass
from functools import lru_cache


@dataclass
class _Attempt:
    failures: int = 0
    locked_until: float = 0.0


class LoginGuard:
    """In-memory brute-force protection: lock a username after repeated failures."""

    def __init__(self, max_failures: int, lockout_seconds: int) -> None:
        self.max_failures = max_failures
        self.lockout_seconds = lockout_seconds
        self._attempts: dict[str, _Attempt] = {}
        self._lock = threading.Lock()

    def remaining_lockout(self, username: str) -> int:
        with self._lock:
            attempt = self._attempts.get(username)
            if attempt is None or attempt.locked_until <= 0:
                return 0
            remaining = attempt.locked_until - _time.monotonic()
            if remaining <= 0:
                self._attempts.pop(username, None)
                return 0
            return int(remaining) + 1

    def record_failure(self, username: str) -> None:
        with self._lock:
            attempt = self._attempts.setdefault(username, _Attempt())
            attempt.failures += 1
            if attempt.failures >= self.max_failures:
                attempt.locked_until = _time.monotonic() + self.lockout_seconds
                attempt.failures = 0

    def record_success(self, username: str) -> None:
        with self._lock:
            self._attempts.pop(username, None)


@lru_cache(maxsize=1)
def get_login_guard() -> LoginGuard:
    from app.core.config import get_settings

    settings = get_settings()
    return LoginGuard(settings.login_max_failures, settings.login_lockout_seconds)
