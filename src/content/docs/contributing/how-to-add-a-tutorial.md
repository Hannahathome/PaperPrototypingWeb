---
title: How to add a tutorial
description: Where tutorial files go, how to add pictures and videos, and how a tutorial gets published. No web development needed.
---

A tutorial is a single text file written in **Markdown**. You put it in the right folder,
push it to GitHub, and a few minutes later it is on the website. You don't need to touch any
code.

## 1. Where the file goes

Every tool has its own tutorial folder:

```
src/content/docs/tutorials/<tool-id>/
```

Use the tool id from this list (always lowercase):

| Tool | Folder |
|---|---|
| PaperPolyhedra | `tutorials/paperpolyhedra/` |
| ScaffoldShell | `tutorials/scaffoldshell/` |
| PaperPhicons | `tutorials/paperphicons/` |
| DataPhysicalisation | `tutorials/dataphysicalisation/` |
| PaperBlox | `tutorials/paperblox/` |
| FrustumSupport | `tutorials/frustumsupport/` |
| WidgetGenerator | `tutorials/widgetgenerator/` |

If the folder doesn't exist yet, just create it. The tutorial then shows up automatically in
the sidebar, on the tool's page and on the [Tutorials](../../tutorials/) page.

**File name:** lowercase, words separated by hyphens, ending in `.md`, for example
`print-your-first-net.md`. The file name becomes the web address, so keep it short.

## 2. Start from the template

Copy `src/content/docs/tutorials/_template.md` into the tool's folder and rename it. The
template already has the sections every tutorial should have:

- **Goal**: what the reader will have made at the end.
- **What you need**: tool, materials, files.
- **Steps**: numbered, one action per step.
- **Common problems**: what goes wrong and how to fix it.
- **Last checked**: the date and the tool version you last followed the tutorial with.

The block between the two `---` lines at the top sets the title and a one-sentence
description. Keep both lines; just change the text after `title:` and `description:`.

## 3. Pictures

Put pictures in an `images` folder next to your tutorial:

```
src/content/docs/tutorials/paperpolyhedra/
├── print-your-first-net.md
└── images/
    └── folded-net.jpg
```

Then add them in the text like this. The words in square brackets describe the picture for
people who can't see it:

```md
![A folded hexagonal prism on a cutting mat](./images/folded-net.jpg)
```

**Keep every picture under 500 KB.** Photos straight from a phone are often 3 to 5 MB. Shrink
them first, for example with [Squoosh](https://squoosh.app/) (resize to about 1600 pixels
wide, save as JPEG or WebP). The automatic checks refuse pictures over 500 KB, so a tutorial
with a large picture won't be published until the picture is smaller.

## 4. Videos

**Never put video files in the repository.** Upload the video to YouTube or Vimeo and embed
it. Copy one of these lines into your tutorial and replace `VIDEO_ID` with the code from the
video's address (on YouTube, the part after `watch?v=`):

```html
<iframe class="video" src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Describe the video" allowfullscreen></iframe>
```

```html
<iframe class="video" src="https://player.vimeo.com/video/VIDEO_ID" title="Describe the video" allowfullscreen></iframe>
```

The automatic checks refuse video files (`.mp4`, `.mov` and so on) anywhere in the project.

## 5. Links

- **To another website:** use the full address, `[PaperPrototyping](https://github.com/Hannahathome/PaperPrototyping)`.
- **To another tutorial for the same tool:** `[Print your first net](../print-your-first-net/)`.
- **To a tool page:** `[PaperPolyhedra](../../../tools/paperpolyhedra/)`.

Don't start an internal link with a single `/`. The site lives at
`hannahathome.github.io/PaperPrototypingWeb/`, and a link like `/tools/paperpolyhedra/` would
skip the `PaperPrototypingWeb` part and break. The automatic checks catch this too.

## 6. Publishing

Anything pushed to the `main` branch is published automatically:

1. GitHub runs the tests and builds the site.
2. If everything passes, the new version goes live after a few minutes.
3. If something fails, nothing is published and the old site stays online. You get an email
   from GitHub, and the **Actions** tab of the repository shows a red cross with the reason.

## Editing directly on github.com

You don't need to install anything to add or fix a tutorial.

**Fix an existing page:** every page on the website has an **Edit page** link at the bottom.
It opens the file on GitHub. Click the pencil icon, make your change, then click
**Commit changes…**, choose *Commit directly to the main branch* and confirm.

**Add a new tutorial:**

1. Open the repository on github.com and go to `src/content/docs/tutorials/`.
2. Open `_template.md`, click the copy icon (*Copy raw file*) and go back.
3. Open the tool's folder, click **Add file → Create new file**. If the folder doesn't exist
   yet, stay in `tutorials/` and type `paperpolyhedra/my-tutorial.md` as the file name. The
   `/` creates the folder.
4. Paste the template, write your tutorial, and use the **Preview** tab to check it.
5. Click **Commit changes…** and commit to `main`.

**Add pictures:** go to the tutorial's folder, then **Add file → Upload files**. To put them in
an `images` folder, first create any file inside `images/` (for example type
`images/.gitkeep` as a new file name), then upload the pictures into that folder.

The GitHub preview doesn't show everything exactly as the website does (videos, for example),
but the text, lists and pictures will look close enough.
