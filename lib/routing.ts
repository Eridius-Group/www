import Navigo from 'navigo';
import './sanitizer.ts';
import { loadModule, loadBlog, loadLegal, loadQuiz, loadApp, loadNotFound, setRouter } from '@lib/loader.ts';

const router = new Navigo("/");
setRouter(router);

router.on("/", () => {
  loadModule({
    moduleName: "home",
    title:      "Home",
    params: {
      Shell:       "Website",
      Title:       "Welcome to Eridius Group.",
      Description: "We aim to educate the masses on privacy and security standards, the methods bad actors may use to gain information about you to sell, and offer you services to help you stay safe.",
      Tip:         "It's dangerous to go alone. Take us with you.",
    },
  });
});

router.on("/blog", async () => {
  await loadModule({
    moduleName: "blog",
    title:      "Blog",
    params: {
      Shell:       "Website",
      Title:       "Blog",
      Description: "Latest updates and articles.",
      Tip:         "Stay informed.",
    },
  });
});

router.on("/blog/:slug", async (match) => {
  await loadBlog(match.data.slug);
});

router.on("/quiz", async () => {
  await loadModule({
    moduleName: "quiz",
    title:      "Quizzes",
    params: {
      Shell:       "Website",
      Title:       "Quizzes",
      Description: "Test your knowledge.",
      Tip:         "Learning is fun!",
    },
  });
});

router.on("/quiz/:slug", async (match) => {
  await loadQuiz(match.data.slug);
});

router.on("/legal", async () => {
  await loadModule({
    moduleName: "legal",
    title:      "Legal",
    params: {
      Shell:       "Website",
      Title:       "Legal Documents",
      Description: "Terms, policies, and disclosures.",
      Tip:         "Please read carefully.",
    },
  });
});

router.on("/legal/:category/:slug", async (match) => {
  await loadLegal(match.data.slug, match.data.category);
});

router.on("/legal/:slug", async (match) => {
  await loadLegal(match.data.slug);
});

router.on("/app/:module/:parameter", async (match) => {
  await loadApp(`${match.data.module}/${match.data.parameter}`);
});

router.on("/app/:module", async (match) => {
  await loadApp(match.data.module);
});

router.on("/app", async () => {
  await loadApp("login");
});

router.on("/assets/:type/:file", () => {
  loadNotFound();
});

router.on("/assets/:type/:category/:file", () => {
  loadNotFound();
});

router.notFound(() => {
  loadNotFound();
});

router.resolve();
