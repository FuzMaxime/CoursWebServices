import Koa from 'koa';
import Router from '@koa/router';
import Joi from 'joi';

const app = new Koa();
const router = new Router();

const exampleSchema = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  isActive: Joi.boolean().required(),
});

const examples = [
  { id: 1, name: 'Premier exemple', isActive: true },
  { id: 2, name: 'Deuxième exemple', isActive: false },
  { id: 3, name: 'Troisième exemple', isActive: true },
];

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

router.get('/examples/count', (ctx) => {
  const count = examples.length;
  ctx.body = { count: count };
});

router.get('/examples', (ctx) => {
  const isActive = ctx.query.isActive;
  if (isActive !== undefined) {
    const filteredExamples = examples.filter((ex) => ex.isActive === (isActive === 'true'));
    ctx.body = filteredExamples;
  } else {
    ctx.body = examples;
  }
});

router.get('/examples/:id', (ctx) => {
  const id = Number.parseInt(ctx.params.id);
  const example = examples.find((ex) => ex.id === id);
  if (example) {
    ctx.body = example;
  } else {
    ctx.status = 404;
    ctx.body = { 
      error: 'Exemple non trouvé',
      status: 404
     };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
