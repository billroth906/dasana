const sqlite3 = require('sqlite3').verbose();

//console.log('db path:', path.resolve(__dirname, dashPath.dashPath));

class Db {
  constructor (path) {
    this.path = path;
    this.db = new sqlite3.Database(path);
  }
  getTasks(task, callback) {
    this.db.serialize(() => {
    console.log('getting tasks', this.path);
      this.db.all(`SELECT * FROM snippets INNER JOIN tagsIndex ON snippets.sid = tagsIndex.sid & tagsIndex.tid = ${task}`, (err, row) => {
        console.log('get tasks result', row);
        callback(null, row);
      })
    })

    this.db.close()
  }
  getTags(callback) {
    this.db.serialize(() => {
    console.log('getting tags', this.path);
      this.db.all('SELECT tag AS title, tid FROM tags', (err, row) => {
        console.log(row);
        callback(null, row);
      })
    })

    this.db.close()
  }
}

module.exports = Db;