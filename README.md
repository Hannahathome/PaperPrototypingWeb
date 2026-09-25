# PaperPrototypingWeb

Tutorials and browser versions of the [PaperPrototyping](https://github.com/Hannahathome/PaperPrototyping)
tools for designing, printing and cutting paper-based physical prototypes.

**Live site:** https://hannahathome.github.io/PaperPrototypingWeb/

The web apps are basic versions that cover each tool's core functions. The full versions are
the Processing sketches in [PaperPrototyping](https://github.com/Hannahathome/PaperPrototyping).

| Maker tools | Visualisation tools |
|---|---|
| PaperPolyhedra, ScaffoldShell, PaperPhicons, DataPhysicalisation, PaperBlox, FrustumSupport | WidgetGenerator |

See [PLAN.md](PLAN.md) for which tools are being ported, and in what order.

## Adding a tutorial

No web development needed. See the guide on the site,
[How to add a tutorial](https://hannahathome.github.io/PaperPrototypingWeb/contributing/how-to-add-a-tutorial/),
or its source in `src/content/docs/contributing/how-to-add-a-tutorial.md`.

## Running it locally

Requires [Node.js](https://nodejs.org/) 22 or newer.

```bash
git clone https://github.com/Hannahathome/PaperPrototypingWeb.git
cd PaperPrototypingWeb
npm install
npm run dev
```

Then open http://localhost:4321/PaperPrototypingWeb/.

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm test` | Run the tests |
| `npm run build` | Type check, build the site into `dist/` and check all links |
| `npm run preview` | Serve the built site |

## Publishing

Every push to `main` runs the tests and the build on GitHub Actions and, if both pass,
deploys to GitHub Pages. If anything fails, nothing is published.

## Contributing code

Read [CLAUDE.md](CLAUDE.md) first: it has the architecture rules (core/UI split, millimetres
until export, the export file convention and the test layers).

## Author

Hannah van Iterson
