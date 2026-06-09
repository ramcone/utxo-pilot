# Contributing to UTXO Pilot

Thank you for your interest in contributing. UTXO Pilot is open source under GPLv3 and welcomes community involvement.

---

## Ways to contribute

- **Bug reports** — something broken or behaving unexpectedly
- **Feature requests** — ideas for improving the app
- **Code contributions** — bug fixes, new features, or improvements
- **Documentation** — fixing typos, improving clarity, adding examples
- **Testing** — trying the app with different hardware wallets and reporting your results

---

## Opening an issue

Before opening a new issue, please search existing issues to avoid duplicates.

**For bug reports, include:**
- What you were doing when the bug occurred
- What you expected to happen
- What actually happened
- Your OS and Node.js version
- Any error messages from the terminal or browser console

**For feature requests, include:**
- What problem you are trying to solve
- How you currently work around it (if at all)
- Why you think it belongs in UTXO Pilot

You can also use the **in-app feedback form** (sidebar → 🐛 Feedback & Bugs) which pre-fills a GitHub issue template for you.

---

## Opening a pull request

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes**
5. **Test** your changes:
   ```bash
   npm install
   npm run seed --workspace=packages/backend
   npm run dev
   ```
   Explore the app and confirm nothing is broken
6. **Commit** with a clear message describing what changed and why
7. **Push** your branch and open a pull request against `main`

---

## Code style and conventions

- TypeScript throughout — no plain JavaScript
- Prefer explicit types over `any`
- Keep components focused — one responsibility per file
- Follow the existing file and folder structure
- The backend uses Fastify + Zod for validation — new routes should follow the same pattern
- New database changes must be added as a new migration entry in `database.ts` — never edit existing migrations

---

## What contributions are welcome

- Bug fixes
- Usability improvements
- New wallet format support (descriptors, multisig)
- Additional coin selection algorithms
- Export format improvements
- Accessibility improvements
- macOS / Linux testing and fixes
- Translations (future)

---

## What contributions will not be accepted

To protect the core design principles of UTXO Pilot, pull requests will be rejected if they:

- Add any form of private key, seed phrase, or WIF input
- Add transaction signing or broadcasting capability
- Add cloud storage, external accounts, or remote databases
- Add telemetry, analytics, or tracking of any kind
- Remove or weaken the privacy warning banner for public Esplora usage
- Add dependencies that significantly increase the attack surface without strong justification

---

## Security issues

Do **not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

---

## License

By contributing, you agree that your contributions will be licensed under the same [GNU General Public License v3.0](LICENSE) that covers the project.
