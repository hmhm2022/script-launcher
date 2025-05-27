# Scripts Manager

A lightweight desktop script management tool built with Electron for managing, launching, and scheduling various types of scripts (Python, JavaScript, TypeScript, Batch, PowerShell, etc.), featuring scheduled task functionality similar to Qinglong Panel.

[![Version](https://img.shields.io/badge/version-1.3.6-blue.svg)](https://github.com/hmhm2022/scripts-manager)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#system-requirements)

## Features

- 🖥️ **Native Desktop App**: Built with Electron, providing native desktop experience
- 🚀 **Script Launcher**: One-click launch, scripts run in independent windows
- 📁 **Multi-Script Support**: Python, JavaScript, TypeScript, Batch, PowerShell, Bash
- 🎨 **Modern Interface**: Card grid layout with app store-like experience
- 🔍 **Smart Search**: Search scripts by name, type, and description
- 📂 **File Browser**: Built-in file picker for easy script addition
- 🏷️ **Category Management**: Automatic categorization and filtering by script type
- ⏰ **Scheduled Tasks**: Lightweight task scheduler supporting interval, daily, and weekly execution
- 🌍 **Cross-Platform**: Full compatibility with Windows, macOS, and Linux
- 🚀 **Portable**: Support for portable executable packaging
- 🌙 **Dark Theme**: Light/dark theme switching support
- 🔔 **System Tray**: Minimize to system tray for background operation

## Installation and Usage

### Option 1: Download Pre-built Releases (Recommended)

1. Go to [Releases](https://github.com/hmhm2022/scripts-manager/releases) page
2. Download file:   - **Windows**: `ScriptsManager-1.3.6-portable.exe` (Portable)
3. Run the downloaded file to start using

### Option 2: Development Environment

#### Prerequisites
- Node.js (v16+)
- npm

#### Steps

1. **Clone the project**
   ```bash
   git clone https://github.com/hmhm2022/scripts-manager.git
   cd scripts-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   # Normal mode
   npm start

   # Development mode (with dev tools)
   npm run dev
   ```

### Building and Distribution

```bash
# Windows portable
npm run build-portable

# Windows installer
npm run build-installer

# macOS DMG
npm run build-mac

# Linux AppImage
npm run build-linux

# Build all platforms
npm run dist-all
```

## User Guide

### Script Management

- **Add Script**: Click the "+" button at the top and fill in script information
- **Edit Script**: Right-click on script card and select "Edit"
- **Delete Script**: Right-click on script card and select "Delete"
- **Search Scripts**: Use the search box at the top
- **Category Filter**: Click category tags (All, Python, JavaScript, etc.)

### Scheduled Tasks

- **Create Scheduled Task**: Click the ⏰ button at the top and select "New Task"
- **Manage Tasks**: Edit, enable/disable, delete tasks in the task management interface
- **Quick Setup**: Right-click on script card and select "Set Schedule"
- **Execute Immediately**: Click "Execute Now" button in the task list

### Script Execution

1. Click on a script card
2. Script will launch in a new console window
3. Scripts run independently, you can close the manager application

## Supported Script Types

| Script Type | Extensions | Windows | macOS | Linux | Runtime Requirements |
|-------------|------------|---------|-------|-------|---------------------|
| **Python** | `.py` | ✅ | ✅ | ✅ | Python 3.x |
| **JavaScript** | `.js` | ✅ | ✅ | ✅ | Node.js |
| **TypeScript** | `.ts` | ✅ | ✅ | ✅ | ts-node |
| **Batch** | `.bat`, `.cmd` | ✅ | ❌ | ❌ | Windows Built-in |
| **PowerShell** | `.ps1` | ✅ | ✅ | ✅ | PowerShell Core |
| **Bash** | `.sh` | ✅* | ✅ | ✅ | Bash Shell |
| **macOS Scripts** | `.command`, `.tool` | ❌ | ✅ | ❌ | macOS Built-in |

> *Bash scripts on Windows require WSL, Git Bash, or Cygwin environment

### Platform Features

#### Windows
- Scripts launch in new CMD windows
- Support for Batch and PowerShell scripts
- Portable version requires no installation, runs green

#### macOS
- Scripts launch in Terminal.app
- Support for `.command` and `.tool` files
- Native DMG installer package
- Support for Intel and Apple Silicon

#### Linux
- Scripts launch in terminal emulator
- AppImage format, no installation required
- Support for most modern distributions

## Technical Architecture

### Core Technology Stack

- **Electron**: Cross-platform desktop application framework
- **Node.js**: Backend runtime
- **Vanilla JavaScript**: Frontend interface
- **JSON**: Data storage

### Architecture Design

- **Main Process**: Application lifecycle management, IPC communication, system API access
- **Renderer Process**: User interface, user interaction
- **IPC Communication**: Secure communication between main and renderer processes
- **Modular Design**: Separation of script management, execution, and file operations

## Key Features

### 🔒 Security
- Context isolation and preload scripts ensure security
- Disabled Node.js integration prevents security vulnerabilities

### 🌍 Internationalization
- Full support for Chinese paths and filenames
- Proper handling of Chinese script output (GBK/UTF-8 encoding)

### ⚡ Performance Optimization
- Disabled GPU acceleration to avoid compatibility issues
- Smart cache management
- Asynchronous operations for smooth interface responsiveness

### 🎯 User Experience
- Modern card grid layout
- Scripts run in independent windows
- Responsive interface design
- Right-click menu operations

## Troubleshooting

### Common Issues

1. **Script Launch Failure**
   - Check if script path is correct
   - Confirm the corresponding runtime environment is installed
   - Check console error messages

2. **Chinese Display Issues**
   - Application is optimized for Chinese support
   - If issues persist, check system encoding settings

3. **Permission Issues**
   - Ensure script files have execute permissions
   - PowerShell scripts may need execution policy adjustment


For detailed changelog, see [CHANGELOG.md](CHANGELOG.md)

## License

MIT License

---

**Enjoy the efficient script management experience with Scripts Manager!** 🚀
