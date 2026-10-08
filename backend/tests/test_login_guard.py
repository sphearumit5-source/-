from app.core.login_guard import LoginGuard


def test_no_lockout_before_threshold() -> None:
    guard = LoginGuard(max_failures=3, lockout_seconds=60)
    guard.record_failure("admin")
    guard.record_failure("admin")
    assert guard.remaining_lockout("admin") == 0


def test_lockout_after_reaching_threshold() -> None:
    guard = LoginGuard(max_failures=3, lockout_seconds=60)
    for _ in range(3):
        guard.record_failure("admin")
    assert guard.remaining_lockout("admin") > 0


def test_interleaved_lockout_checks_do_not_reset_failure_count() -> None:
    guard = LoginGuard(max_failures=3, lockout_seconds=60)
    for _ in range(2):
        assert guard.remaining_lockout("admin") == 0
        guard.record_failure("admin")
    assert guard.remaining_lockout("admin") == 0
    guard.record_failure("admin")
    assert guard.remaining_lockout("admin") > 0


def test_success_clears_failures() -> None:
    guard = LoginGuard(max_failures=2, lockout_seconds=60)
    guard.record_failure("admin")
    guard.record_success("admin")
    guard.record_failure("admin")
    assert guard.remaining_lockout("admin") == 0


def test_lockout_is_per_username() -> None:
    guard = LoginGuard(max_failures=1, lockout_seconds=60)
    guard.record_failure("admin")
    assert guard.remaining_lockout("admin") > 0
    assert guard.remaining_lockout("teacher1") == 0


def test_lockout_expires() -> None:
    guard = LoginGuard(max_failures=1, lockout_seconds=0)
    guard.record_failure("admin")
    assert guard.remaining_lockout("admin") == 0
