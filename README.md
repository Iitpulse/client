# IIT-PULSE admin

The app lives in [`src-next/`](src-next) (Next.js 16, Bun). It deploys on Coolify:
pushes to the working branch go to staging, and the `release` branch is production.

Local development runs in Docker; see the workspace notes. The old React app that used to sit in the
repository root was removed on 4 Nov 2026; it is still in the git history.
