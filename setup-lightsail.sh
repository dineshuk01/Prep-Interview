#!/usr/bin/env bash
# ==============================================================================
# AWS Lightsail One-Click Server Setup Script
# Works on Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

set -e

echo "=== [1/4] Configuring 2GB Swap Space (Prevents OOM on 1GB/2GB instances) ==="
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap space successfully created."
else
    echo "Swap space already exists."
fi

echo "=== [2/4] Updating system packages and installing prerequisites ==="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

echo "=== [3/4] Installing Docker and Docker Compose Plugin ==="
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

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group
sudo usermod -aG docker $USER

echo "=== [4/4] Setup complete! ==="
echo ""
echo "Next steps to run your application:"
echo "1. Log out and log back in (or run 'newgrp docker') to activate docker permissions."
echo "2. Clone this repository:"
echo "   git clone -b dinesh/lightsail-setup https://github.com/dineshuk01/Prep-Interview.git app"
echo "   cd app"
echo "3. Create backend/.env with your API keys (see backend/.env.example):"
echo "   nano backend/.env"
echo "4. Build and start containers:"
echo "   docker compose up -d --build"
echo ""
echo "Your app will be live at http://<your-lightsail-public-ip>/"
