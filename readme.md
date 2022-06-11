# Dasana
## Goal
Application takes snippets from [Kapeli Dash](https://kapeli.com/dash), and converts them to tasks in Asana.
## Features
- [x] Given a snippet that is not matching the name of an Asana task, a new task in Asana is created within the specified Asana project. Task is assigned to the person executing the Dasana app, and task is marked as completed in Asana.

- [x] If a task is named the same as an existing task in the specified Asana project, the text of the snippet being imported will be compared with the existing Asana task. If the text is the same, the Asana task will record a comment that the user attempted to import an identical note to the one that already exists. The Asana task will remain marked as completed. If the text is different, there will be a text comparison that is given in the comments of the Asana task. Original task text will be struck through if not present in new snippet, and new/modified text will be underlined. Following the comparison, the full text of the snippet being imported will be given so that the user can copy and paste that new text into the Asana task if wanted. The Asana task will be marked as uncompleted and assigned to the user that imported the modified text.
## Stack Utilized
- [>Prompts](https://www.npmjs.com/package/prompts)
- [SQLite](https://www.sqlite.org/index.html)
- [Diff Match Patch](https://github.com/google/diff-match-patch)
## Spinning Up the App
There are three elements that an enduser needs in order to utilize Dasana.
1. Asana Personal Access Token: can be generated at: [https://app.asana.com/0/my-apps](https://app.asana.com/0/my-apps)
2. Asana Project ID: can be found in URL of Asana project (e.g., https://app.asana.com/0/PROJECT_ID/list)
3. The directory in which the Dash Snippets file is located. By default, this is at {Home Directory}/Library/Application Support/Dash, but it can be wherever user has configured for the Snippet Library Location in the Dash application at Dash -> Preferences -> Snippets.
---
It is optional, though convenient, to utilize a .env file with three environment variables. A sample .env.example file is included in the repository.
```
ASANA_PERSONAL_TOKEN=
ASANA_PROJECT_ID=
DASH_FILE_DIRECTORY=/Users/rppfolk/snippets/
```
Dasana utilizes a command line inferface for the entire user experience, launched by the script:
```
npm start
```

