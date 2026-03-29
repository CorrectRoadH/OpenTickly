"""
Root conftest for running toggl-cli Python SDK integration tests
against the opentoggl backend.

Provisions a fresh test user via HTTP, generates a temporary config
file, and injects TOGGL_API_TOKEN / TOGGL_API_URL into the environment
so the Python SDK talks to localhost instead of api.track.toggl.com.
"""
import json
import os
import sys
import tempfile
from pathlib import Path
from base64 import b64encode
from urllib.request import Request, urlopen

import pytest

# Make the submodule's source importable
_toggl_cli_root = Path(__file__).parent / "toggl-cli"
sys.path.insert(0, str(_toggl_cli_root))

BACKEND_BASE = os.environ.get("OPENTOGGL_CLI_TEST_BASE", "http://127.0.0.1:8080")
API_URL = os.environ.get("OPENTOGGL_CLI_TEST_URL", f"{BACKEND_BASE}/api/v9")


def _http_json(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body else None
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = Request(url, data=data, headers=hdrs, method=method)
    with urlopen(req) as resp:
        return json.loads(resp.read())


def _provision_user():
    """Register a user and return (api_token, workspace_id)."""
    import time, random, string
    suffix = f"{int(time.time())}-{''.join(random.choices(string.ascii_lowercase, k=4))}"
    email = f"pytest-sdk-{suffix}@test.local"
    password = "TestPassword123!"

    _http_json("POST", f"{BACKEND_BASE}/web/v1/auth/register", {
        "email": email,
        "password": password,
        "fullname": "Python SDK Test",
    })

    auth = b64encode(f"{email}:{password}".encode()).decode()
    me = _http_json("GET", f"{API_URL}/me", headers={
        "Authorization": f"Basic {auth}",
    })

    return me["api_token"], me["default_workspace_id"]


@pytest.fixture(scope="session", autouse=True)
def opentoggl_env():
    """Set env vars so the Python SDK targets the local opentoggl backend."""
    api_token, wid = _provision_user()

    # Write a temporary config file matching the format tests/configs/non-premium.config
    config_dir = tempfile.mkdtemp(prefix="opentoggl-pytest-")
    config_path = Path(config_dir) / "non-premium.config"
    config_path.write_text(
        f"[version]\nversion = 2.0.0\n\n"
        f"[options]\ntz = utc\ndefault_wid = {wid}\nretries = 10\n"
    )

    # Patch environment
    old_env = {}
    env_overrides = {
        "TOGGL_API_TOKEN": api_token,
        "TOGGL_API_URL": API_URL,
    }
    for key, val in env_overrides.items():
        old_env[key] = os.environ.get(key)
        os.environ[key] = val

    # Patch the IniConfigMixin default path so get_config() finds our file
    from toggl.utils import config as config_mod
    original_default = config_mod.IniConfigMixin.DEFAULT_CONFIG_PATH
    config_mod.IniConfigMixin.DEFAULT_CONFIG_PATH = str(config_path)

    # Also make tests/configs/ resolve to our temp dir so
    # helpers.get_config('non-premium.config') works
    tests_configs_dir = _toggl_cli_root / "tests" / "configs"
    if not tests_configs_dir.exists():
        tests_configs_dir.mkdir(parents=True, exist_ok=True)

    generated_config = tests_configs_dir / "non-premium.config"
    existing_content = generated_config.read_text() if generated_config.exists() else None
    generated_config.write_text(config_path.read_text())

    yield

    # Restore
    config_mod.IniConfigMixin.DEFAULT_CONFIG_PATH = original_default

    for key, val in old_env.items():
        if val is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = val

    if existing_content is not None:
        generated_config.write_text(existing_content)


# Re-export the marker auto-tagger from the submodule's conftest
def pytest_collection_modifyitems(items):
    for item in items:
        if item.fspath is None:
            continue
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
