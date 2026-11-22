#!/usr/bin/env bash
# ==============================================================================
# AWS Lightsail One-Click Server Setup Script
# Works on Ubuntu / Debian / Amazon Linux 2023 / Amazon Linux 2
# ==============================================================================

set -e

echo "=== [1/4] Configuring 2GB Swap Space (Prevents OOM on 1GB/2GB instances) ==="
if swapon --show 2>/dev/null | grep -q "/swapfile"; then
    echo "Swap space /swapfile is already active."
elif [ -f /swapfile ]; then
    echo "Swap file exists, enabling swap..."
    sudo swapon /swapfile 2>/dev/null || true
else
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile 2>/dev/null || true
    sudo swapon /swapfile 2>/dev/null || true
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap space successfully created."
fi

echo "=== [2/4] Detecting OS and Installing Docker ==="
if command -v apt-get &>/dev/null; then
    echo "Detected Debian/Ubuntu system..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release git
    sudo install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
    fi
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

elif command -v dnf &>/dev/null; then
    echo "Detected Amazon Linux 2023 / Fedora system..."
    sudo dnf update -y
    sudo dnf install -y docker git curl
    # Install standalone Docker Compose and Compose plugin
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    ARCH=$(uname -m)
    sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$ARCH" -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    sudo ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

elif command -v yum &>/dev/null; then
    echo "Detected Amazon Linux 2 / CentOS system..."
    sudo yum update -y
    sudo amazon-linux-extras install -y docker 2>/dev/null || sudo yum install -y docker git curl
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    ARCH=$(uname -m)
    sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$ARCH" -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    sudo ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
fi

echo "=== [3/4] Enabling and starting Docker ==="
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group
sudo usermod -aG docker $USER

echo "=== [4/4] Setup complete! ==="
echo ""
echo "Next steps to run your application:"
echo "1. Activate docker permissions:"
echo "   newgrp docker"
echo "2. Clone this repository:"
echo "   git clone -b dinesh/lightsail-setup https://github.com/dineshuk01/Prep-Interview.git app"
echo "   cd app"
echo "3. Create backend/.env with your API keys (see backend/.env.example):"
echo "   nano backend/.env"
echo "4. Build and start containers:"
echo "   docker compose up -d --build"
echo ""
echo "Your app will be live at http://<your-lightsail-public-ip>/"
