const express = require('express');
const methodOverride = require('method-override');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public'));                
app.use(methodOverride('_method'));                

let posts = [];
let nextId = 1;


app.get('/', (req, res) => {
  res.render('index', { posts: posts });
});


app.get('/blog/:id/edit', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  res.render('edit', { post: post });
});


app.put('/blog/:id', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);

  post.name = req.body.name;
  post.title = req.body.title;
  post.content = req.body.content;

  res.redirect('/');
});

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

app.delete('/blog/:id', (req, res) => {
  posts = posts.filter(p => p.id != req.params.id);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});