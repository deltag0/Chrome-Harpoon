# Chrome Harpoon

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kjcljpflpbjllhimbmikkcdpfdahbiho?style=flat-square)](https://chromewebstore.google.com/detail/web-harpoon/kjcljpflpbjllhimbmikkcdpfdahbiho?authuser=0&hl=en)

<!-- Banner Image -->
![Banner](./assets/banner.png)

## Overview

**Chrome Harpoon** is a productivity-focused Chrome extension that helps you stay in flow by letting you quickly mark and jump to frequently used tabs with custom keybindings. Inspired by tools like Vim's Harpoon and Vimium, it’s designed for developers and power users who want faster tab navigation without reaching for the mouse.

## Features

- Mark tabs for quick access with a single shortcut
- Jump to any marked tab instantly
- Visual tab selector
- Persistent tab state across sessions
- Lightweight and keyboard-friendly

## Installation

Install directly from the Chrome Web Store:

👉 [Chrome Harpoon on the Web Store](https://chromewebstore.google.com/detail/web-harpoon/kjcljpflpbjllhimbmikkcdpfdahbiho?authuser=0&hl=en)

## Usage
| Shortcut     | Action                                                                 |
|------------|-------------------------------------------------------------------------|
| `Alt + A`   | **Mark/Pin the current tab**                                           |
| `Alt + 0–9` | **Switch to a marked tab** (1 is the first marked tab, 0 is the last) |
| `Alt + Z`   | **Go back to the previously selected tab**                            |
| `Alt + Y`   | **Undo a tab switch** (similar to `Ctrl + Y` in text editors)         |

## Differences Between Normal Marks
* Returns to same place where you left off
* Adds marks in the form of a list
* Reordering marks is possible

## Development

To run locally:

```bash
git clone https://github.com/YOUR_USERNAME/Chrome-Harpoon.git
cd Chrome-Harpoon
# Load the folder as an unpacked extension in Chrome
