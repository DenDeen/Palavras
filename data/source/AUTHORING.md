# Authoring the content

All content is **European Portuguese (PT-PT)**, aimed at A1–A2 learners: short, natural, everyday sentences.
Prefer vocabulary from the 1000-word list (`data/source/raw.txt` holds the extracted PDF text).

PT-PT, not Brazilian:
- *estar a + infinitivo* (estou a comer), never the gerund (estou comendo).
- Perfeito nós of -ar verbs takes an accent: *falámos*.
- Use EP spellings and vocabulary: *facto, receção, autocarro, comboio, pequeno-almoço, telemóvel, casa de banho, rapariga, sumo, frigorífico*.
- Clitics go after the verb in affirmative main clauses: *ajudou-me, chama-se*. They go before it after *não, já, também, que, quando* etc.: *não me ajudou*.
- *Tu* is the default informal "you". *Você* takes the 3rd-person singular form.

After writing a file, validate it:

    python3 tools/build_data.py --check data/source/<your-file>.json

Fix every ERROR. Review any WARN and either fix the form or set `"regular": false`.

## Verbs: `data/source/verbs-NN.json`

The file is a JSON **array** of verb objects, in PDF order. `data/source/_example-tentar.json` is the reference: match its depth, tone and structure.

| key | notes |
|---|---|
| `n` | PDF number (1–180) |
| `inf` | infinitive as in the PDF; for "dever / ter de" use `"dever"` and cover *ter de* in notes; for "tornar-se" use `"tornar-se"` |
| `en` | English gloss from the PDF |
| `regular` | `true` only if every form follows the standard -ar/-er/-ir endings. Spelling-only changes (fiquei, cheguei, comecei, conheço, exijo) still count as regular. Stem changes (sinto, prefiro, consigo, durmo) and real irregulars are `false`. |
| `group` | `"ar"`, `"er"`, `"ir"` (pôr → `"er"`) |
| `impersonal` | optional, `true` for *haver*. Fill `ele` only (há, houve, havia, haverá, haveria); the other persons may be `""`. |
| `intro` | 1–3 sentences in English: meaning, regular/irregular, when you use it. |
| `quick` | 3–4 very short, useful phrases `{pt, en}`. |
| `conj` | all 5 tenses × persons `eu, tu, ele, nos, voces, eles`. For reflexives write the clitic: `"torno-me", "tornas-te", "torna-se", "tornamo-nos", "tornam-se", "tornam-se"`. In futuro/condicional use the written mesoclitic form (`"tornar-me-ei"`, `"tornar-nos-íamos"`); examples may bracket the pronoun-first form after não/que (`não [me tornarei]`). |
| `examples` | per tense. **presente: 5**, other tenses: **4**. Each item is `{p, pt, en}`. `p` is the person, and `pt` contains **exactly one** `[form]` in square brackets equal to `conj[tense][p]` (case-insensitive; for reflexives the bracket may hold just the verb part, e.g. `[Chamo]-me`). Vary the persons. Futuro examples use the synthetic future (tentarei); no mesoclisis (avoid *chamar-se-á*). |
| `practice` | per tense, **3** `{en, pt}` translation exercises. These are free sentences and may use other structures (estar a, ir + inf, other verbs from the list). |
| `notes` | optional per tense: short English tips. Use them for EP vs BR differences, ser/estar-type contrasts, perfeito vs imperfeito, and ir + infinitivo under futuro. Include a `presente` note whenever there is something useful to say. |
| `patterns` | 3–6 common collocations `{pt, en}` (verb + infinitive / preposition / noun). |
| `compare` | 0–3 easily confused verbs `{verb, en, ex}` (saber/conhecer, pedir/perguntar, ser/estar, levar/trazer, ouvir/escutar…). |
| `recap` | one memorable sentence using the verb, with its English in parentheses. |

The duplicate entry (#21 *falar*, which repeats #15) is written as `{"n": 21, "inf": "falar", "en": "to speak / to talk", "dup": 15}` only.

## Words: `data/source/words-N.json`

```json
{ "sections": [
  { "id": "preposicoes", "title": "Preposições", "titleEn": "Prepositions",
    "note": "Short English explanation from the PDF intro (plain text, may contain \n).",
    "tables": [
      { "title": "Contractions with the definite article", "head": ["", "o", "a", "os", "as"],
        "rows": [["a", "ao", "à", "aos", "às"], ["de", "do", "da", "dos", "das"]],
        "cards": [{"front": "a + o", "back": "ao"}, {"front": "de + as", "back": "das"}] }
    ],
    "groups": [
      { "title": "Preposições", "titleEn": "Prepositions",
        "items": [ {"n": 1, "pt": "a", "en": "to / at",
                    "ex": {"pt": "Vou a Lisboa amanhã.", "en": "I'm going to Lisbon tomorrow."}} ] }
    ] }
] }
```

- Section ids, in order: `basicas, artigos, preposicoes, substantivos, pronomes, numeros, adjetivos, cores, adverbios, conjuncoes`.
- Keep every item from the PDF in PDF order, with its PDF number `n`. Groups follow the PDF's sub-headings. Fill in any English gloss the extraction lost.
- Every item gets one short example sentence `ex`, **mostly in the present tense**, that uses the word naturally.
- Optional per item: `"note"` (e.g. irregular plural or feminine, as given in brackets in the PDF).
- Tables reproduce the PDF tables (articles, contractions, pronouns, possessives, demonstratives…). `cards` turns each useful cell into a flashcard (front = the prompt, back = the answer).
