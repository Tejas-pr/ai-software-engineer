"""Smoke tests for M1: sandboxing, token encryption, GitHub URL parsing."""

from pathlib import Path

from app.services.github_api import parse_github_url
from app.tools.filesystem import list_files, read_file
from app.utils.crypto import decrypt_token, encrypt_token


def test_parse_github_url_variants():
    assert parse_github_url("https://github.com/owner/repo") == ("owner", "repo")
    assert parse_github_url("https://github.com/owner/repo.git") == ("owner", "repo")
    assert parse_github_url("https://github.com/owner/repo/") == ("owner", "repo")


def test_token_encryption_roundtrip():
    secret = "gho_fakeTokenForTesting1234"
    ciphertext = encrypt_token(secret)
    assert ciphertext != secret
    assert decrypt_token(ciphertext) == secret


def test_filesystem_tools_are_sandboxed(tmp_path: Path):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    (workspace / "inside.txt").write_text("hello")
    outside = tmp_path / "secret.txt"
    outside.write_text("should not be readable")

    assert read_file("inside.txt", workspace_root=workspace) == "hello"

    # Path traversal out of the workspace must be rejected, not followed.
    escaped = read_file("../secret.txt", workspace_root=workspace)
    assert "Access denied" in escaped

    listing = list_files(".", workspace_root=workspace)
    assert "inside.txt" in listing
