# Daggerheart: Resource Macros

A Foundry VTT module designed for the **Daggerheart** system. It automatically triggers macros whenever the global **Fear** resource or a player character's **Hope**, **Stress**, or **HP** resource changes.

This allows Game Masters to automate events, send chat messages, or trigger visual effects exactly when Fear goes up, Hope runs out, or any other threshold is crossed.

A simple example of a chat message displayed when Fear changes:
<p align="center">
  <img width="400" src="docs/simplechat.webp">
</p>


[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/mestredigital) [![More Modules](https://img.shields.io/badge/Foundry%20VTT-More%20Modules-red?style=for-the-badge&logo=gamepad)](https://mestredigital.online/pages/projetos-en)

## ✨ Features

- **Fear Triggers:** Detects changes in the global Daggerheart Fear resource.
- **Hope Triggers:** Detects changes in Hope for every player-owned character.
- **Stress Triggers:** Detects changes in Stress for every player-owned character.
- **HP Triggers:** Detects changes in HP for every player-owned character.
- **Dynamic Limits:** Automatically respects the maximum Fear value configured in the system settings (no longer fixed at 12).
- **Configurable Macros:** Assign different macros for each trigger event (see below).
- **`Resource.Message()` API:** A simple function you can call inside any macro to send a styled Daggerheart chat card, with optional text, background image, and sound.

## 🚀 Getting Started

This module includes a **Compendium Pack** named `Resource Macros` containing basic examples.

1. Go to the **Compendium Packs** tab in Foundry VTT.
2. Locate **Resource Macros**.
3. Import the macros into your world.
4. The module settings are pre-configured to use these default names.

<p align="center">
  <img width="400" src="docs/macros.webp" alt="Macros Example">
</p>

## ⚙️ Configuration

Go to the **Module Settings** tab in Foundry VTT to configure the behavior.

### Fear Triggers

| Trigger | Description |
| :--- | :--- |
| **Macro: Increase Fear** | Runs when Fear goes UP (but has not yet reached the maximum). |
| **Macro: Decrease Fear** | Runs when Fear goes DOWN (but has not yet reached 0). |
| **Macro: Fear Max** | Runs when Fear reaches the **maximum value defined in system settings**. |
| **Macro: Fear Min** | Runs when Fear reaches exactly **0**. |

### Hope Triggers

| Trigger | Description |
| :--- | :--- |
| **Macro: Increase Hope** | Runs when a player character's Hope goes UP (but has not yet reached the maximum). |
| **Macro: Decrease Hope** | Runs when a player character's Hope goes DOWN (but has not yet reached 0). |
| **Macro: Hope Max** | Runs when Hope reaches the character's maximum value. |
| **Macro: Hope Zero** | Runs when Hope reaches exactly **0**. |

### Stress Triggers

| Trigger | Description |
| :--- | :--- |
| **Macro: Increase Stress** | Runs when a player character's Stress goes UP (but has not yet reached the maximum). |
| **Macro: Decrease Stress** | Runs when a player character's Stress goes DOWN (but has not yet reached 0). |
| **Macro: Stress Max** | Runs when Stress reaches the character's maximum value. |
| **Macro: Stress Zero** | Runs when Stress reaches exactly **0**. |

### HP Triggers

| Trigger | Description |
| :--- | :--- |
| **Macro: Increase HP** | Runs when a player character's HP goes UP (but has not yet reached the maximum). |
| **Macro: Decrease HP** | Runs when a player character's HP goes DOWN (but has not yet reached 0). |
| **Macro: HP Max** | Runs when HP reaches the character's maximum value. |
| **Macro: HP Zero** | Runs when HP reaches exactly **0** (the death move trigger point). |

> **Note:** All triggers execute only on the GM's client to prevent duplicate effects. Hope, Stress, and HP macros receive the `actor` variable in scope, so you can reference the character who triggered the change inside the macro script.

<p align="center">
  <img width="600" src="docs/settings.webp" alt="Settings Example">
</p>

## 💬 Resource.Message() — Chat Card API

The module exposes a function called `Resource.Message()` that you can use inside any macro to send a styled Daggerheart chat card to all players.

Full documentation is available on the [Wiki](https://github.com/brunocalado/daggerheart-fear-macros/wiki/Resource.Message()-%E2%80%94-Chat-Card-API).

**Header only** — a minimal announcement:
```js
Resource.Message({ header: "-1 Fear" });
```

## 🔧 Manual Installation

To install this module manually, use the following manifest URL in the "Install Module" dialog within Foundry VTT:

```js
https://raw.githubusercontent.com/brunocalado/daggerheart-fear-macros/main/module.json
```

## 📜 Changelog

You can read the full history of changes in the [CHANGELOG](CHANGELOG.md).

## ⚖️ License

Code license at [LICENSE](LICENSE).

This module is an independent project and is not affiliated with the official Daggerheart system creators.
# 🧰 My Daggerheart Modules

| Module | Description |
| :--- | :--- |
| 💀 **Adversary Manager** | Scale adversaries instantly and build balanced encounters. |
| 🖼️ **Art Mapper** | Automatically assigns artwork to system compendiums, actors, tokens, and custom module content — keeping your visuals organized and up to date. |
| 🐉 **Colossus** | Manage massive multi-part boss encounters with independent HP per part and a single shared stress pool. |
| 📦 **Containers** | Group inventory items into collapsible containers — pouches, chests, backpacks — to declutter character sheets. |
| 💥 **Critical** | Animated criticals. |
| 💠 **Custom Stat Tracker** | Add custom trackers to actors. |
| ☠️ **Death Moves** | Enhances the Death Move moment with a dramatic interface and full automation. |
| 📏 **Distances** | Visualizes combat ranges with customizable rings and hover calculations. |
| 📦 **Extra Content** | Homebrew content pack. |
| 😱 **Fear Tracker** | Adds an animated slider bar with configurable fear tokens to the UI. |
| 🧟 **Horde** | Explode single horde tokens into dozens of individual tokens and manage their movement and stats automatically. |
| 🎁 **Mystery Box** | Introduces mystery box mechanics for random loot and surprises. |
| ⚡ **Quick Actions** | Quick access to common mechanics like Falling Damage, Downtime, etc. |
| 📜 **Quick Rules** | Fast and accessible reference guide for the core rules. |
| 🤖 **Resource Macros** | Automatically executes macros when the Fear, Hope, Stress, or HP resources change. |
| 🎲 **Stats** | Tracks dice rolls from GM and Players. |
| 🧠 **Stats Toolbox** | Import actors using a statblock. |
| 🛒 **Store** | A dynamic, interactive, and fully configurable in-game store. |
| 🔍 **Unidentified** | Obfuscates item names and descriptions until they are identified by the players. |
| 🌌 **Void** | Unofficial module that brings The Void playtesting content — experimental classes, subclasses, ancestries, communities, adversaries, loot, weapons, and more. |

# 🗺️ Adventures

| Adventure | Description |
| :--- | :--- |
| ✨ **I Wish** | A wealthy merchant is cursed; one final expedition may be the only hope. |
| 💣 **Suicide Squad** | Criminals forced to serve a ruthless master in a land on the brink of war. |

