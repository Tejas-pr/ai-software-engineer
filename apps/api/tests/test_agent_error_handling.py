"""Unit test for the error-message cleanup a failed run reports to the
frontend/DB — provider errors are long, provider-specific dumps that
shouldn't be shown to a user (or stored) verbatim."""

from app.api.v1.agent import MAX_ERROR_LENGTH, _friendly_error


class FakeRateLimitError(Exception):
    status_code = 429


def test_rate_limit_error_gets_a_short_actionable_message():
    exc = FakeRateLimitError(
        "429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': "
        "'You exceeded your current quota...'}}"
    )
    message = _friendly_error(exc)
    assert "rate limit" in message.lower()
    assert "local Ollama" in message
    assert len(message) < 300  # short, not the raw provider dump


def test_generic_long_error_gets_truncated():
    exc = RuntimeError("x" * 1000)
    message = _friendly_error(exc)
    assert len(message) <= MAX_ERROR_LENGTH + len("...")
    assert message.endswith("...")


def test_short_generic_error_passes_through_unchanged():
    exc = ValueError("workspace not found")
    assert _friendly_error(exc) == "workspace not found"
