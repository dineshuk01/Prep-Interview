# AWS Lightsail Deployment Guide ($3.50 – $5 / month)

This guide walks you through migrating your AI Interview Platform from AWS EKS to **AWS Lightsail** to slash your hosting cost from **~$150–$200/month** down to **$3.50–$5.00/month flat**, while keeping **0ms cold starts** and **real-time WebSocket voice streaming**.

---

## 1. Create Your Lightsail Instance

1. Log in to the [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Click **Create instance**.
3. Configure your instance:
   - **Instance location:** Select your preferred AWS Region (e.g., `us-east-1` or `ap-south-1`).
   - **Platform:** **Linux/Unix**
   - **Blueprint:** **OS Only** ➔ **Ubuntu 22.04 LTS** (or 24.04 LTS).
   - **Instance plan:**
     - **$3.50/mo plan** (512 MB RAM, 1 vCPU, 20 GB SSD) or
     - **$5.00/mo plan** (1 GB RAM, 1 vCPU, 40 GB SSD) — **Recommended**.
   - **Identify your instance:** Name it `ai-interview-server`.
4. Click **Create instance**.

---

## 2. Attach a Static IP & Open Firewall Ports

### Attach a Static IP (Free):
1. In the Lightsail dashboard, go to the **Networking** tab.
2. Click **Create static IP**.
3. Choose your instance (`ai-interview-server`) and click **Create**.
*(Lightsail static IPs are 100% free as long as they are attached to a running instance).*

### Configure Firewall:
1. Click on your instance name ➔ Go to the **IPv4 Firewall** section under the **Networking** tab.
2. Add the following firewall rules:
   - **HTTP** (Port `80`, TCP)
   - **HTTPS** (Port `443`, TCP)
   - **Custom TCP** (Port `8000`, TCP) *(Optional, for direct backend testing)*

---

## 3. Connect and Run One-Click Setup

1. In the Lightsail console, click the terminal icon `>_` next to your instance to open the browser-based SSH terminal (or connect via your local SSH terminal).
2. Download and run the automated setup script:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/dineshuk01/Prep-Interview/dinesh/lightsail-setup/setup-lightsail.sh -o setup.sh
   chmod +x setup.sh
   ./setup.sh
   ```
   *This script automatically configures 2GB swap space (prevents memory exhaustion during builds) and installs Docker with Docker Compose.*

3. Refresh your user session permissions:
   ```bash
   newgrp docker
   ```

---

## 4. Deploy the Application

1. Clone your project branch:
   ```bash
   git clone -b dinesh/lightsail-setup https://github.com/dineshuk01/Prep-Interview.git app
   cd app
   ```

2. Create the backend `.env` file:
   ```bash
   nano backend/.env
   ```
   Paste your configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB=ai_interview_platform
   FRONTEND_URL=*
   ```
   Press `Ctrl+O`, `Enter` to save, and `Ctrl+X` to exit.

3. Start all services using Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Verify the containers are running:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

Your app is now live at: `http://<YOUR_STATIC_IP>/`

---

## 5. Important: Enabling Microphone in Browsers

> [!IMPORTANT]
> Modern web browsers (Google Chrome, Edge, Safari) strictly require **HTTPS** (or `localhost`) for microphone access (`navigator.mediaDevices.getUserMedia`).
>
> If you access your site via raw IP (`http://<YOUR_STATIC_IP>`), the browser may block audio recording.

### Option A: For Quick Testing (No Domain Needed)
In Google Chrome:
1. Open a new tab and navigate to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable the flag and enter your Lightsail URL: `http://<YOUR_STATIC_IP>`
3. Click **Relaunch**. Chrome will now allow microphone access on your IP address.

### Option B: Free Automatic HTTPS via a Domain / DuckDNS
Point any free domain (e.g., from [DuckDNS](https://www.duckdns.org/) or Cloudflare) to your Lightsail Static IP, and enable SSL with Certbot or Caddy in 1 minute.

---

## 6. Tear Down the Old Expensive EKS Cluster!

Once your Lightsail instance is verified and running, remember to delete your EKS cluster to stop the ~$150+/month billing:

1. **Delete Kubernetes Load Balancers first** (so they don't linger):
   ```bash
   kubectl delete -f k8s/frontend-service.yaml
   kubectl delete -f k8s/backend-service.yaml
   ```
2. **Delete the EKS Cluster**:
   If created with `eksctl`:
   ```bash
   eksctl delete cluster --name ai-interview-cluster --region us-east-1
   ```
   *Or go to the AWS EKS Console ➔ Select `ai-interview-cluster` ➔ Click **Delete**.*
