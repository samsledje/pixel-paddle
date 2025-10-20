
# PixelPaddle Agent Guide

## Overview

PixelPaddle is a browser-based Pong variant where custom paddle shapes (16x16 pixel grids) directly affect ball physics and gameplay. Built with vanilla JavaScript, HTML5, and CSS.

## Project Structure

- `index.html`: Main entry point
- `js/game.js`: Game logic, paddle editor, physics, UI
- `js/ai.js`: AI player logic, difficulty, integration
- `css/style.css`, `css/toast.css`: Styling
- `img/`: Game assets
- `AI_README.md`, `AI_CHANGELOG.md`: AI documentation

## Development Workflow

- Open `index.html` in a browser to run locally
- For ES modules, use a local server (`python -m http.server` or VS Code Live Server)
- For modular dev, set `<script type="module">` and revert for production
- No build step; all code runs natively in browser
- Use only static-compatible libraries (e.g., matter.js, toast)

## Game & Code Conventions

- **Paddle Editor:** 16x16 grid, user/preset shapes (rectangle, diamond, cross, circle)
- **Controls:** Player 1: WASD | Player 2: IJKL (hardcoded)
- **Physics:** Ball-paddle collision uses paddle pixel data; paddle width at each Y is critical
- **Boundaries:** Player 1 (x < 300), Player 2 (x > 600); paddles restricted to zones
- **Settings:** Ball speed, paddle scale, win score, AI difficulty, colors managed in JS/UI
- **Rendering:** SVG-based paddle previews and logo; colors via CSS custom properties

## AI Integration

- All AI logic is modular in `js/ai.js`
- AI interacts via exported functions; state includes target, strategy, urgency, velocity
- Difficulty scaling planned; current AI is "Expert" by default
- Document all AI changes in `AI_README.md` and `AI_CHANGELOG.md`

**Tips for AI Agents:**

- Always consider paddle pixel density and symmetry when analyzing shapes; these affect ball deflection and targeting.
- Log and review paddle width at each Y position, especially for non-rectangular or sparse shapes, to avoid targeting errors.

## Best Practices

- Use clear, descriptive names for variables/functions
- Prefer modular, maintainable code; separate UI/game logic from AI
- Document new features/settings in `README.md`; AI changes in AI docs
- Comment thoroughly, follow modern JS/web standards
- Run markdown linting on new markdown files

## Debugging & Testing

- Log paddle shape analysis and AI target positioning for custom/diagonal shapes
- Test edge cases: thin paddles, hollow shapes, extreme scales, slow ball
- Use test cases in `AI_README.md` and `AI_CHANGELOG.md`

**Additional Tips:**

- Use console logs to trace ball-paddle collision outcomes and AI movement decisions.
- Always test with extreme paddle shapes and slow ball speeds to catch edge-case bugs.
- When adding new game settings or features, update both the UI and documentation files.

## Static Hosting

- All code must be static-hosting compatible (e.g., GitHub Pages)
- No server-side dependencies; only use libraries that work statically

## Quick Reference

- For unclear conventions, review `README.md`, `AI_README.md`, `AI_CHANGELOG.md`, and source files
- Ask for feedback if project-specific patterns are not obvious
