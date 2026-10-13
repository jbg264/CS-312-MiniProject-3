// import required packages
const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const { Pool } = require('pg');

// create the express app
const app = express();
// set the port the server listens on
const PORT = 3000;

// create a connection pool to the postgres database
const pool = new Pool(
{
    user: 'postgres',
    host: 'localhost',
    database: 'BlogDB',
    password: 'meowmeowmeowfiller',
    port: 5432,
});

// use ejs to render the pages
app.set('view engine', 'ejs');

// parse form data into req.body
app.use(express.urlencoded({ extended: true }));
// serve css files from the public folder
app.use(express.static('public'));
// allow forms to send put and delete requests
app.use(methodOverride('_method'));

// set up sessions to remember who is signed in
app.use(session(
{
    secret: 'blog-app-session-secret',
    resave: false,
    saveUninitialized: false
}));

// make the signed in user available to every page
app.use((req, res, next) =>
{
    // store the user, or null if nobody is signed in
    res.locals.currentUser = req.session.user || null;
    // move on to the next function
    next();
});

// send users who are not signed in to the sign in page
function requireLogin(req, res, next)
{
    // if nobody is signed in
    if (!req.session.user)
    {
        // redirect to the sign in page
        return res.redirect('/signin');
    }
    // otherwise move on to the route
    next();
}

// show the sign up page
app.get('/signup', (req, res) =>
{
    // render the sign up page
    res.render('signup');
});

// create a new account
app.post('/signup', async (req, res) =>
{
    // get the user's input from the form
    const { user_id, password, name } = req.body;

    try
    {
        // check if the user id is already taken
        const result = await pool.query(
            'SELECT * FROM users WHERE user_id = $1', [user_id]);

        // if the user id is taken
        if (result.rows.length > 0)
        {
            // ask the user to choose a different user id
            return res.render('signup',
                { error: 'That user ID is already taken. Please choose a different one.' });
        }

        // add the new user to the database
        await pool.query(
            'INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)',
            [user_id, password, name]);
        // send the user to the sign in page
        res.redirect('/signin');
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // show a generic error message
        res.render('signup', { error: 'Something went wrong. Please try again.' });
    }
});

// show the sign in page
app.get('/signin', (req, res) =>
{
    // render the sign in page
    res.render('signin');
});

// sign in to an existing account
app.post('/signin', async (req, res) =>
{
    // get the user's input from the form
    const { user_id, password } = req.body;

    try
    {
        // look for a user with a matching user id and password
        const result = await pool.query(
            'SELECT * FROM users WHERE user_id = $1 AND password = $2',
            [user_id, password]);

        // if no user matched
        if (result.rows.length === 0)
        {
            // ask the user to try again
            return res.render('signin', { error: 'Incorrect user ID or password.' });
        }

        // remember the signed in user
        req.session.user = result.rows[0];
        // send the user to the blog feed
        res.redirect('/');
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // show a generic error message
        res.render('signin', { error: 'Something went wrong. Please try again.' });
    }
});

// sign out of the account
app.post('/signout', (req, res) =>
{
    // delete the session
    req.session.destroy(() =>
    {
        // send the user to the sign in page
        res.redirect('/signin');
    });
});

// show the homepage with all posts
app.get('/', async (req, res) =>
{
    try
    {
        // get all posts, newest first
        const result = await pool.query('SELECT * FROM blogs ORDER BY date_created DESC');
        // render the homepage with the posts
        res.render('index', { posts: result.rows });
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // render the homepage with no posts and an error message
        res.render('index', { posts: [], error: 'Could not load posts.' });
    }
});

// create a new post
app.post('/blog', requireLogin, async (req, res) =>
{
    // get the post's title and content from the form
    const { title, content } = req.body;

    try
    {
        // add the post to the database as the signed in user
        await pool.query(
            'INSERT INTO blogs (creator_name, creator_user_id, title, body) VALUES ($1, $2, $3, $4)',
            [req.session.user.name, req.session.user.user_id, title, content]);
        // send the user back to the homepage
        res.redirect('/');
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // send the user back to the homepage
        res.redirect('/');
    }
});

// show the edit page for a post
app.get('/blog/:id/edit', requireLogin, async (req, res) =>
{
    try
    {
        // find the post, only if the signed in user created it
        const result = await pool.query(
            'SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2',
            [req.params.id, req.session.user.user_id]);

        // if no post matched
        if (result.rows.length === 0)
        {
            // tell the user they can only edit their own posts
            return res.status(403).send('You can only edit your own posts.');
        }

        // render the edit page with the post
        res.render('edit', { post: result.rows[0] });
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // send the user back to the homepage
        res.redirect('/');
    }
});

// save changes to a post
app.put('/blog/:id', requireLogin, async (req, res) =>
{
    // get the new title and content from the form
    const { title, content } = req.body;

    try
    {
        // update the post, only if the signed in user created it
        const result = await pool.query(
            'UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3 AND creator_user_id = $4',
            [title, content, req.params.id, req.session.user.user_id]);

        // if no post was updated
        if (result.rowCount === 0)
        {
            // tell the user they can only edit their own posts
            return res.status(403).send('You can only edit your own posts.');
        }

        // send the user back to the homepage
        res.redirect('/');
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // send the user back to the homepage
        res.redirect('/');
    }
});

// delete a post
app.delete('/blog/:id', requireLogin, async (req, res) =>
{
    try
    {
        // delete the post, only if the signed in user created it
        const result = await pool.query(
            'DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2',
            [req.params.id, req.session.user.user_id]);

        // if no post was deleted
        if (result.rowCount === 0)
        {
            // tell the user they can only delete their own posts
            return res.status(403).send('You can only delete your own posts.');
        }

        // send the user back to the homepage
        res.redirect('/');
    }
    // handle any database errors
    catch (err)
    {
        // print the error
        console.log(err);
        // send the user back to the homepage
        res.redirect('/');
    }
});

// start the server
app.listen(PORT, () =>
{
    // print a message with the server's address
    console.log(`Server running at http://localhost:${PORT}`);
});
