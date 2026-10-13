const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'BlogDB',
    password: 'meowmeowmeowfiller',
    port: 5432,
});

// App configuration & middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));

app.use(session({
    secret: 'blog-app-session-secret',
    resave: false,
    saveUninitialized: false
}));

// Make the logged-in user available to all views automatically
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

// Simple auth check middleware
const requireLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/signin');
    next();
};


// --- Auth Routes ---

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { user_id, password, name } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
        
        if (userCheck.rows.length > 0) {
            return res.render('signup', { error: 'That user ID is already taken. Pick a different one!' });
        }

        await pool.query(
            'INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)',
            [user_id, password, name]
        );
        
        res.redirect('/signin');
    } catch (err) {
        console.error('Signup error:', err);
        res.render('signup', { error: 'Something went wrong. Please try again.' });
    }
});

app.get('/signin', (req, res) => {
    res.render('signin');
});

app.post('/signin', async (req, res) => {
    const { user_id, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE user_id = $1 AND password = $2',
            [user_id, password]
        );

        if (result.rows.length === 0) {
            return res.render('signin', { error: 'Incorrect user ID or password.' });
        }

        req.session.user = result.rows[0];
        res.redirect('/');
    } catch (err) {
        console.error('Signin error:', err);
        res.render('signin', { error: 'Something went wrong. Please try again.' });
    }
});

app.post('/signout', (req, res) => {
    req.session.destroy(() => res.redirect('/signin'));
});


// --- Blog Post Routes ---

app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM blogs ORDER BY date_created DESC');
        res.render('index', { posts: result.rows });
    } catch (err) {
        console.error('Feed error:', err);
        res.render('index', { posts: [], error: 'Could not load posts right now.' });
    }
});

app.post('/blog', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    try {
        await pool.query(
            'INSERT INTO blogs (creator_name, creator_user_id, title, body) VALUES ($1, $2, $3, $4)',
            [req.session.user.name, req.session.user.user_id, title, content]
        );
        res.redirect('/');
    } catch (err) {
        console.error('Create post error:', err);
        res.redirect('/');
    }
});

app.get('/blog/:id/edit', requireLogin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2',
            [req.params.id, req.session.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(403).send("Hey, you can only edit your own posts!");
        }

        res.render('edit', { post: result.rows[0] });
    } catch (err) {
        console.error('Edit page error:', err);
        res.redirect('/');
    }
});

app.put('/blog/:id', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    try {
        const result = await pool.query(
            'UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3 AND creator_user_id = $4',
            [title, content, req.params.id, req.session.user.user_id]
        );

        if (result.rowCount === 0) {
            return res.status(403).send("You can't edit someone else's post!");
        }

        res.redirect('/');
    } catch (err) {
        console.error('Update post error:', err);
        res.redirect('/');
    }
});

app.delete('/blog/:id', requireLogin, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2',
            [req.params.id, req.session.user.user_id]
        );

        if (result.rowCount === 0) {
            return res.status(403).send("You can't delete someone else's post!");
        }

        res.redirect('/');
    } catch (err) {
        console.error('Delete post error:', err);
        res.redirect('/');
    }
});


// Fire it up
app.listen(PORT, () => {
    console.log(`Server's up at http://localhost:${PORT}`);
});