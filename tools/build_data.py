"""Merge data/source/*.json into data/data.js and validate the content.

Usage:
  python3 tools/build_data.py                 # validate everything, write data/data.js
  python3 tools/build_data.py --check FILE..  # validate only the given source files

Errors (exit 1) are structural problems. Warnings are things worth a human
look, e.g. a verb marked regular whose forms differ from the rule engine.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'source')
OUT = os.path.join(ROOT, 'data', 'data.js')

TENSES = ['presente', 'perfeito', 'imperfeito', 'futuro', 'condicional']
PERSONS = ['eu', 'tu', 'ele', 'nos', 'voces', 'eles']
SECTION_ORDER = ['basicas', 'artigos', 'preposicoes', 'substantivos', 'pronomes',
                 'numeros', 'adjetivos', 'cores', 'adverbios', 'conjuncoes']

ENDINGS = {
    'ar': {
        'presente': ['o', 'as', 'a', 'amos', 'am', 'am'],
        'perfeito': ['ei', 'aste', 'ou', 'ámos', 'aram', 'aram'],
        'imperfeito': ['ava', 'avas', 'ava', 'ávamos', 'avam', 'avam'],
    },
    'er': {
        'presente': ['o', 'es', 'e', 'emos', 'em', 'em'],
        'perfeito': ['i', 'este', 'eu', 'emos', 'eram', 'eram'],
        'imperfeito': ['ia', 'ias', 'ia', 'íamos', 'iam', 'iam'],
    },
    'ir': {
        'presente': ['o', 'es', 'e', 'imos', 'em', 'em'],
        'perfeito': ['i', 'iste', 'iu', 'imos', 'iram', 'iram'],
        'imperfeito': ['ia', 'ias', 'ia', 'íamos', 'iam', 'iam'],
    },
}
FUTURO = ['ei', 'ás', 'á', 'emos', 'ão', 'ão']
CONDICIONAL = ['ia', 'ias', 'ia', 'íamos', 'iam', 'iam']

errors = []
warnings = []


def err(where, msg):
    errors.append(f'{where}: {msg}')


def warn(where, msg):
    warnings.append(f'{where}: {msg}')


def spell(stem, ending, group):
    """Apply EP orthographic changes that keep the stem's sound.

    -ar stems change before e (ficar -> fiquei); -er/-ir stems before a/o
    (conhecer -> conheço).
    """
    if group == 'ar' and ending[0] == 'e':
        if stem.endswith('c'):
            stem = stem[:-1] + 'qu'
        elif stem.endswith('ç'):
            stem = stem[:-1] + 'c'
        elif stem.endswith('g'):
            stem = stem[:-1] + 'gu'
    elif group != 'ar' and ending[0] in 'oa':
        if stem.endswith('c') and not stem.endswith('qu'):
            stem = stem[:-1] + 'ç'
        elif stem.endswith('g') and not stem.endswith('gu'):
            stem = stem[:-1] + 'j'
        elif stem.endswith('gu'):
            stem = stem[:-2] + 'g'
    return stem + ending


def regular_forms(inf):
    group = inf[-2:]
    stem = inf[:-2]
    forms = {}
    for tense, endings in ENDINGS[group].items():
        forms[tense] = dict(zip(PERSONS, [
            spell(stem, e, group) for e in endings
        ]))
    forms['futuro'] = dict(zip(PERSONS, [inf + e for e in FUTURO]))
    forms['condicional'] = dict(zip(PERSONS, [inf + e for e in CONDICIONAL]))
    return forms


def accepted_forms(form):
    """Forms an example bracket may use for a conjugation-table form.

    Reflexives are stored as "torno-me" (bracket may hold just "torno") and, in
    the futuro/condicional, as the written mesoclitic "tornar-me-ei" (bracket may
    hold the pronoun-first form used after não/que: "me tornarei").
    """
    form = form.lower()
    accepted = {form, form.split('-')[0]}
    m = re.match(r'^(.+?)-(me|te|se|nos|vos)-(.+)$', form)
    if m:
        accepted.add(f'{m.group(2)} {m.group(1)}{m.group(3)}')
    return accepted


def check_pairs(where, items, keys=('pt', 'en')):
    if not isinstance(items, list):
        err(where, 'expected a list')
        return
    for i, it in enumerate(items):
        for k in keys:
            if not isinstance(it, dict) or not str(it.get(k, '')).strip():
                err(f'{where}[{i}]', f'missing "{k}"')


def check_verb(v, where):
    where = f'{where} #{v.get("n")} {v.get("inf")}'
    for k in ('n', 'inf', 'en'):
        if k not in v:
            err(where, f'missing "{k}"')
    if 'dup' in v:
        return
    for k in ('group', 'intro', 'quick', 'conj', 'examples', 'practice', 'recap'):
        if k not in v:
            err(where, f'missing "{k}"')
    if errors and errors[-1].startswith(where):
        return
    impersonal = v.get('impersonal', False)
    check_pairs(f'{where} quick', v['quick'])
    for t in TENSES:
        conj = v['conj'].get(t)
        if not isinstance(conj, dict):
            err(where, f'conj missing tense "{t}"')
            continue
        for p in PERSONS:
            if not conj.get(p) and not (impersonal and p != 'ele'):
                err(where, f'conj.{t}.{p} is empty')
        exs = v['examples'].get(t, [])
        if len(exs) < 3:
            err(where, f'examples.{t} has {len(exs)} sentences (need >= 3)')
        for i, ex in enumerate(exs):
            w = f'{where} examples.{t}[{i}]'
            check_pairs(w, [ex])
            marked = re.findall(r'\[([^\]]+)\]', ex.get('pt', ''))
            if len(marked) != 1:
                err(w, f'needs exactly one [form], found {len(marked)}: {ex.get("pt")}')
                continue
            p = ex.get('p')
            if p not in PERSONS:
                err(w, f'"p" must be one of {PERSONS}, got {p!r}')
                continue
            expected = (conj or {}).get(p) or ''
            if marked[0].lower() not in accepted_forms(expected):
                err(w, f'[{marked[0]}] does not match conj.{t}.{p} = {expected!r}')
        prac = v['practice'].get(t, [])
        if len(prac) < 3:
            err(where, f'practice.{t} has {len(prac)} sentences (need >= 3)')
        check_pairs(f'{where} practice.{t}', prac, ('en', 'pt'))
    if v.get('regular') and not v['inf'].endswith('-se') and v['inf'][-2:] in ENDINGS:
        expected = regular_forms(v['inf'])
        for t in TENSES:
            for p in PERSONS:
                got = v['conj'].get(t, {}).get(p)
                if got and got != expected[t][p]:
                    warn(where, f'marked regular but {t}.{p} = {got!r}, rules give {expected[t][p]!r}')


def check_words(data, where):
    for s in data.get('sections', []):
        sw = f'{where} section {s.get("id")}'
        if s.get('id') not in SECTION_ORDER:
            err(sw, f'unknown section id (expected one of {SECTION_ORDER})')
        for k in ('title', 'titleEn'):
            if not s.get(k):
                err(sw, f'missing "{k}"')
        for ti, t in enumerate(s.get('tables', [])):
            tw = f'{sw} tables[{ti}]'
            if not t.get('head') or not t.get('rows'):
                err(tw, 'needs "head" and "rows"')
            for row in t.get('rows', []):
                if len(row) != len(t.get('head', [])):
                    err(tw, f'row length {len(row)} != head length: {row}')
            check_pairs(f'{tw} cards', t.get('cards', []), ('front', 'back'))
        for gi, g in enumerate(s.get('groups', [])):
            gw = f'{sw} groups[{gi}] {g.get("title")}'
            if not g.get('title'):
                err(gw, 'missing "title"')
            for i, it in enumerate(g.get('items', [])):
                iw = f'{gw} items[{i}] {it.get("pt")}'
                check_pairs(iw, [it])
                ex = it.get('ex')
                if not ex:
                    err(iw, 'missing "ex"')
                else:
                    check_pairs(f'{iw} ex', [ex])


def load(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        err(os.path.relpath(path, ROOT), f'cannot load JSON: {e}')
        return None


def check_file(path):
    name = os.path.basename(path)
    data = load(path)
    if data is None:
        return None
    if name.startswith('verbs-'):
        if not isinstance(data, list):
            err(name, 'expected a JSON array of verbs')
            return None
        for v in data:
            check_verb(v, name)
    elif name.startswith('words-'):
        check_words(data, name)
    return data


def build():
    verbs, sections = [], {}
    for path in sorted(glob.glob(os.path.join(SRC, 'verbs-*.json'))):
        verbs.extend(check_file(path) or [])
    for path in sorted(glob.glob(os.path.join(SRC, 'words-*.json'))):
        data = check_file(path) or {}
        for s in data.get('sections', []):
            # A section may be split across files (e.g. substantivos); merge in file order.
            if s['id'] in sections:
                merged = sections[s['id']]
                merged['groups'] = merged.get('groups', []) + s.get('groups', [])
                merged['tables'] = merged.get('tables', []) + s.get('tables', [])
            else:
                sections[s['id']] = s
    verbs.sort(key=lambda v: v.get('n', 0))
    nums = [v.get('n') for v in verbs]
    missing = sorted(set(range(1, 181)) - set(nums))
    if missing:
        warn('verbs', f'missing verb numbers: {missing}')
    dups = sorted({n for n in nums if nums.count(n) > 1})
    if dups:
        err('verbs', f'duplicate verb numbers: {dups}')
    missing_sections = [s for s in SECTION_ORDER if s not in sections]
    if missing_sections:
        warn('words', f'missing sections: {missing_sections}')
    ordered = [sections[s] for s in SECTION_ORDER if s in sections]
    return {'sections': ordered, 'verbs': verbs}


def report():
    for w in warnings:
        print('WARN ', w)
    for e in errors:
        print('ERROR', e)
    print(f'{len(errors)} errors, {len(warnings)} warnings')


def main(argv):
    if argv[:1] == ['--check']:
        for path in argv[1:]:
            check_file(path)
        report()
        return 1 if errors else 0
    data = build()
    report()
    if errors:
        return 1
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build_data.py, do not edit by hand.\n')
        f.write('window.APP_DATA = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    n_words = sum(len(g['items']) for s in data['sections'] for g in s.get('groups', []))
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(data["sections"])} sections, '
          f'{n_words} words, {len(data["verbs"])} verbs')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
