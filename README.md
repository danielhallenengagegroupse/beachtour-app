This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Stable Cloudflare Tunnel (Named Tunnel)

Use this setup instead of temporary `trycloudflare.com` links. A named tunnel gives you a stable hostname.

### 1) Install cloudflared (Windows)

```powershell
winget install --id Cloudflare.cloudflared -e
```

Verify:

```powershell
cloudflared --version
```

### 2) Authenticate and create a named tunnel

```powershell
cloudflared tunnel login
cloudflared tunnel create beachtour
```

The create command prints a tunnel ID and stores credentials in your user profile under `.cloudflared`.

### 3) Create DNS route for your domain

Replace `beachtour.yourdomain.com` with your real hostname:

```powershell
cloudflared tunnel route dns beachtour beachtour.yourdomain.com
```

### 4) Create local config file

Copy `cloudflared/config.example.yml` to `cloudflared/config.yml` and replace:

- `REPLACE_WITH_TUNNEL_ID`
- `REPLACE_WITH_WINDOWS_USER`
- `REPLACE_WITH_HOSTNAME`

### 5) Run app + tunnel

Terminal 1:

```powershell
npm run dev
```

Terminal 2:

```powershell
cloudflared tunnel --config cloudflared/config.yml run
```

Your site should now be available at the hostname you configured, and the URL stays stable across restarts.

## Always-On Access On Windows

If you want the site to stay reachable without manually starting terminals each time, use the included Scheduled Task installer.

### No Domain Mode (Quick Tunnel)

If you do not own a domain, this project can still auto-publish using Cloudflare Quick Tunnel.

- No Cloudflare login required
- No `cloudflared/config.yml` required
- Public URL format: `https://<random>.trycloudflare.com`
- URL changes each time the tunnel restarts

The service installer will use Quick Tunnel automatically when `cloudflared/config.yml` is missing.

### 1) Ensure prerequisites

- `cloudflared` is installed.
- Dependencies are installed:

```powershell
npm install
```

### 2) Install auto-start tasks (run PowerShell as Administrator)

```powershell
npm run service:install
```

This creates two startup tasks:

- `BeachTour-Site` (starts Next.js in production on port 3000)
- `BeachTour-Tunnel` (starts Cloudflare tunnel; named if config exists, otherwise Quick Tunnel)

Both tasks restart automatically if they crash.

If you do not run as Administrator, the installer automatically falls back to current-user logon tasks.

### 3) Validate status

```powershell
Get-ScheduledTask -TaskName BeachTour-Site,BeachTour-Tunnel | Select-Object TaskName,State
```

Get current Quick Tunnel URL:

```powershell
npm run service:url
```

### 4) Remove tasks

```powershell
npm run service:remove
```

### Important limits

- If this computer is powered off, sleeping, or has no internet, the site is not reachable.
- For true 24/7 uptime, deploy the app to a hosted server (for example Vercel) and keep Cloudflare only for DNS/proxy needs.

### Troubleshooting

- `cloudflared` not found:
	install again and restart terminal.
- `cloudflared` installed but still not found in PATH:
	run it directly from
	`C:\\Users\\<your-user>\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\\cloudflared.exe`
	or add that folder to your user PATH.
- Tunnel URL shows Cloudflare 1033:
	`cloudflared` process is not running or is disconnected.
- Hostname does not resolve:
	rerun the DNS route command and confirm domain is in your Cloudflare account.
- Local app unreachable:
	ensure Next.js runs on `http://localhost:3000`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
