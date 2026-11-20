# PromptDiet Frontend

The frontend is a React 18 and Vite workbench for exploring PromptDiet's
compression pipeline. It provides the split-pane editor, live metrics,
stage controls, diff views, demo fixtures, and template management UI.

## Requirements

- Node.js 18+

## Local setup

From this directory:

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173`. In development, Vite
proxies `/api` requests to the backend at `http://localhost:7860`.

## Available scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
```

## API configuration

Set `VITE_API_URL` when the backend is hosted separately:

```bash
VITE_API_URL=https://your-backend.example.com npm run build
```

If `VITE_API_URL` is not set, the frontend uses relative `/api` paths. The
backend must be running locally or provided by the hosting platform.

## Deployment

The included `vercel.json` supports deployment with `frontend` as the Vercel
root directory. Configure `VITE_API_URL` to point to the deployed backend.

See the root [project README](../readme.md) for the full architecture and
deployment guide.
