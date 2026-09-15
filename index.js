const express = require('express');
const methodOverride = require('method-override');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true })); // parse form data into req.body
app.use(express.static('public'));                // serve CSS/JS files from /public
app.use(methodOverride('_method'));                // allow forms to fake PUT/DELETE requests

let posts = [];
let nextId = 1;

// READ: show homepage with all posts
app.get('/', (req, res) => {
  res.render('index', { posts: posts });
});

// READ: show edit form pre-filled with one post's current data
app.get('/blog/:id/edit', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  res.render('edit', { post: post });
});

// UPDATE: save changes to an existing post
app.put('/blog/:id', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);

  post.name = req.body.name;
  post.title = req.body.title;
  post.content = req.body.content;

  res.redirect('/');
});

// CREATE: add a new post to the array
app.post('/blog', (req, res) => {
  const newPost = {
    id: nextId++,
    name: req.body.name,
    title: req.body.title,
    content: req.body.content,
    createdAt: new Date()
  };

  posts.push(newPost);
  res.redirect('/');
});

// DELETE: remove a post from the array
app.delete('/blog/:id', (req, res) => {
  posts = posts.filter(p => p.id != req.params.id);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});