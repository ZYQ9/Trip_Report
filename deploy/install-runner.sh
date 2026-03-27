#!/usr/bin/env bash
#
# Install a GitHub Actions self-hosted runner on Ubuntu
#
# Usage: sudo ./install-runner.sh <GITHUB_REPO_URL> <RUNNER_TOKEN>
#
# Get your runner token from:
#   GitHub repo → Settings → Actions → Runners → New self-hosted runner
#
set -euo pipefail

if [ $# -lt 2 ]; then
    echo "Usage: sudo $0 <GITHUB_REPO_URL> <RUNNER_TOKEN>"
    echo ""
    echo "Example: sudo $0 https://github.com/youruser/trip-report AABCDEF123..."
    echo ""
    echo "Get the token from:"
    echo "  GitHub repo → Settings → Actions → Runners → New self-hosted runner"
    exit 1
fi

REPO_URL="$1"
RUNNER_TOKEN="$2"
RUNNER_DIR="/opt/actions-runner"
RUNNER_USER="github-runner"

# ---- Create runner user ----
echo "===> Creating runner user"
if ! id "${RUNNER_USER}" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir "${RUNNER_DIR}" --create-home "${RUNNER_USER}"
fi

# Allow runner to restart services via sudo (limited)
cat > /etc/sudoers.d/github-runner << 'SUDOERS'
github-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart trip-report
github-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
github-runner ALL=(ALL) NOPASSWD: /usr/bin/rsync *
github-runner ALL=(ALL) NOPASSWD: /usr/bin/chown *
github-runner ALL=(ALL) NOPASSWD: /usr/bin/chmod *
github-runner ALL=(ALL) NOPASSWD: /usr/bin/npm *
github-runner ALL=(ALL) NOPASSWD: /opt/trip-report/backend/venv/bin/pip *
SUDOERS
chmod 440 /etc/sudoers.d/github-runner

# ---- Download runner ----
echo "===> Downloading GitHub Actions runner"
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

RUNNER_VERSION="2.321.0"
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" = "amd64" ]; then
    RUNNER_ARCH="x64"
elif [ "$ARCH" = "arm64" ]; then
    RUNNER_ARCH="arm64"
else
    echo "Unsupported architecture: ${ARCH}"
    exit 1
fi

curl -sL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" | tar xz

chown -R "${RUNNER_USER}:${RUNNER_USER}" "${RUNNER_DIR}"

# ---- Configure runner ----
echo "===> Configuring runner"
sudo -u "${RUNNER_USER}" ./config.sh \
    --url "${REPO_URL}" \
    --token "${RUNNER_TOKEN}" \
    --name "trip-report-server" \
    --labels "self-hosted,linux,trip-report" \
    --work "_work" \
    --unattended \
    --replace

# ---- Install as systemd service ----
echo "===> Installing runner as systemd service"
./svc.sh install "${RUNNER_USER}"
./svc.sh start

echo ""
echo "===> Runner installed and running!"
echo "    Status: sudo ./svc.sh status"
echo "    Logs:   journalctl -u actions.runner.* -f"
echo ""
echo "The runner will now pick up jobs from: ${REPO_URL}"
