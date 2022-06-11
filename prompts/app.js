const Db = require('../db/db.js');
const axios = require('axios');
const prompts = require('prompts');
const FileHound = require('filehound');
const DiffMatchPatch = require('diff-match-patch');
const os = require("os");
const userInfo = os.userInfo();
const homedir = userInfo.homedir;
let dashFiles = [];
let asanaUser = {};
let asanaToken = process.env.ASANA_PERSONAL_TOKEN || '';
let asanaProject = process.env.ASANA_PROJECT_ID || '';
let dashFileDirectory = process.env.DASH_FILE_DIRECTORY || '';
let dashPath = '';
let tagId = NaN;
let tagName = '';
let snippets = [];
let tasks = [];
let requests = [];

//Welcome message
console.log('Welcome to Dasana!');
//Find path of home directory and Dash library
FileHound.create()
  .paths(`${homedir}/Library/Application Support/Dash`)
  .ext('dash')
  .find()
  .then((data) => {
    dashFiles = data;
    //Prompt for Asana token
    return prompts({
      type: 'text',
      name: 'token',
      message: `What is your Asana Personal Access Token? If you don't have one, you can generate one at: https://app.asana.com/0/my-apps`,
      initial: asanaToken
    });
  })
  .then((response) => {
    asanaToken = response.token;
    //Get user information from Asana
    return axios({
      method: 'get',
      headers: {'Authorization': `Bearer ${asanaToken}`},
      url: 'https://app.asana.com/api/1.0/users/me',
      responseType: 'json'
    })
  })

  .then((response) => {
    asanaUser = response.data.data;
    //Find Dash file in default directory if it exists and prompt user whether they want to use it
    if(dashFiles.length > 0) {
      return prompts({
      type: 'confirm',
      name: 'defaultDash',
      message: `Hello, ${asanaUser.name}! We found a Dash library at: ${dashFiles[0]} , which is the default location where Dash stores its Snippets. You can identify the location of your Snippets by viewing the Snippet library location in Dash at Dash -> Preferences -> Snippets. Is this the dash file that you want to use?`,
      initial: true
    })
    .then((response) => {
      if (response.defaultDash) {
        dashFileDirectory = `${homedir}/Library/Application Support/Dash`;
      }
    });
    }
  })
  .then(() => {
    console.log('dashpath:',dashPath);
    //Allow user to select Dash snippet file that they wish to use
    return prompts({
      type: 'text',
      name: 'path',
      message: `What directory shall we look for your dash file in?`,
      initial: dashFileDirectory
    })
    .then((path) => {
      console.log(path);
      return FileHound.create()
        .paths(path.path)
        .ext('dash')
        .find()
    })
    .then((data) => {
      console.log(data[0]);
      if(data.length > 0) {
        return prompts({
          type: 'select',
          name: 'dashfile',
          message: 'Please select the dash file you wish to use.',
          choices: data,
          format: (value) => data[value]
        });
      }
    })
    .then((response) => {
      dashPath = response.dashfile;
    })
  })
  .then(() => {
    //Get tags from Dash database
    let dashDb = new Db(dashPath);
    return new Promise ((resolve, reject) => {
      dashDb.getTags((error, result) => {
        resolve(result);
      });
    });
  })
  .then((data) => {
    if(data.length > 0) {
      return prompts({
        type: 'select',
        name: 'dashfile',
        message: 'Please select the tag denoting the Snippets that you wish to import into Asana.',
        choices: data,
        format: (value) => {return {tid: data[value].tid, tag: data[value].title}}
      });
    } else {
      throw('There are no tags associated with any of your Dash notes. Please add tags to the notes you would like to import into Asana.');
    }
  })
  .then((data) => {
    tagId = data.dashfile.tid;
    tagName = data.dashfile.title;
    //Prompt for ID of Asana project
    return prompts(
    {
      type: 'text',
      name: 'aProject',
      message: `What is the ID of the Asana project that you wish to import into? This number can be found in the URL of the project: app.asana.com/0/{PROJECT ID}/list`,
      initial: asanaProject
    });
  })
  .then((response) => {
    asanaProject = response.aProject;
    let dashDb = new Db(dashPath);
    return new Promise ((resolve, reject) => {
      dashDb.getTasks(tagId, (error, result) => {
        resolve(result);
      });
    });
  })
  .then((response) => {
    snippets = response;
    return axios({
      method: 'get',
      headers: {'Authorization': `Bearer ${asanaToken}`},
      url: `https://app.asana.com/api/1.0/projects/${asanaProject}/tasks?opt_fields=name,notes`,
      responseType: 'json'
    })
  })
  .then((response) => {
    tasks = response.data.data;
    for (var snippet = 0; snippet < snippets.length; snippet++) {
      let snipName = snippets[snippet].title;
      if (snipName.endsWith('`')) {
        snipName = snipName.slice(0, (snipName.length - 1));
      }
      let asanaTask = tasks.find( ({ name }) => name === snipName );
      //Snippet already matches the title of a snippet in Asana
      if (asanaTask) {
        console.log('post subtask', asanaTask.notes, snippets[snippet].body);
        let dmp = new DiffMatchPatch();
        let diff = dmp.diff_main(asanaTask.notes, snippets[snippet].body);
        console.log('diff1', diff);
        dmp.diff_cleanupSemantic(diff);
        console.log('diff2', diff);
        let diffHtml = '<body>';
        if (diff.length === 1 && diff[0][0] === 0) {
          diffHtml = `${diffHtml}<strong>${asanaUser.name} imported an identical note from Dash in comparison to the note already represented in this task.</strong>`
        } else {
          diffHtml = `${diffHtml}${asanaUser.name} imported a note from Dash that differs from the note already represented in this task. <strong><em>Comparison of Notes: </em></strong>`
          for (var section = 0; section < diff.length; section++) {
            if (diff[section][0] === -1) {
              diffHtml = diffHtml + '<strong><s>' + diff[section][1] + '</s></strong>';
            } else if (diff[section][0] === 1) {
              diffHtml = diffHtml + '<strong><u>' + diff[section][1] + '</u></strong>';
            } else if (diff[section][0] === 0) {
              diffHtml = diffHtml + diff[section][1];
            }
          }
          diffHtml = `${diffHtml} <strong><em>Full Text of Changes: </em></strong><code> ${snippets[snippet].body}</code>`
        }
        diffHtml = diffHtml + '</body>';
        let request = new Promise((resolve, reject) => {
          axios.post(`https://app.asana.com/api/1.0/tasks/${asanaTask.gid}/stories`, {
            data: {
              "html_text": diffHtml
            }},{
            headers: {'Authorization': `Bearer ${asanaToken}`}
          })
          .then((response) => {
            resolve(response);
          })
          .catch((error) => {
            reject(error);
          });
        });
        requests.push(request);
        //Update task status to not completed if there is difference in note from original task
        if(diff.length > 1 || diff[0][0] !== 0) {
          let request2 = new Promise((resolve, reject) => {
            axios.put(`https://app.asana.com/api/1.0/tasks/${asanaTask.gid}`, {
              data: {
                "assignee": "me",
                "completed": false
              }},{
              headers: {'Authorization': `Bearer ${asanaToken}`}
            })
            .then((response) => {
              resolve(response);
            })
            .catch((error) => {
              reject(error);
            });
          });
          requests.push(request2);
        }

      }
      else {
        console.log('post new task');
        let request = new Promise((resolve, reject) => {
          axios.post('https://app.asana.com/api/1.0/tasks', {
           data: {
             "approval_status": "pending",
             "assignee": asanaUser.gid,
             "assignee_status": "upcoming",
             "completed": true,
             "completed_by": "me",
             "name": snipName,
             "notes": snippets[snippet].body,
             "projects": [asanaProject]
           }},{
           headers: {'Authorization': `Bearer ${asanaToken}`}
         })
         .then((response) => {
           resolve(response);
         })
         .catch((error) => {
           reject(error);
          });
        });
        requests.push(request);
      }
    }
  })
  .then(() => {
    Promise.all(requests);
  })
  .then((response) => {
    console.log(`All Dash tasks tagged with '${tagName}' have successfully been imported into Asana Project ${asanaProject}. Visit that project at: https://app.asana.com/0/${asanaProject}/list`);
  })
  .catch((error) => {
    console.log('Dasana has encountered an error. Please try dasaning again!');
    console.log(error);
  });

module.exports = {
  dash: dashPath
};