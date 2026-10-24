# Breach Guide: start here

## The easiest route: browser demo

Planned address: **https://pvud14.github.io/dpdp-breach-kit/**.
The first deployment is pending review, merge and Pages activation. If the link is unavailable,
follow the local setup below. Once deployed, the demo needs only a browser; no Node.js,
Git or account is required. Use fictional data. Do not enter personal details.

1. Open the app. For a built-in exercise, expand **Just exploring? Try a fictional example.**
2. Or select **Start a new incident** to answer six questions. Unknown is a valid answer.
3. Read **Your next steps** and correct answers using **Review my answers**.
4. Use **Save summary for review** for a readable TXT handoff.
5. Use **Save to file** for the JSON backup that lets you resume. During the interview,
   this is **Save and continue later**. Confirm the download finished before closing.
6. Reopen with **Import an existing incident** on the start screen, or **Open a saved file…**
   inside an existing session. Import JSON, not TXT or this guide.

The app does not email, submit reports or fix the incident. Ask the responsible manager,
IT support or privacy/legal reviewer for help. Its drafts are not official forms.

## Run on your own computer

Ask an IT helper if installation is unfamiliar. Install Git and a Node.js version compatible
with the project (minimum declared version: 22.12). In your chosen project parent folder:

```sh
git clone https://github.com/PVUD14/dpdp-breach-kit.git
cd dpdp-breach-kit
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

On Windows, `npm.cmd` can be used instead of `npm`. Do not disable execution policies.
Alternatively use GitHub **Code → Download ZIP**, extract it, and open a terminal in the folder
containing `package.json`. Start at `npm ci`.

Open **http://127.0.0.1:4173/** on that same computer. Leave the server terminal open.
Localhost means “this computer”; it does not let a phone reach the server on your PC.
Opening `index.html` directly from disk is not supported.

The install step needs internet. After installation and build, local preview does not need it.
On later visits, repeat only the preview command from the project folder. After code updates,
rebuild; after lockfile changes, run `npm ci` first. Save JSON before refreshing.

## Save and stop

- **JSON:** editable backup; use it to resume. No automatic browser or cloud backup exists.
- **TXT summary:** readable handoff; cannot restore the app's state.
- **TXT response pack:** full reviewer bundle; also not an editable backup.

Check your browser's Downloads list; Chrome uses Ctrl+J. Store files in an approved secure
location. Close the tab, then press Ctrl+C in the preview terminal to stop the server.

## If something goes wrong

- **Page unavailable:** check the server and exact address. Use http locally, https for the hosted demo.
- **Command not found:** ask IT to check Node/npm installation; reopen the terminal afterwards.
- **Port occupied:** an existing preview may already work. Otherwise use port 4174 in both command and URL.
- **Build failure:** keep the error text, remove secrets, and ask the project owner for help.
- **File rejected:** keep the original; select an app-generated JSON backup, not TXT/PDF.
- **Unsaved answers lost:** there is no stored copy to restore; reopen the latest downloaded backup.

See the [visual PDF](../public/guide/Breach-Guide-SOP.pdf) for a fictional walkthrough.
Legal review, novice testing and manual screen-reader verification remain open.
