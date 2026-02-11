# Ignite

A Discord-inspired chat platform built with React, featuring real-time messaging, guild management, role-based permissions, and a desktop client powered by Electron.

## Features

- **Guilds (Servers)** — Create and manage servers with custom icons, organized channels, and invite links
- **Real-time Messaging** — Instant message delivery via WebSockets, with editing, deleting, and markdown support
- **Channels** — Text channels, categories, and DM channels with drag-and-drop sorting
- **Role & Permissions** — Granular permission system with role hierarchy, color-coded members, and per-role access control
- **Friends System** — Send/accept friend requests, manage your friends list, and start direct message conversations
- **Mentions & Unreads** — `@user` mention support with inline suggestions, per-channel unread tracking, and badge indicators
- **Invite System** — Generate invite links with preview pages and quick sign-up for new users
- **Desktop App** — Native desktop client via Electron with custom window controls
- **Dark Theme** — Dark UI inspired by modern chat platforms

## Tech Stack

| Layer             | Technology                                   |
| ----------------- | -------------------------------------------- |
| Framework         | React 18 + TypeScript                        |
| Build Tool        | Vite 5                                       |
| State Management  | Zustand                                      |
| Styling           | Tailwind CSS + Radix UI + shadcn/ui          |
| Real-time         | Laravel Echo + Pusher (Reverb)               |
| HTTP Client       | Axios                                        |
| Forms             | React Hook Form                              |
| Rich Text         | Lexical                                      |
| Drag & Drop       | dnd-kit                                      |
| Desktop           | Electron (via Electron Forge)                |
| Routing           | React Router v6                              |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A running Ignite API backend

### Installation

```bash
git clone <repository-url>
cd ignite-frontend
npm install
```

### Environment

Create a `.env` file in the project root:

```env
VITE_API_URL=<your-api-url>
VITE_REVERB_APP_KEY=<your-reverb-app-key>
VITE_REVERB_HOST=<your-reverb-host>
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

### Development

```bash
# Web
npm run dev

# Desktop (Electron)
npm run start
```

### Build

```bash
# Web build
npm run build

# Electron build
npm run build:electron

# Package desktop app
npm run make
```

## Project Structure

```
src/
├── components/       # UI components organized by feature
│   ├── Channel/      # Message list, input, member sidebar
│   ├── Guild/        # Guild sidebar, channel list, creation
│   ├── Settings/     # Server settings (roles, members, invites)
│   ├── friends/      # Friends list, requests, add friend
│   ├── dm/           # Direct message sidebar
│   ├── Modals/       # Search, edit channel
│   ├── GuildMember/  # Member context menus, profile popovers
│   └── ui/           # Base UI primitives (shadcn/ui)
├── services/         # API calls and business logic
├── store/            # Zustand state stores
├── hooks/            # Custom React hooks
├── contexts/         # React context providers
├── layouts/          # Page layouts (Default, Guild, Guest)
├── pages/            # Route pages
├── enums/            # TypeScript enums (permissions, channel types)
└── lib/              # Utility functions
```

## License

All rights reserved.
