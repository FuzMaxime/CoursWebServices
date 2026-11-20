import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from '@koa/bodyparser';
import Joi from 'joi';
import posts from './posts.seed.json' with { type: 'json' };

const app = new Koa();
const router = new Router();

async function errorHandler(ctx, next) {
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.throw(404, `Route ${ctx.method} ${ctx.path} introuvable`);
    }
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    ctx.status = status;
    ctx.body = {
      error: err.expose ? err.message : 'Erreur interne du serveur',
      status,
    };
    if (status >= 500) ctx.app.emit('error', err, ctx);
  }
}

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

router.get('/posts', (ctx) => {
  if (ctx.query.postId !== undefined) {
    const postId = Number(ctx.query.postId);
    if (!Number.isInteger(postId) || postId < 1) {
      ctx.throw(400, 'postId doit être un entier ≥ 1');
    }
    const filteredPosts = posts.filter((post) => post.postId === postId);
    ctx.body = filteredPosts;
    ctx.status = filteredPosts.length > 0 ? 200 : 404;
    return;
  }
  ctx.body = posts;
});

router.get('/posts/:id', (ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id < 1) {
    ctx.throw(400, 'id doit être un entier ≥ 1');
  }
  const post = posts.find((p) => p.id === id);
  if (!post) {
    ctx.throw(404, `Post avec id ${id} non trouvé`);
  }
  ctx.body = post;
});


const postSchema = Joi.object({
  postId: Joi.number().integer().min(1).strict().required(),
  name: Joi.string().trim().min(1).max(100).required(),  
  email: Joi.string().trim().email().max(100).required(),
  body: Joi.string().trim().min(1).max(500).required(),
}).required();

const patchSchema = postSchema
  .fork(['postId', 'name', 'email', 'body'], (field) => field.optional())
  .min(1);

function validateBody(ctx, schema) {
  const { error, value } = schema.validate(ctx.request.body);
  if (error) ctx.throw(400, `Données invalides : ${error.message}`);
  return value;
}

router.post('/posts', (ctx) => {
  const { postId, name, email, body } = validateBody(ctx, postSchema);
  const id = posts.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const newPost = { id, postId, name, email, body };
  posts.push(newPost);
  ctx.status = 201;
  ctx.set('Location', `/posts/${id}`);
  ctx.body = newPost;
});

router.delete('/posts/:id', (ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id < 1) {
    ctx.throw(400, 'id doit être un entier ≥ 1');
  }
  const postIndex = posts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    ctx.throw(404, `Post avec id ${id} non trouvé`);
  }
  posts.splice(postIndex, 1);
  ctx.status = 204;
});

router.put('/posts/:id', (ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id < 1) {
    ctx.throw(400, 'id doit être un entier ≥ 1');
  }
  const postIndex = posts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    ctx.throw(404, `Post avec id ${id} non trouvé`);
  }
  const { postId, name, email, body } = validateBody(ctx, postSchema);
  posts[postIndex] = { id, postId, name, email, body };
  ctx.body = posts[postIndex];
});

router.patch('/posts/:id', (ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id < 1) {
    ctx.throw(400, 'id doit être un entier ≥ 1');
  }
  const post = posts.find((p) => p.id === id);
  if (!post) {
    ctx.throw(404, `Post avec id ${id} non trouvé`);
  }
  const updates = validateBody(ctx, patchSchema);
  Object.assign(post, updates);
  ctx.body = post;
});

app.use(errorHandler);
app.use(bodyParser({
  onError: (_err, ctx) => {
    ctx.throw(400, 'Corps JSON invalide');
  },
}));
app.use(router.routes());
app.use(router.allowedMethods({ throw: true }));

app.on('error', (err) => {
  console.error('Erreur serveur :', err);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
