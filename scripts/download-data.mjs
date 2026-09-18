import fs from 'fs';
import path from 'path';

const endpoints = {
  stopwords: "https://cdn.jsdelivr.net/npm/stopwords-json@1.0.0/dist/en.json",
  affixes: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/words/prefix_root_suffix.json",
  prepositions: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/words/prepositions.json",
  occupations: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/humans/occupations.json",
  verbs: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/words/verbs.json",
  nouns: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/words/nouns.json",
  techTerms: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/technology/programming_languages.json",
  objects: "https://cdn.jsdelivr.net/gh/dariusk/corpora@master/data/objects/objects.json",
};

const dir = path.join(process.cwd(), 'assets', 'data');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function download() {
  for (const [key, url] of Object.entries(endpoints)) {
    console.log(`Downloading and processing ${key}...`);
    const res = await fetch(url);
    const data = await res.json();
    
    let processedData;

    switch (key) {
      case 'stopwords':
        processedData = data.map(w => w.toLowerCase());
        break;
      case 'affixes':
        processedData = data.suffixes
          .map(s => s.part.replace(/^-/, ""))
          .sort((a, b) => b.length - a.length);
        break;
      case 'prepositions':
        processedData = data.prepositions.sort((a, b) => b.length - a.length);
        break;
      case 'occupations':
        processedData = data.occupations.map(o => o.toLowerCase());
        break;
      case 'verbs':
        processedData = data.verbs
          .map(v => v.past)
          .filter(Boolean)
          .sort((a, b) => b.length - a.length);
        break;
      case 'nouns':
        processedData = (data.nouns || []).map(n => n.toLowerCase());
        break;
      case 'techTerms':
        processedData = (data.programming_languages || []).map(t => t.toLowerCase());
        break;
      case 'objects':
        processedData = (data.objects || []).map(o => o.toLowerCase());
        break;
      default:
        processedData = data;
    }

    fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(processedData));
  }
  console.log('Done processing and saving optimized JSON files!');
}

download();
