# Fortnite Discord Widget

A Discord User App Widget that securely displays your Fortnite stats and locker items directly on your Discord Profile Card!

## Overview

This project integrates Epic Games data with Discord's Application Identities API. By utilizing Discord's native "Connections" system, it guarantees secure account verification without requiring passwords or manual cosmetic equipping.

### Features

* Live Stats: Displays Battle Pass level, Wins, Kills, KD, and Win Rate.
* Locker Summary: Shows total skins, pickaxes, gliders, emotes, and wraps.
* Equipped Skin: Updates your profile to show your currently equipped character.
* Secure Verification: Requires users to link their Epic Games account via Discord Settings to prevent impersonation.

## Requirements

* Node.js (v18+)
* MongoDB
* Discord Application (with `connections` and `role_connections.write` scopes)

## Installation

1. Clone the repository: `git clone https://github.com/thororen1234/Fortnite-Discord-Widget.git`
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and fill in your credentials.
4. Generate an Epic Games Device Auth: `pnpm epic`

## Commands

* `/link` - Authenticate with Discord and link your Epic Games connection.
* `/refresh` - Update your Discord Profile Card with the latest Fortnite stats.
* `/skin <name>` - (Optional) Force your Discord widget to display a specific owned skin instead of your currently equipped one.

## Running Locally

Development:

* `pnpm dev:server` - Starts the Elysia API OAuth server
* `pnpm dev:bot` - Starts the Discord bot

Production:

* `pnpm build`
* `pnpm start` (API Server) & `pnpm bot` (Discord Bot)

## Acknowledgments

* [EpicClients by Jaren8r](https://github.com/Jaren8r/EpicClients) - A comprehensive repository of Epic Games client IDs and secrets, used to power the API authentication in this widget.

## License

MIT License
